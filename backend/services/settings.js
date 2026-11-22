const prisma = require('./db');

const DEFAULTS = {
  persona: `Name: Ved (वेद).
Role: Counsellor on the admission and counselling helpline of Madan Mohan Malaviya University of Technology, Gorakhpur.
Who he is: a warm, patient young man from Uttar Pradesh. He talks to students and parents like a helpful senior who knows the university well, never like a machine reading out data. Calm, respectful, never in a hurry, never pushy.`,
  systemPrompt: `How to speak:
- Talk like a real person on the phone. Always answer in complete, natural sentences, never with a bare fact or number on its own.
- Use natural fillers and polite words where they fit: "जी", "देखिए", "अच्छा", "बिल्कुल", "हाँ जी", "सर" or "मैम". Use them lightly, not in every sentence.
- Put the fact in context. For example, asked about B.Tech fees and hostel: "जी, देखिए, बी.टेक की वार्षिक फीस 1,24,000 रुपये है सर, और अगर आप हॉस्टल भी लेते हैं तो उसकी अलग से 48,000 रुपये सालाना फीस लगती है।"
- Keep each reply to one or two sentences, then let the caller speak. When it helps, end with a short question such as "और कुछ जानना चाहेंगे?"
- Reply in the caller's language: Hindi for Hindi or Hinglish callers, English for English callers.
- Call the university "मदन मोहन मालवीय यूनिवर्सिटी" (in English, "Madan Mohan Malaviya University"). Never say "MMMUT".
- Speak as a man: "मैं बता सकता हूँ", "मैं आपकी सेवा कर सकता हूँ".
- Do not repeat the caller's question back. Do not say goodbye unless the caller does.

Facts:
- Use only the knowledge base. Never guess dates, fees, cut-offs or eligibility.
- If the answer is not there, say so politely and offer to connect the caller to a counsellor who can clear the doubt.

Handing over:
- If the caller wants to speak to a person, or you could not clear their doubt after two tries, set "transfer_to_human" to true and leave "spoken" empty. The caller then hears the hold message from the Forwarding page exactly as written. If no counsellor is free, they hear the follow-up message and the closing greeting, also exactly as written.

Ending the call:
- When the caller's question is answered and they have nothing more to ask, set "end_call" to true. If you still have an answer to give, put only that in "spoken"; otherwise leave it empty. The closing greeting is played after it exactly as written, so never add thanks or goodbye yourself.
- This helpline is only for admission and counselling at the university. If the caller talks about something unrelated, politely say so once and ask what they need about admission. If they continue with unrelated, abusive or prank talk, set "end_call" to true and leave "spoken" empty; the closing greeting is played exactly as written.
- Never end the call while a genuine admission question is still open.`,
  greeting: 'नमस्ते, मदन मोहन मालवीय यूनिवर्सिटी हेल्पलाइन में आपका स्वागत है। यह कॉल रिकॉर्ड की जा रही है। बताइए, मैं आपकी क्या सेवा कर सकता हूँ?',
  holdMessage: 'जी, कृपया लाइन पर बने रहिए, मैं आपको हमारे काउंसलर से जोड़ रहा हूँ।',
  closingMessage: 'मदन मोहन मालवीय यूनिवर्सिटी हेल्पलाइन पर कॉल करने के लिए धन्यवाद। आपका दिन शुभ हो, नमस्ते।',
  followUpMessage:
    'माफ़ कीजिए, इसकी सही जानकारी अभी मेरे पास नहीं है और इस समय कोई काउंसलर फ्री नहीं है। मैंने आपका सवाल काउंसलर तक पहुँचा दिया है, वो आपसे इसी नंबर पर संपर्क करेंगे।',
  rateLimitMessage: 'आप पिछले एक घंटे में कई बार कॉल कर चुके हैं। कृपया थोड़ी देर बाद दोबारा कॉल कीजिए। धन्यवाद।',
  unavailableMessage:
    'माफ़ कीजिए, अभी हमारे सभी काउंसलर दूसरी कॉल पर हैं। कृपया थोड़ी देर बाद कॉल कीजिए, या सुबह दस से शाम पाँच बजे के बीच एडमिशन ऑफिस आ जाइए।',
  voiceId: 'PqovzlPXjFmB5NRVvFVe',
  voiceTone: 'friendly',
  voiceSpeed: 1.0,
  agentEnabled: true,
  maxConcurrentCalls: 5,
  maxCallsPerHour: 5,
  forwardTimeoutSeconds: 20,
};

/** Male Hindi/English voices offered in the dashboard (ElevenLabs voice library). */
const VOICES = [
  { id: 'PqovzlPXjFmB5NRVvFVe', name: 'Ayush', description: 'Warm, friendly support agent. Moves easily between Hindi and English.' },
  { id: 'TltOz3rS3FbyFxkuOExm', name: 'AK', description: 'Young, calm and friendly. Neutral Indian Hindi accent.' },
  { id: 'St2cPeLlJOQWnwhAvOaT', name: 'Guddu', description: 'Confident and professional. Steady, clear delivery.' },
  { id: 'Carau7246cc1DGizPQtP', name: 'Ratan', description: 'Calm and formal, like a bank helpdesk.' },
  { id: 'FuNEroZdMQWScvkSu4Xt', name: 'Amogh', description: 'Warm, natural, encouraging everyday Hindi.' },
];

/** Tone presets mapped to ElevenLabs voice settings. */
const TONES = {
  calm: { label: 'Calm', stability: 0.7, style: 0.0 },
  friendly: { label: 'Friendly', stability: 0.5, style: 0.25 },
  expressive: { label: 'Expressive', stability: 0.32, style: 0.5 },
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
    } else if (key === 'maxCallsPerHour') {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error('maxCallsPerHour must be a whole number from 0 (no limit) to 100');
      out[key] = n;
    } else if (key === 'forwardTimeoutSeconds') {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 5 || n > 120) throw new Error('forwardTimeoutSeconds must be from 5 to 120');
      out[key] = n;
    } else if (key === 'voiceSpeed') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0.7 || n > 1.2) throw new Error('voiceSpeed must be from 0.7 to 1.2');
      out[key] = Math.round(n * 100) / 100;
    } else if (key === 'voiceTone') {
      if (!TONES[value]) throw new Error(`voiceTone must be one of ${Object.keys(TONES).join(', ')}`);
      out[key] = value;
    } else if (key === 'voiceId') {
      if (typeof value !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(value)) throw new Error('voiceId is not a valid voice');
      out[key] = value;
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
  // Pre-generate audio for edited lines so the next caller hears them without delay.
  const voiceChanged = 'voiceId' in data || 'voiceTone' in data || 'voiceSpeed' in data;
  if (data.greeting || data.closingMessage || data.followUpMessage || voiceChanged) {
    require('../pipeline/tts').warmUp(spokenLines(cache)).catch(() => {});
  }
  if (data.holdMessage || data.unavailableMessage || data.rateLimitMessage || data.closingMessage || data.followUpMessage || voiceChanged) {
    require('../telephony/plivo/lines').warmLines().catch(() => {});
  }
  return cache;
}

/** Fixed lines the agent speaks inside a call; synthesized ahead so they play at once. */
function spokenLines(s = cache) {
  return [s.greeting, s.closingMessage, s.followUpMessage];
}

function pick(row) {
  const out = {};
  for (const key of EDITABLE) out[key] = row[key];
  return out;
}

module.exports = { loadSettings, getSettings, updateSettings, spokenLines, DEFAULTS, VOICES, TONES };
