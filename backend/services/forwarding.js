const prisma = require('./db');

const E164_INDIA_OR_INTL = /^\+[1-9]\d{7,14}$/;

/** Normalise "+91 98765-43210" or "098765 43210" to E.164. Indian numbers without a country code get +91. */
function normaliseNumber(raw) {
  if (typeof raw !== 'string') throw new Error('Phone number is required');
  let n = raw.replace(/[\s().-]/g, '');
  if (n.startsWith('00')) n = '+' + n.slice(2);
  if (!n.startsWith('+')) {
    n = n.replace(/^0+/, '');
    if (/^\d{10}$/.test(n)) n = '+91' + n;
    else n = '+' + n;
  }
  if (!E164_INDIA_OR_INTL.test(n)) throw new Error('Enter a full phone number, e.g. +91 98765 43210');
  return n;
}

// Never send OTP hashes to the dashboard.
const PUBLIC_FIELDS = {
  id: true,
  number: true,
  label: true,
  position: true,
  active: true,
  verified: true,
  verifiedAt: true,
  otpExpiresAt: true,
};

async function listForwardingNumbers() {
  const rows = await prisma.forwardingNumber.findMany({ orderBy: { position: 'asc' }, select: PUBLIC_FIELDS });
  const now = new Date();
  return rows.map(({ otpExpiresAt, ...r }) => ({ ...r, codePending: Boolean(otpExpiresAt && otpExpiresAt > now) }));
}

/** Numbers that ring when a call is forwarded: switched on and verified. */
async function activeForwardingNumbers() {
  return prisma.forwardingNumber.findMany({
    where: { active: true, verified: true },
    orderBy: { position: 'asc' },
    select: { id: true, number: true, label: true },
  });
}

async function addForwardingNumber({ number, label }) {
  const clean = normaliseNumber(number);
  const existing = await prisma.forwardingNumber.findUnique({ where: { number: clean } });
  if (existing) throw new Error('That number is already in the list');
  const last = await prisma.forwardingNumber.findFirst({ orderBy: { position: 'desc' } });
  await prisma.forwardingNumber.create({
    data: { number: clean, label: (label || '').trim(), position: (last?.position ?? -1) + 1 },
  });
  return listForwardingNumbers();
}

async function updateForwardingNumber(id, { label, active }) {
  const data = {};
  if (label !== undefined) data.label = String(label).trim();
  if (active !== undefined) {
    if (typeof active !== 'boolean') throw new Error('active must be true or false');
    data.active = active;
  }
  await prisma.forwardingNumber.update({ where: { id }, data });
  return listForwardingNumbers();
}

async function removeForwardingNumber(id) {
  await prisma.forwardingNumber.delete({ where: { id } });
  return reorderForwardingNumbers((await listForwardingNumbers()).map((n) => n.id));
}

/** Set the order from a list of ids. Ids not in the list keep their relative order after the listed ones. */
async function reorderForwardingNumbers(ids) {
  if (!Array.isArray(ids)) throw new Error('ids must be an array');
  const all = await listForwardingNumbers();
  const known = new Set(all.map((n) => n.id));
  const ordered = ids.filter((id) => known.has(id));
  for (const n of all) if (!ordered.includes(n.id)) ordered.push(n.id);
  await prisma.$transaction(
    ordered.map((id, position) => prisma.forwardingNumber.update({ where: { id }, data: { position } }))
  );
  return listForwardingNumbers();
}

module.exports = {
  normaliseNumber,
  listForwardingNumbers,
  activeForwardingNumbers,
  addForwardingNumber,
  updateForwardingNumber,
  removeForwardingNumber,
  reorderForwardingNumbers,
};
