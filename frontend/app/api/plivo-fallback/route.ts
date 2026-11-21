/**
 * Plivo fallback answer URL, hosted with the dashboard so it still works when the
 * backend is down. It rings every staff number at once; the first to answer gets the call.
 *
 * Env: PLIVO_FALLBACK_NUMBERS (comma-separated E.164), PLIVO_NUMBER (caller ID),
 * PLIVO_FALLBACK_KEY (must match ?key= in the URL configured on the Plivo application).
 */

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function xml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${body}\n</Response>`, {
    headers: { 'Content-Type': 'application/xml' },
  });
}

function handle(req: Request) {
  const reqUrl = new URL(req.url);
  if (!process.env.PLIVO_FALLBACK_KEY || reqUrl.searchParams.get('key') !== process.env.PLIVO_FALLBACK_KEY) {
    return new Response('Forbidden', { status: 403 });
  }

  // Messages are recordings in the agent's voice (public/audio), so callers never
  // hear a different voice when the backend is down.
  const play = (name: string) => `  <Play>${esc(`${reqUrl.origin}/audio/${name}.mp3`)}</Play>\n`;

  const numbers = (process.env.PLIVO_FALLBACK_NUMBERS || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  const callerId = process.env.PLIVO_NUMBER || '';

  if (numbers.length === 0 || !callerId) {
    return xml(play('unavailable') + '  <Hangup/>');
  }

  return xml(
    play('hold') +
      `  <Dial timeout="25" callerId="${esc(callerId)}">\n` +
      numbers.map((n) => `    <Number>${esc(n)}</Number>`).join('\n') +
      `\n  </Dial>\n` +
      play('busy') +
      '  <Hangup/>'
  );
}

export const GET = handle;
export const POST = handle;
export const dynamic = 'force-dynamic';
