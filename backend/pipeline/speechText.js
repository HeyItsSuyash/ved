// Prepares reply text for the voice so Hindi is pronounced correctly:
// numbers become Hindi words with Indian grouping (lakh, crore), long digit
// strings (phone or roll numbers) are read digit by digit, and abbreviations
// the agent should never spell out are expanded.

const ONES = [
  'शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
  'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस',
  'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस',
  'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस',
  'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास',
  'पचास', 'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ',
  'साठ', 'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर',
  'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उन्यासी',
  'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी',
  'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे',
];

/** Integer to Hindi words with Indian grouping, e.g. 124000 -> "एक लाख चौबीस हज़ार". */
function hindiNumber(n) {
  if (!Number.isFinite(n) || n < 0 || n >= 1e11) return String(n);
  n = Math.floor(n);
  if (n < 100) return ONES[n];
  const parts = [];
  const scales = [
    [1e7, 'करोड़'],
    [1e5, 'लाख'],
    [1e3, 'हज़ार'],
    [1e2, 'सौ'],
  ];
  for (const [value, word] of scales) {
    if (n >= value) {
      parts.push(`${hindiNumber(Math.floor(n / value))} ${word}`);
      n %= value;
    }
  }
  if (n > 0) parts.push(ONES[n]);
  return parts.join(' ');
}

function digitsOneByOne(s) {
  return s
    .split('')
    .map((d) => ONES[Number(d)])
    .join(' ');
}

const DEVANAGARI = /[ऀ-ॿ]/;

const EXPANSIONS = [
  [/\bMMMUT\b/gi, 'मदन मोहन मालवीय यूनिवर्सिटी'],
  [/₹\s?/g, ''],
  [/\bRs\.?\s?/gi, ''],
  [/%/g, ' प्रतिशत'],
];

/**
 * Text as it should be spoken. For Hindi (any Devanagari in the text, or a Hindi
 * language code) numbers are converted to Hindi words; English replies are left
 * for the voice model to read.
 */
function toSpeech(text, language = '') {
  let out = String(text || '')
    .replace(/[*_#`]/g, '') // stray markdown
    .replace(/\s+/g, ' ')
    .trim();
  const hindi = DEVANAGARI.test(out) || /^(hi|hinglish)/i.test(language);
  if (!hindi) return out;

  for (const [re, rep] of EXPANSIONS) out = out.replace(re, rep);

  // 1,24,000 or 1,240.50 style amounts: read the value.
  out = out.replace(/\d{1,3}(?:,\d{2,3})+(?:\.\d+)?/g, (m) => {
    const [whole, frac] = m.replace(/,/g, '').split('.');
    return hindiNumber(Number(whole)) + (frac ? ` दशमलव ${digitsOneByOne(frac)}` : '');
  });
  // Long digit runs (phone, roll or application numbers): one digit at a time.
  out = out.replace(/\d{6,}/g, (m) => digitsOneByOne(m));
  // Remaining plain numbers, including years and decimals.
  out = out.replace(/\d+(?:\.\d+)?/g, (m) => {
    const [whole, frac] = m.split('.');
    return hindiNumber(Number(whole)) + (frac ? ` दशमलव ${digitsOneByOne(frac)}` : '');
  });
  return out.replace(/\s+/g, ' ').trim();
}

module.exports = { toSpeech, hindiNumber };
