const bcrypt = require('bcryptjs');
const prisma = require('./db');

/**
 * Create the first admin login from ADMIN_EMAIL and ADMIN_PASSWORD, for hosts without a
 * shell (Render's free plan). Runs on every start but only creates a missing user; it
 * never changes an existing account's password.
 */
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return;
  if (password.length < 10) {
    console.warn('[bootstrap] ADMIN_PASSWORD must be at least 10 characters; admin not created.');
    return;
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return;
    await prisma.user.create({ data: { email, password: await bcrypt.hash(password, 10), role: 'admin' } });
    console.log(`[bootstrap] Created admin login ${email}`);
  } catch (err) {
    console.error('[bootstrap] Could not create the admin login:', err.message);
  }
}

module.exports = { ensureAdmin };
