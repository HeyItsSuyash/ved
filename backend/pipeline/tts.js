const { getGoogleTTS } = require('../services/speech');
const { toMulaw8k } = require('./audio');

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MAX_FRAME = 8000; // bytes of mu-law per playAudio message (1 s); well under Plivo's 64 KB limit once base64-encoded

function ttsProvider() {
  return process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID ? 'elevenlabs' : 'google';
}

function emitInFrames(buffer, onAudio) {
  for (let i = 0; i < buffer.length; i += MAX_FRAME) onAudio(buffer.subarray(i, i + MAX_FRAME));
}

/**
 * ElevenLabs streaming TTS straight to mu-law 8 kHz, so audio reaches the caller
 * while the rest of the sentence is still being generated.
 */
async function streamElevenLabs(text, onAudio, signal) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const model = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
  const res = await fetch(`${ELEVENLABS_URL}/${encodeURIComponent(voiceId)}/stream?output_format=ulaw_8000`, {
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
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
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
const cacheKey = (text) => `${ttsProvider()}|${process.env.ELEVENLABS_VOICE_ID || ''}|${process.env.ELEVENLABS_MODEL_ID || ''}|${text}`;

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
        const audio = await synthesizeToBuffer(line, 'hinglish');
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
async function speak(text, { language = 'en', onAudio, signal } = {}) {
  if (!text || !text.trim()) return 0;
  if (ttsProvider() === 'elevenlabs') {
    try {
      return await streamElevenLabs(text, onAudio, signal);
    } catch (err) {
      if (signal?.aborted) return 0;
      console.error('[TTS] ElevenLabs failed, falling back to Google:', err.message);
    }
  }
  if (signal?.aborted) return 0;
  return speakGoogle(text, language, onAudio);
}

module.exports = { speak, speakCached, warmUp, ttsProvider };
