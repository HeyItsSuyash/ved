const crypto = require('crypto');
const { getSettings } = require('../../services/settings');
const { ttsProvider, mp3For } = require('../../pipeline/tts');
const { url } = require('./config');

/** Fixed lines Plivo plays outside the agent conversation. */
// Hold and busy messages are edited in the dashboard (Forwarding page). Only the
// recording notice and the error line, which must not be removed, are fixed here.
const RECORDING_NOTICE = 'यह कॉल रिकॉर्ड की जा रही है।';
const ERROR_LINE = 'माफ़ कीजिए, अभी हम आपकी कॉल नहीं ले पा रहे हैं। कृपया थोड़ी देर बाद कॉल करें।';

function textFor(id) {
  const s = getSettings();
  if (id === 'hold') return s.holdMessage;
  if (id === 'recording_notice') return RECORDING_NOTICE;
  if (id === 'unavailable') return s.unavailableMessage;
  if (id === 'closing') return s.closingMessage;
  if (id === 'follow_up') return s.followUpMessage;
  if (id === 'rate_limited') return s.rateLimitMessage;
  if (id === 'error') return ERROR_LINE;
  return null;
}

const hash = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);

/**
 * { text, audioUrl } for a line. The URL carries a hash of the text, so Plivo never
 * replays an old recording after the message is edited in the dashboard.
 */
function lineFor(id) {
  const text = textFor(id);
  const audioUrl = ttsProvider() === 'elevenlabs' ? url(`/plivo/audio/${id}-${hash(text)}.mp3`) : null;
  return { text, audioUrl };
}

/** MP3 for /plivo/audio/<id>-<hash>.mp3, or null if the id or hash is unknown. */
async function audioFor(file) {
  const m = /^([a-z_]+)-([0-9a-f]{10})\.mp3$/.exec(file);
  if (!m) return null;
  const text = textFor(m[1]);
  if (!text || hash(text) !== m[2]) return null;
  return mp3For(text);
}

/** Generate the MP3s ahead of the first call. */
async function warmLines() {
  if (ttsProvider() !== 'elevenlabs') return;
  for (const id of ['hold', 'recording_notice', 'error', 'unavailable', 'closing', 'follow_up', 'rate_limited']) {
    try {
      await mp3For(textFor(id));
    } catch (err) {
      console.error(`[Plivo] Could not prepare the "${id}" message:`, err.message);
    }
  }
}

module.exports = { lineFor, audioFor, warmLines };
