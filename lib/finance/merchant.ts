/** Whole words only – \b does not understand umlauts, so use letter lookarounds. */
const words = (source: string) => new RegExp(String.raw`(?<![\p{L}\d])(?:${source})(?![\p{L}\d])`, 'giu');

const NOISE = words(
  String.raw`sagt danke|dankt|filiale|fil|gmbh|ges\.?m\.?b\.?h|ag|kg|og|se|ab|e\.?u|inc|ltd|llc|sarl|bv|com|at|de|www|payment|zahlung|kartenzahlung|pos|debit|mastercard|visa|maestro|nfc|apple pay|google pay|wien|graz|linz|salzburg|innsbruck|klagenfurt|villach|wels|st|pölten|poelten|dornbirn|steyr|krems|baden|amstetten|mödling|leoben|bregenz|eisenstadt|austria|österreich`
);
const NON_LETTERS = new RegExp(String.raw`[^\p{L}\s&]+`, 'gu');

/**
 * Reduces a booking text to a stable merchant key:
 * "BILLA DANKT 1234 WIEN" and "Billa Filiale 88" both become "billa".
 */
export function merchantKey(counterparty: string | null | undefined, title?: string | null) {
  const raw = (counterparty || title || '').toLowerCase();
  const cleaned = raw
    .replace(/\b[a-z]{2}\d{2}[a-z0-9]{8,}\b/g, ' ') // IBAN / references
    .replace(NON_LETTERS, ' ')
    .replace(NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(' ').filter((w) => w.length > 1);
  return parts.slice(0, 2).join(' ') || raw.trim().slice(0, 40);
}

const LABEL_NOISE = words(String.raw`sagt danke|dankt|filiale|fil\.?|kartenzahlung|pos|nfc`);
const NUMBERS = new RegExp(String.raw`(?<!\p{L})\d[\d./:-]*|\*+`, 'gu');
const STRAY_PUNCTUATION = new RegExp(String.raw`(^|\s)[^\p{L}\d\s]+(?=\s|$)`, 'gu');
const WORD_START = new RegExp(String.raw`(^|[\s\-/&])(\p{L})`, 'gu');

/** Readable merchant name for lists: "BILLA DANKT 1001" → "Billa". */
export function merchantLabel(counterparty: string | null | undefined, title?: string | null) {
  const raw = (counterparty || title || 'Unbekannt').replace(/\s+/g, ' ').trim();
  let text = raw.replace(LABEL_NOISE, ' ').replace(NUMBERS, ' ').replace(STRAY_PUNCTUATION, ' ').replace(/\s+/g, ' ').trim() || raw;
  // Shouting bank exports → Title Case, but keep short acronyms like "ÖBB".
  if (text === text.toUpperCase() && /\p{L}{5,}/u.test(text)) {
    text = text.toLowerCase().replace(WORD_START, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
  }
  return text.length > 40 ? `${text.slice(0, 38)}…` : text;
}
