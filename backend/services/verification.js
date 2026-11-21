const crypto = require('crypto');
const prisma = require('./db');

// A staff number only receives forwarded calls after an admin proves it reaches the
// right phone: Plivo calls it and reads out a 6-digit code, which the admin types into
// the dashboard. Plivo's Verify API is not enabled on this account, so the call is ours.

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const HINDI_DIGITS = ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ'];

// Codes waiting to be read out on a call, by an unguessable token in the call's URL.
const pendingCalls = new Map();

function hashCode(id, code) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev').update(`${id}:${code}`).digest('hex');
}

function spokenCode(code) {
  const digits = code.split('').map((d) => HINDI_DIGITS[Number(d)]).join(', ');
  return `नमस्ते, यह मदन मोहन मालवीय यूनिवर्सिटी हेल्पलाइन से कॉल है। आपका वेरिफिकेशन कोड है: ${digits}। फिर से सुनिए: ${digits}। धन्यवाद।`;
}

/** Text for the verification call behind `token`, or null once used or expired. */
function textForCall(token) {
  const p = pendingCalls.get(token);
  if (!p || p.expiresAt < Date.now()) return null;
  return spokenCode(p.code);
}

async function sendCode(id) {
  const row = await prisma.forwardingNumber.findUnique({ where: { id } });
  if (!row) throw Object.assign(new Error('Not found'), { code: 'P2025' });

  const now = Date.now();
  const recent = (row.otpSentAt || []).filter((t) => now - new Date(t).getTime() < SEND_WINDOW_MS);
  if (recent.length >= MAX_SENDS_PER_WINDOW) {
    throw new Error('Too many codes sent to this number. Try again in 10 minutes.');
  }

  const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  await deliver(row.number, code);

  await prisma.forwardingNumber.update({
    where: { id },
    data: {
      otpHash: hashCode(id, code),
      otpExpiresAt: new Date(now + CODE_TTL_MS),
      otpAttempts: 0,
      otpSentAt: [...recent.map((t) => new Date(t)), new Date(now)],
    },
  });
}

async function deliver(number, code) {
  // Local development without real calls: OTP_DELIVERY=log prints the code instead.
  if (process.env.OTP_DELIVERY === 'log') {
    console.log(`[OTP] Code for ${number}: ${code}`);
    return;
  }
  const { plivoConfigured, plivoClient, helplineNumber, url } = require('../telephony/plivo/config');
  if (!plivoConfigured() || !helplineNumber()) {
    throw new Error('Phone verification needs Plivo: set PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN and PLIVO_NUMBER.');
  }
  const token = crypto.randomBytes(18).toString('hex');
  pendingCalls.set(token, { code, expiresAt: Date.now() + CODE_TTL_MS });
  setTimeout(() => pendingCalls.delete(token), CODE_TTL_MS).unref();
  await plivoClient().calls.create(helplineNumber(), number, url(`/plivo/otp/${token}`), {
    answerMethod: 'POST',
    timeLimit: 120,
  });
}

async function verifyCode(id, code) {
  const row = await prisma.forwardingNumber.findUnique({ where: { id } });
  if (!row) throw Object.assign(new Error('Not found'), { code: 'P2025' });
  if (!row.otpHash || !row.otpExpiresAt || row.otpExpiresAt < new Date()) {
    throw new Error('No valid code. Send a new one.');
  }
  if (row.otpAttempts >= MAX_ATTEMPTS) throw new Error('Too many wrong codes. Send a new one.');

  const clean = String(code || '').replace(/\D/g, '');
  const ok =
    clean.length === 6 &&
    crypto.timingSafeEqual(Buffer.from(hashCode(id, clean)), Buffer.from(row.otpHash));

  if (!ok) {
    await prisma.forwardingNumber.update({ where: { id }, data: { otpAttempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - row.otpAttempts - 1;
    throw new Error(left > 0 ? `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Wrong code. Send a new one.');
  }

  await prisma.forwardingNumber.update({
    where: { id },
    data: { verified: true, verifiedAt: new Date(), otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
  });
}

module.exports = { sendCode, verifyCode, textForCall };
