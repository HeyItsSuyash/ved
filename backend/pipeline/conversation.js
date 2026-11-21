const { getCallSession, updateCallSession, addTurn } = require('../state/calls');
const { getGroqSTT } = require('../services/speech');
const { getLLMResponse } = require('../services/llm');
const { getKnowledge, getCallMemory } = require('../services/mongodb');
const { getSettings } = require('../services/settings');
const { mulawToWav, mulawRms } = require('./audio');
const { speak } = require('./tts');

// Turn-taking tuned for 20 ms mu-law frames from the phone network.
const SPEECH_RMS = Number(process.env.VAD_SPEECH_RMS) || 600; // frame level that counts as speech
const START_FRAMES = 3; // 60 ms of speech starts an utterance
const END_SILENCE_MS = Number(process.env.VAD_END_SILENCE_MS) || 700; // pause that ends it
const MIN_SPEECH_FRAMES = 12; // ignore anything shorter than ~240 ms (coughs, clicks)
const MAX_UTTERANCE_MS = 15000;
const BARGE_IN_FRAMES = 12; // ~240 ms of caller speech interrupts the agent
const PRE_ROLL_FRAMES = 10;

const RESUME_LINE = 'Maaf kijiye, abhi koi counsellor free nahi hai. Main aapki madad karti rehti hoon, boliye.';

/**
 * One phone conversation between a caller and the agent. Provider-agnostic: the
 * telephony adapter feeds caller audio in and supplies a transport to play audio out.
 *
 * transport = {
 *   play(mulawBuffer)   queue audio to the caller
 *   clear()             drop queued audio (barge-in)
 *   mark(name)          ask to be told (via onPlayed) when audio so far has played
 *   transfer(reason)    hand the call to staff
 * }
 */
class Conversation {
  constructor({ callSid, transport, log = console }) {
    this.callSid = callSid;
    this.t = transport;
    this.log = log;

    this.preRoll = [];
    this.frames = [];
    this.loudRun = 0;
    this.speechFrames = 0;
    this.inUtterance = false;
    this.lastSpeechAt = 0;
    this.utteranceStartedAt = 0;

    this.turnId = 0; // increases on every caller utterance; stale replies are dropped
    this.speaking = false;
    this.pendingMark = null;
    this.markTimer = null;
    this.ttsAbort = null;
    this.transferAfterSpeech = false;
    this.ended = false;
  }

  /**
   * Greet the caller straight away (callers hang up on silence) while knowledge and
   * past-call memory load in parallel. `resume` is a caller coming back after nobody
   * on the forwarding list answered.
   */
  async start({ resume = false } = {}) {
    const session = getCallSession(this.callSid);
    const loading = Promise.all([
      getKnowledge(),
      session?.phoneNumber && session.phoneNumber !== 'unknown' ? getCallMemory(session.phoneNumber) : [],
    ])
      .then(([knowledge, memory]) => {
        updateCallSession(this.callSid, { knowledge, memory });
        this.log.info?.(`[Conv ${this.callSid}] ${knowledge.length} documents, ${memory.length} past calls`);
      })
      .catch((err) => this.log.error(`[Conv ${this.callSid}] Could not load knowledge:`, err.message));

    const opening = resume ? RESUME_LINE : getSettings().greeting;
    addTurn(this.callSid, { timestamp: new Date().toISOString(), speaker: 'ai', text: opening, language: 'hinglish' });
    await Promise.all([this.say(opening, 'hinglish'), loading]);
  }

  /** Feed one frame of caller audio (raw mu-law bytes). */
  onAudio(frame) {
    if (this.ended) return;
    const now = Date.now();
    const loud = mulawRms(frame) >= SPEECH_RMS;
    this.loudRun = loud ? this.loudRun + 1 : 0;

    if (!this.inUtterance) {
      this.preRoll.push(frame);
      if (this.preRoll.length > PRE_ROLL_FRAMES) this.preRoll.shift();

      const needed = this.speaking ? BARGE_IN_FRAMES : START_FRAMES;
      if (this.loudRun >= needed) {
        if (this.speaking) this.bargeIn();
        this.inUtterance = true;
        this.utteranceStartedAt = now;
        this.lastSpeechAt = now;
        this.frames = [...this.preRoll];
        this.speechFrames = this.loudRun;
        this.preRoll = [];
      }
      return;
    }

    this.frames.push(frame);
    if (loud) {
      this.speechFrames++;
      this.lastSpeechAt = now;
    }
    if (now - this.lastSpeechAt >= END_SILENCE_MS || now - this.utteranceStartedAt >= MAX_UTTERANCE_MS) {
      this.finishUtterance();
    }
  }

