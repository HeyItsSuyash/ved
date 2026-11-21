const { getGoogleTTS } = require('../services/speech');
const { toMulaw8k } = require('./audio');
const { toSpeech } = require('./speechText');

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MAX_FRAME = 8000; // bytes of mu-law per playAudio message (1 s); well under Plivo's 64 KB limit once base64-encoded

// Voice, tone and speed are dashboard settings (Agent page). Ayush is the default.
const DEFAULT_VOICE_ID = 'PqovzlPXjFmB5NRVvFVe';

function currentVoice() {
  const { getSettings, TONES } = require('../services/settings');
  const s = getSettings();
  return { id: s.voiceId || DEFAULT_VOICE_ID, tone: TONES[s.voiceTone] ? s.voiceTone : 'friendly', speed: s.voiceSpeed || 1.0, TONES };
}

/** ElevenLabs voice_settings for a tone and speed. */
function voiceSettings(tone, speed) {
  const { TONES } = require('../services/settings');
  const t = TONES[tone] || TONES.friendly;
  return { stability: t.stability, similarity_boost: 0.75, style: t.style, use_speaker_boost: true, speed };
}

const voiceId = () => currentVoice().id;
const voiceKey = () => {
  const v = currentVoice();
  return `${v.id}|${v.tone}|${v.speed}`;
};

function ttsProvider() {
  return process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'google';
}

function emitInFrames(buffer, onAudio) {
  for (let i = 0; i < buffer.length; i += MAX_FRAME) onAudio(buffer.subarray(i, i + MAX_FRAME));
}

/**
 * ElevenLabs streaming TTS straight to mu-law 8 kHz, so audio reaches the caller
 * while the rest of the sentence is still being generated.
 */
// ElevenLabs language codes for Flash v2.5; Hinglish is spoken as Hindi.
function elevenLanguage(language) {
  const l = String(language || '').toLowerCase();
  if (l.startsWith('hi')) return 'hi';
  if (l.startsWith('en')) return 'en';
  return /[\u0900-\u097F]/.test(l) ? 'hi' : undefined;
}

async function streamElevenLabs(text, onAudio, signal, language) {
  const model = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
  const res = await fetch(`${ELEVENLABS_URL}/${encodeURIComponent(voiceId())}/stream?output_format=ulaw_8000`, {
    method: 'POST',
    signal,
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/basic',
    },
    body: JSON.stringify({
      text,
      model_id: model,
      language_code: elevenLanguage(language) || (/[\u0900-\u097F]/.test(text) ? 'hi' : undefined),
      voice_settings: voiceSettings(currentVoice().tone, currentVoice().speed),
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  let total = 0;
  for await (const chunk of res.body) {
    const buf = Buffer.from(chunk);
    total += buf.length;
    emitInFrames(buf, onAudio);
  }
  return total;
}

async function speakGoogle(text, language, onAudio) {
  const mp3 = await getGoogleTTS(text, language);
  if (!mp3) throw new Error('Google TTS returned no audio');
  const mulaw = await toMulaw8k(mp3);
  emitInFrames(mulaw, onAudio);
  return mulaw.length;
}

// Fixed lines (greeting, resume line) are synthesized once and replayed.
const cache = new Map();
const cacheKey = (text) => `${ttsProvider()}|${voiceKey()}|${process.env.ELEVENLABS_MODEL_ID || ''}|${text}`;

async function synthesizeToBuffer(text, language) {
  const chunks = [];
  await speak(text, { language, onAudio: (b) => chunks.push(Buffer.from(b)) });
  return Buffer.concat(chunks);
}

/** Play a fixed line from cache, synthesizing it on first use. */
async function speakCached(text, { language = 'en', onAudio, signal } = {}) {
  const key = cacheKey(text);
  let audio = cache.get(key);
  if (!audio) {
    audio = await synthesizeToBuffer(text, language);
    if (audio.length) cache.set(key, audio);
  }
  if (signal?.aborted) return 0;
  emitInFrames(audio, onAudio);
  return audio.length;
}

/** Pre-synthesize fixed lines at startup; this also warms the TTS connection. */
async function warmUp(lines) {
  const t0 = Date.now();
  for (const line of lines.filter(Boolean)) {
    try {
      const key = cacheKey(line);
      if (!cache.has(key)) {
        const audio = await synthesizeToBuffer(line, 'hi');
        if (audio.length) cache.set(key, audio);
      }
    } catch (err) {
      console.error('[TTS] Warm-up failed:', err.message);
    }
  }
  console.log(`[TTS] ${ttsProvider()} ready, ${cache.size} cached lines (${Date.now() - t0} ms)`);
}

/**
 * Synthesize `text` as mu-law 8 kHz and pass it to `onAudio` in frames.
 * Uses ElevenLabs when configured, otherwise the free Google voice.
 * Resolves with the number of bytes produced.
 */
async function speak(rawText, { language = 'en', onAudio, signal } = {}) {
  const text = toSpeech(rawText, language);
  if (!text) return 0;
  if (ttsProvider() === 'elevenlabs') {
    try {
      return await streamElevenLabs(text, onAudio, signal, language);
    } catch (err) {
      if (signal?.aborted) return 0;
      console.error('[TTS] ElevenLabs failed, falling back to Google:', err.message);
    }
  }
  if (signal?.aborted) return 0;
  return speakGoogle(text, language, onAudio);
}

// MP3 versions of fixed lines for Plivo <Play> (hold and busy messages), so every
// message a caller hears uses the agent's voice rather than Plivo's built-in voices.
const mp3Cache = new Map();

/**
 * MP3 of a line. Uses the dashboard voice unless `voice` ({ id, tone, speed }) is given,
 * which the dashboard's preview uses to try a voice before saving it.
 */
async function mp3For(rawText, voice = null, { cache = true } = {}) {
  if (ttsProvider() !== 'elevenlabs') return null;
  const v = voice || currentVoice();
  const text = toSpeech(rawText, 'hi');
  const key = `${v.id}|${v.tone}|${v.speed}|${text}`;
  if (cache && mp3Cache.has(key)) return mp3Cache.get(key);
  const res = await fetch(`${ELEVENLABS_URL}/${encodeURIComponent(v.id)}?output_format=mp3_22050_32`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5',
      language_code: /[\u0900-\u097F]/.test(text) ? 'hi' : undefined,
      voice_settings: voiceSettings(v.tone, v.speed),
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs MP3 failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (cache) mp3Cache.set(key, buf);
  return buf;
}

module.exports = { speak, speakCached, warmUp, ttsProvider, mp3For, DEFAULT_VOICE_ID };
