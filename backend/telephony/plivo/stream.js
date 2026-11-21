const { getCallSession, createCallSession, updateCallSession } = require('../../state/calls');
const { finalizeCall } = require('../../services/callRecords');
const { Conversation } = require('../../pipeline/conversation');
const { plivoClient, url } = require('./config');
const { verifyStreamUpgrade } = require('./signature');

const LEAD_MS = 400; // how far ahead of real time we let Plivo's playback buffer run
const TICK_MS = 40;
const SLICE_BYTES = 1600; // 200 ms of mu-law per playAudio message

/**
 * Sends agent audio at real-time pace. Bursting a whole reply fills Plivo's buffer
 * and makes clearAudio (barge-in) late, so audio and checkpoints go through a queue.
 */
class PacedSender {
  constructor(ws) {
    this.ws = ws;
    this.streamId = null;
    this.queue = [];
    this.playheadAt = 0;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  send(obj) {
    if (this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  }

  play(buf) {
    for (let i = 0; i < buf.length; i += SLICE_BYTES) this.queue.push({ audio: buf.subarray(i, i + SLICE_BYTES) });
  }

  mark(name) {
    this.queue.push({ mark: name });
  }

  clear() {
    this.queue = [];
    this.playheadAt = Date.now();
    this.send({ event: 'clearAudio', streamId: this.streamId });
  }

  tick() {
    const now = Date.now();
    if (this.playheadAt < now) this.playheadAt = now;
    while (this.queue.length && this.playheadAt - now < LEAD_MS) {
      const item = this.queue.shift();
      if (item.mark) {
        this.send({ event: 'checkpoint', streamId: this.streamId, name: item.mark });
        continue;
      }
      this.send({
        event: 'playAudio',
        media: { contentType: 'audio/x-mulaw', sampleRate: 8000, payload: item.audio.toString('base64') },
      });
      this.playheadAt += item.audio.length / 8; // 8 bytes per ms at 8 kHz mu-law
    }
  }

  stop() {
    clearInterval(this.timer);
    this.queue = [];
  }
}

function handlePlivoStream(ws, req) {
  if (!verifyStreamUpgrade(req)) {
    console.warn(`[PlivoStream] Rejected unsigned stream connection ${req.url}`);
    ws.close(1008, 'Invalid signature');
    return;
  }

  const parsed = new URL(req.url, 'http://local');
  const callUuid = decodeURIComponent(parsed.pathname.split('/').pop() || '');
  const resume = parsed.searchParams.get('resume') === '1';
  const sender = new PacedSender(ws);
  let conversation = null;
  let transferring = false;

  const transport = {
    play: (buf) => sender.play(buf),
    clear: () => sender.clear(),
    mark: (name) => sender.mark(name),
    transfer: async (reason) => {
      if (transferring) return;
      transferring = true;
      // Transfer first, then close the socket: the transfer XML runs when the stream ends.
      await plivoClient().calls.transfer(callUuid, {
        legs: 'aleg',
        alegUrl: url(`/plivo/forward/${encodeURIComponent(callUuid)}?reason=${encodeURIComponent(reason)}`),
        alegMethod: 'POST',
      });
      setTimeout(() => ws.close(1000, 'transferred'), 200);
    },
  };

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString('utf8'));
    } catch {
      return;
    }

    switch (msg.event) {
      case 'start': {
        sender.streamId = msg.start?.streamId || msg.streamId;
        const id = callUuid || msg.start?.callId;
        const fmt = msg.start?.mediaFormat || {};
        console.log(`[PlivoStream] start call=${id} stream=${sender.streamId} ${fmt.encoding || '?'}@${fmt.sampleRate || '?'}`);
        if (fmt.encoding && fmt.encoding !== 'audio/x-mulaw') {
          console.error(`[PlivoStream] Expected audio/x-mulaw, got ${fmt.encoding}; check the <Stream> contentType`);
        }
        if (!getCallSession(id)) {
          createCallSession(id, 'unknown', 'VED');
          updateCallSession(id, { provider: 'plivo' });
        }
        updateCallSession(id, { aiActive: true, streamId: sender.streamId });
        conversation = new Conversation({ callSid: id, transport });
        conversation.start({ resume }).catch((err) => console.error('[PlivoStream] Start failed:', err));
        break;
      }
      case 'media':
        if (conversation && msg.media?.payload) conversation.onAudio(Buffer.from(msg.media.payload, 'base64'));
        break;
      case 'playedStream':
        conversation?.onPlayed(msg.name);
        break;
      case 'dtmf':
        conversation?.onDtmf(msg.dtmf?.digit);
        break;
      case 'clearedAudio':
        break;
      case 'stop':
        ws.close();
        break;
      default:
        break;
    }
  });

  ws.on('close', () => {
    sender.stop();
    conversation?.end();
    const id = conversation?.callSid || callUuid;
    if (!id || !getCallSession(id)) return;
    updateCallSession(id, { aiActive: false });
    console.log(`[PlivoStream] closed call=${id}${transferring ? ' (transferred)' : ''}`);

    // The hangup webhook normally saves the call. This covers a missing hangup URL:
    // if nothing has finalized the call a minute later and it was not forwarded, save it.
    setTimeout(() => {
      const s = getCallSession(id);
      if (s && !s.finalized && s.outcome !== 'forwarded') finalizeCall(id);
    }, 60000).unref();
  });

  ws.on('error', (err) => console.error('[PlivoStream] socket error:', err.message));
}

module.exports = { handlePlivoStream, PacedSender };