  onPlayed(name) {
    if (name !== this.pendingMark) return;
    this.donePlaying();
  }

  onDtmf(digit) {
    if (digit === '0') {
      this.log.info?.(`[Conv ${this.callSid}] Caller pressed 0, handing over`);
      this.handOver('caller_pressed_0');
    }
  }

  end() {
    this.ended = true;
    this.ttsAbort?.abort();
    clearTimeout(this.markTimer);
  }

  // ---------------------------------------------------------------------------

  bargeIn() {
    this.log.info?.(`[Conv ${this.callSid}] Caller interrupted`);
    this.ttsAbort?.abort();
    this.t.clear();
    this.transferAfterSpeech = false;
    this.donePlaying();
  }

  finishUtterance() {
    const frames = this.frames;
    const speechFrames = this.speechFrames;
    this.inUtterance = false;
    this.frames = [];
    this.speechFrames = 0;
    this.loudRun = 0;
    if (speechFrames < MIN_SPEECH_FRAMES) return;
    const turnId = ++this.turnId;
    this.respond(Buffer.concat(frames), turnId).catch((err) =>
      this.log.error(`[Conv ${this.callSid}] Turn failed:`, err)
    );
  }

  async respond(mulaw, turnId) {
    const t0 = Date.now();
    const stt = await getGroqSTT(mulawToWav(mulaw));
    const text = stt?.transcript?.trim();
    if (!text || turnId !== this.turnId || this.ended) return;
    const t1 = Date.now();

    const session = getCallSession(this.callSid);
    const history = session.turns.slice();
    addTurn(this.callSid, { timestamp: new Date().toISOString(), speaker: 'user', text, language: stt.language_code });

    const reply = await getLLMResponse(history, text, session.memory || [], session.knowledge || []);
    if (turnId !== this.turnId || this.ended) return;
    const t2 = Date.now();

    addTurn(this.callSid, {
      timestamp: new Date().toISOString(),
      speaker: 'ai',
      text: reply.spoken,
      intent: reply.intent,
      sentiment: reply.sentiment,
      language: reply.language,
    });

    this.transferAfterSpeech = reply.transfer_to_human === true;
    const firstAudioAt = await this.say(reply.spoken, reply.language);
    this.log.info?.(
      `[Conv ${this.callSid}] latency stt=${t1 - t0}ms llm=${t2 - t1}ms tts_first_audio=${firstAudioAt ? firstAudioAt - t2 : '-'}ms`
    );
  }

  /** Speak text to the caller. Resolves with the time the first audio frame was sent. */
  async say(text, language) {
    this.ttsAbort?.abort();
    const abort = new AbortController();
    this.ttsAbort = abort;
    this.speaking = true;
    let firstAudioAt = null;
    let bytes = 0;

    try {
      bytes = await speak(text, {
        language,
        signal: abort.signal,
        onAudio: (frame) => {
          if (abort.signal.aborted || this.ended) return;
          if (!firstAudioAt) firstAudioAt = Date.now();
          this.t.play(frame);
        },
      });
    } catch (err) {
      this.log.error(`[Conv ${this.callSid}] TTS failed:`, err.message);
    }
    if (abort.signal.aborted || this.ended) return firstAudioAt;

    // Wait for the provider to confirm playback, with a fallback timer in case it never does.
    const name = `turn-${this.turnId}-${Date.now()}`;
    this.pendingMark = name;
    this.t.mark(name);
    clearTimeout(this.markTimer);
    this.markTimer = setTimeout(() => this.onPlayed(name), (bytes / 8000) * 1000 + 2000);
    return firstAudioAt;
  }

  donePlaying() {
    clearTimeout(this.markTimer);
    this.pendingMark = null;
    this.speaking = false;
    if (this.transferAfterSpeech) {
      this.transferAfterSpeech = false;
      this.handOver('agent_requested');
    }
  }

  handOver(reason) {
    if (this.ended) return;
    updateCallSession(this.callSid, { outcome: 'forwarded', forwardReason: reason });
    Promise.resolve(this.t.transfer(reason)).catch((err) =>
      this.log.error(`[Conv ${this.callSid}] Transfer failed:`, err.message)
    );
  }
}

module.exports = { Conversation };
