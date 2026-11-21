const prisma = require('./db');

const DEFAULTS = {
  systemPrompt: `You are VED, the voice assistant for the admissions and counselling helpline of Madan Mohan Malaviya University of Technology (MMMUT), Gorakhpur.

Knowledge:
- Answer only from the knowledge base documents provided to you.
- If the answer is not there, say: "I'm sorry, I don't have that information." Then offer to connect the caller to a counsellor.
- Never guess dates, fees, cut-offs or eligibility.

Language:
- Reply in the caller's language. For Hindi or Hinglish, write Hindi words in Roman script.

Style:
- One or two short sentences, at most 30 words. This is a phone call.
- Do not say goodbye unless the caller does.

Handing over:
- If the caller asks for a person, or you could not answer two questions in a row, set "transfer_to_human" to true and say you are connecting them to a counsellor.`,
  greeting: 'Namaste, MMMUT admission helpline. Main aapki kya madad kar sakti hoon?',
  unavailableMessage:
    'Sorry, all our counsellors are busy right now. Please call again later or visit the admissions office between 10 AM and 5 PM.',
  agentEnabled: true,
  maxConcurrentCalls: 5,
  forwardTimeoutSeconds: 20,
};

const EDITABLE = Object.keys(DEFAULTS);

let cache = { ...DEFAULTS };

/** Load settings from the database into memory, creating the row on first run. */
async function loadSettings() {
  try {
    const row = await prisma.setting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, ...DEFAULTS },
    });
    cache = pick(row);
  } catch (err) {
    console.error('[Settings] Could not load settings, using defaults:', err.message);
  }
  return cache;
}

/** Current settings. Synchronous so the call pipeline never waits on the database. */
function getSettings() {
  return cache;
}

function validate(input) {
  const out = {};
  for (const key of EDITABLE) {
    if (!(key in input)) continue;
    const value = input[key];
    if (key === 'agentEnabled') {
      if (typeof value !== 'boolean') throw new Error('agentEnabled must be true or false');
      out[key] = value;
    } else if (key === 'maxConcurrentCalls') {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error('maxConcurrentCalls must be a whole number from 0 to 100');
      out[key] = n;
    } else if (key === 'forwardTimeoutSeconds') {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 5 || n > 120) throw new Error('forwardTimeoutSeconds must be from 5 to 120');
      out[key] = n;
    } else {
      if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} cannot be empty`);
      out[key] = value.trim();
    }
  }
  return out;
}

async function updateSettings(input) {
  const data = validate(input || {});
  const row = await prisma.setting.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...DEFAULTS, ...data },
  });
  cache = pick(row);
  return cache;
}

function pick(row) {
  const out = {};
  for (const key of EDITABLE) out[key] = row[key];
  return out;
}

module.exports = { loadSettings, getSettings, updateSettings, DEFAULTS };
