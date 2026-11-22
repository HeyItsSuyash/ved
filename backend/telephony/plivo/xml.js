function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const wrap = (body) => `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${body}\n</Response>`;

/**
 * A fixed line for the caller. With an audio URL it is played in the agent's own
 * (ElevenLabs) voice; otherwise Plivo speaks it. WOMAN/MAN voices do not cover
 * Indian languages (Plivo logs 8011), so the fallback uses Polly voices.
 */
function line({ text, audioUrl }) {
  if (audioUrl) return `  <Play>${esc(audioUrl)}</Play>\n`;
  const hindi = /[ऀ-ॿ]/.test(text);
  const voice = hindi ? 'voice="Polly.Aditi" language="hi-IN"' : 'voice="Polly.Raveena" language="en-IN"';
  return `  <Speak ${voice}>${esc(text)}</Speak>\n`;
}

/** Record the whole call in the background. Must come before <Stream>, which holds the call. */
function record(callbackUrl) {
  return `  <Record recordSession="true" fileFormat="mp3" maxLength="3600" callbackUrl="${esc(callbackUrl)}" callbackMethod="POST"/>\n`;
}

/**
 * Connect the caller to the agent over a bidirectional mu-law stream.
 * keepCallAlive keeps the call on the stream; the <Redirect> after it runs only
 * when the socket closes, so a dropped agent sends the caller to staff, not silence.
 */
function streamXml({ wsUrl, statusCallbackUrl, afterStreamUrl, recordingCallbackUrl }) {
  return wrap(
    (recordingCallbackUrl ? record(recordingCallbackUrl) : '') +
      `  <Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000" ` +
      `statusCallbackUrl="${esc(statusCallbackUrl)}" statusCallbackMethod="POST">${esc(wsUrl)}</Stream>\n` +
      `  <Redirect method="POST">${esc(afterStreamUrl)}</Redirect>`
  );
}

/** Ring one staff number. Plivo posts DialStatus to `actionUrl` and runs the XML it returns. */
function dialXml({ number, callerId, timeout, actionUrl, announce, recordingCallbackUrl }) {
  return wrap(
    (recordingCallbackUrl ? record(recordingCallbackUrl) : '') +
      (announce ? line(announce) : '') +
      `  <Dial timeout="${Number(timeout)}" callerId="${esc(callerId)}" action="${esc(actionUrl)}" method="POST">\n` +
      `    <Number>${esc(number)}</Number>\n` +
      `  </Dial>`
  );
}

/** One or more lines, then hang up. */
function sayAndHangupXml(...messages) {
  return wrap(messages.map(line).join('') + '  <Hangup/>');
}

function hangupXml() {
  return wrap('  <Hangup/>');
}

module.exports = { streamXml, dialXml, sayAndHangupXml, hangupXml, esc };
