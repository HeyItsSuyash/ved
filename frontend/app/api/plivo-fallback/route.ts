/**
 * Plivo fallback answer URL, hosted with the dashboard so it still works when the
 * backend is down. It rings every staff number at once; the first to answer gets the call.
 *
 * Env: PLIVO_FALLBACK_NUMBERS (comma-separated E.164), PLIVO_NUMBER (caller ID),
 * PLIVO_FALLBACK_KEY (must match ?key= in the URL configured on the Plivo application).
 */

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const VOICE = 'voice="Polly.Raveena" language="en-IN"';

function xml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${body}\n</Response>`, {
    headers: { 'Content-Type': 'application/xml' },
  });
}

function handle(req: Request) {
  const key = new URL(req.url).searchParams.get('key');
  if (!process.env.PLIVO_FALLBACK_KEY || key !== process.env.PLIVO_FALLBACK_KEY) {
    return new Response('Forbidden', { status: 403 });
  }

  const numbers = (process.env.PLIVO_FALLBACK_NUMBERS || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  const callerId = process.env.PLIVO_NUMBER || '';

  if (numbers.length === 0 || !callerId) {
    return xml(
      `  <Speak ${VOICE}>Sorry, the helpline is not available right now. Please call again later.</Speak>\n  <Hangup/>`
    );
  }

  return xml(
    `  <Speak ${VOICE}>Please hold while we connect you to a counsellor.</Speak>\n` +
      `  <Dial timeout="25" callerId="${esc(callerId)}">\n` +
      numbers.map((n) => `    <Number>${esc(n)}</Number>`).join('\n') +
      `\n  </Dial>\n` +
      `  <Speak ${VOICE}>Sorry, all our counsellors are busy. Please call again later.</Speak>\n  <Hangup/>`
  );
}

export const GET = handle;
export const POST = handle;
export const dynamic = 'force-dynamic';
