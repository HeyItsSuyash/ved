// Production entry point: check required configuration, bring the database schema up
// to date, then start the server. Fails with one clear message instead of a stack trace.
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Local development reads backend/.env (or .env.local); on Render the variables come from the dashboard.
const root = path.join(__dirname, '..');
const envFile = path.join(root, fs.existsSync(path.join(root, '.env.local')) ? '.env.local' : '.env');
if (fs.existsSync(envFile)) require('dotenv').config({ path: envFile, quiet: true });

const REQUIRED = {
  DATABASE_URL: 'Postgres connection string (Supabase: Connect > Session pooler, port 5432)',
  JWT_SECRET: 'long random string used to sign dashboard logins',
};

const RECOMMENDED = {
  PUBLIC_BASE_URL: 'https URL of this backend; needed for Plivo calls',
  PLIVO_AUTH_ID: 'Plivo account ID',
  PLIVO_AUTH_TOKEN: 'Plivo auth token; also verifies Plivo webhook signatures',
  PLIVO_NUMBER: 'helpline number in E.164, e.g. +912269855433',
  GROQ_API_KEY: 'speech-to-text and the AI replies',
  ELEVENLABS_API_KEY: 'the agent voice; without it the basic Google voice is used',
};

// Print which variables this process can see (names only, never values), so a deploy
// log shows at a glance whether the host passed its settings through.
const OTHER = ['TELEPHONY_PROVIDER', 'DASHBOARD_ORIGIN', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'PORT'];
console.log('[startup] Environment check (set / missing):');
for (const k of [...Object.keys(REQUIRED), ...Object.keys(RECOMMENDED), ...OTHER]) {
  console.log(`  ${process.env[k] ? 'set    ' : 'MISSING'} ${k}`);
}

const missing = Object.keys(REQUIRED).filter((k) => !process.env[k]);
if (missing.length) {
  console.error('[startup] Cannot start. Missing required environment variables:');
  for (const k of missing) console.error(`  - ${k}: ${REQUIRED[k]}`);
  console.error('[startup] If you added them on the host, check they are on this service (not only an unlinked environment group) and that the change was saved and redeployed.');
  process.exit(1);
}

const notSet = Object.keys(RECOMMENDED).filter((k) => !process.env[k]);
if (notSet.length) {
  console.warn('[startup] Not set (the related features will not work):');
  for (const k of notSet) console.warn(`  - ${k}: ${RECOMMENDED[k]}`);
}

const { applyDatabaseUrls, describe } = require('../services/dbUrl');
const db = applyDatabaseUrls();
console.log(`[startup] Database: ${describe(db)}`);

try {
  // Adds new tables and columns; refuses changes that would lose data. Uses DIRECT_URL.
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit', cwd: root, env: process.env });
} catch {
  console.error('[startup] Could not update the database schema. Check that DATABASE_URL is correct and the database is reachable.');
  console.error('[startup] Supabase: use Connect > Session pooler (port 5432) and replace [YOUR-PASSWORD] with the database password.');
  process.exit(1);
}

try {
  // Keep tables out of Supabase's public Data API (RLS on, anon/authenticated revoked).
  execSync('npx prisma db execute --file prisma/sql/lockdown.sql --schema prisma/schema.prisma', {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  });
  console.log('[startup] Row level security enabled on all public tables');
} catch {
  console.error('[startup] WARNING: could not enable row level security; tables may be readable through the Supabase Data API.');
}

require('../server');
