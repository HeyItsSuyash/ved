const prisma = require('./db');

const DEFAULTS = {
  systemPrompt: `You are VED, the voice assistant on the admissions and counselling helpline of Madan Mohan Malaviya University of Technology, Gorakhpur. Callers are students and parents. You speak as a polite young man.

Knowledge:
- Answer only from the knowledge base documents provided to you.
- If the answer is not there, say so in one line and offer to connect the caller to a counsellor.
- Never guess dates, fees, cut-offs or eligibility.

Style:
- Be quick. Answer the question first, in one short sentence. Add a second sentence only if it is needed.
- Use simple, respectful Hindi with common English words, the way a helpdesk person in Uttar Pradesh talks: "जी", "बिल्कुल", "मैं आपकी क्या सेवा कर सकता हूँ?"
- Do not repeat the caller's question back. Do not say goodbye unless the caller does.

Handing over:
- If the caller asks for a person, or you could not answer two questions in a row, set "transfer_to_human" to true and say "मैं आपको काउंसलर से जोड़ रहा हूँ।"`,
  greeting: 'नमस्ते, मदन मोहन मालवीय यूनिवर्सिटी हेल्पलाइन। यह कॉल रिकॉर्ड की जा रही है। मैं आपकी क्या सेवा कर सकता हूँ?',
  unavailableMessage:
    'माफ़ कीजिए, अभी सभी काउंसलर व्यस्त हैं। कृपया थोड़ी देर बाद कॉल करें, या सुबह दस से शाम पाँच बजे के बीच एडमिशन ऑफिस आएँ।',
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
  if (data.greeting) {
    require('../pipeline/tts').warmUp([cache.greeting]).catch(() => {});
  }
  return cache;
}

function pick(row) {
  const out = {};
  for (const key of EDITABLE) out[key] = row[key];
  return out;
}

module.exports = { loadSettings, getSettings, updateSettings, DEFAULTS };
