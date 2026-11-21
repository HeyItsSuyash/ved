// Production entry point: check required configuration, bring the database schema up
// to date, then start the server. Fails with one clear message instead of a stack trace.
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Local development reads backend/.env (or .env.local); on Render the variables come from the dashboard.
const root = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(root, fs.existsSync(path.join(root, '.env.local')) ? '.env.local' : '.env') });

const REQUIRED = {
  DATABASE_URL: 'Postgres connection string (Render: your database > Connections > Internal Database URL)',
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

const missing = Object.keys(REQUIRED).filter((k) => !process.env[k]);
if (missing.length) {
  console.error('[startup] Cannot start. Missing environment variables:');
  for (const k of missing) console.error(`  - ${k}: ${REQUIRED[k]}`);
  process.exit(1);
}

const notSet = Object.keys(RECOMMENDED).filter((k) => !process.env[k]);
if (notSet.length) {
  console.warn('[startup] Not set (the related features will not work):');
  for (const k of notSet) console.warn(`  - ${k}: ${RECOMMENDED[k]}`);
}

try {
  // Adds new tables and columns; refuses changes that would lose data.
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit', cwd: root });
} catch {
  console.error('[startup] Could not update the database schema. Check that DATABASE_URL is correct and the database is reachable.');
  process.exit(1);
}

require('../server');
