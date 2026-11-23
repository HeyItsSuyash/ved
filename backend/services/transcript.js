// Turns a finished call's turns into the stored transcript: tidy text, with an
// English version of every line that was not said in English.
const { translateToEnglish } = require('./llm');

// Devanagari and the other Indian scripts.
const INDIC = /[ऀ-෿]/;

const needsEnglish = (text) => INDIC.test(text);

/** Whitespace, stray markdown and quote marks around a whole line. */
function tidy(text) {
  return String(text || '')
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();
}

/** "English (original)", or the text alone when it was already English. */
function bilingual(en, original) {
  if (!original) return en || '';
  if (!en || en === original) return original;
  return `${en} (${original})`;
}

/**
 * Stored transcript turns: { speaker, text, text_en, language, timestamp, ... }.
 * `extra` lines (such as the follow-up question) are translated in the same request;
 * their English versions come back in `extraEnglish`.
 */
async function englishTranscript(turns, extra = []) {
  const cleaned = (turns || [])
    .map((t) => ({ ...t, text: tidy(t.text) }))
    .filter((t) => t.text);

  const pending = [...cleaned.map((t) => t.text), ...extra.map(tidy)].filter(needsEnglish);
  const unique = [...new Set(pending)];
  let english = new Map();
  if (unique.length) {
    const translated = await translateToEnglish(unique).catch(() => null);
    if (translated) english = new Map(unique.map((t, i) => [t, translated[i]]));
  }

  const en = (text) => (needsEnglish(text) ? english.get(text) || null : text);
  return {
    turns: cleaned.map((t) => ({ ...t, text_en: en(t.text) })),
    extraEnglish: extra.map((x) => en(tidy(x))),
  };
}

module.exports = { englishTranscript, bilingual };
