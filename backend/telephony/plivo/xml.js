function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const wrap = (body) => `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${body}\n</Response>`;

// WOMAN/MAN voices do not cover Indian languages (Plivo logs 8011); use Polly voices.
const SPEAK_VOICE = 'Polly.Raveena';
const SPEAK_LANGUAGE = 'en-IN';
const speak = (text) => `  <Speak voice="${SPEAK_VOICE}" language="${SPEAK_LANGUAGE}">${esc(text)}</Speak>\n`;

/**
 * Connect the caller to the agent over a bidirectional mu-law stream.
 * keepCallAlive keeps the call on the stream; the <Redirect> after it runs only
 * when the socket closes, so a dropped agent sends the caller to staff, not silence.
 */
function streamXml({ wsUrl, statusCallbackUrl, afterStreamUrl }) {
  return wrap(
    `  <Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000" ` +
      `statusCallbackUrl="${esc(statusCallbackUrl)}" statusCallbackMethod="POST">${esc(wsUrl)}</Stream>\n` +
      `  <Redirect method="POST">${esc(afterStreamUrl)}</Redirect>`
  );
}

/** Ring one staff number. Plivo posts DialStatus to `actionUrl` and runs the XML it returns. */
function dialXml({ number, callerId, timeout, actionUrl, announce }) {
  return wrap(
    (announce ? speak(announce) : '') +
      `  <Dial timeout="${Number(timeout)}" callerId="${esc(callerId)}" action="${esc(actionUrl)}" method="POST">\n` +
      `    <Number>${esc(number)}</Number>\n` +
      `  </Dial>`
  );
}

function speakAndHangupXml(message) {
  return wrap(speak(message) + '  <Hangup/>');
}

function hangupXml() {
  return wrap('  <Hangup/>');
}

module.exports = { streamXml, dialXml, speakAndHangupXml, hangupXml, esc };
