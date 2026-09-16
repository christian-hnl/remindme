import type { Priority } from '@/types';

export interface ParsedTask {
  type: 'task';
  title: string;
  subjectName?: string;
  dueDate: string;
  estimatedMinutes: number;
  priority: Priority;
}

export interface ParsedTransaction {
  type: 'transaction';
  title: string;
  amount: number;
  category: string;
  txType: 'expense' | 'income';
}

export interface ParsedDeposit {
  type: 'deposit';
  amount: number;
  /** Free-text pot name; may be empty when the user only wrote "20€ sparen". */
  potName: string;
}

export type ParsedIntent = ParsedTask | ParsedTransaction | ParsedDeposit;

// Unicode regexes are built with the RegExp constructor: TypeScript rejects `u`-flag
// literals in this project setup, and `\p{L}` is needed so umlauts count as letters.
const re = (source: string, flags = 'iu') => new RegExp(source, flags);

/** Whole-word regex that treats umlauts as letters (JS `\b` is ASCII-only). */
const word = (source: string, flags = 'iu') => re(String.raw`(?<![\p{L}\d])(?:${source})(?![\p{L}\d])`, flags);

const SUBJECTS: [string, string][] = [
  ['mathematik|mathe', 'Mathe'],
  ['physik', 'Physik'],
  ['informatik|info', 'Informatik'],
  ['chemie', 'Chemie'],
  ['biologie|bio', 'Biologie'],
  ['deutsch', 'Deutsch'],
  ['englisch', 'Englisch'],
  ['latein', 'Latein'],
  ['französisch', 'Französisch'],
  ['spanisch', 'Spanisch'],
  ['geschichte', 'Geschichte'],
  ['geographie|erdkunde', 'Geographie'],
  ['bwl', 'BWL'],
  ['vwl', 'VWL'],
  ['sport', 'Sport'],
  ['musik', 'Musik'],
];

const CATEGORY_RULES: [RegExp, string][] = [
  [word('miete|strom|handy|versicherung|netflix|spotify|abo|fitnessstudio|gym'), 'Fixkosten'],
  [word('döner|kebab|kebap|mensa|pizza|restaurant|mcdonalds?|burger|kaffee|café|cafe|lieferando|mjam|essen gehen|sushi|eis'), 'Essen gehen'],
  [word('bäcker|bäckerei|supermarkt|essen|billa|spar|hofer|rewe|edeka|lidl|aldi|penny|lebensmittel|einkauf'), 'Lebensmittel'],
  [word('ticket|bahn|bus|tanken|taxi|uber|zug|öffis?|klimaticket'), 'Transport'],
  [word('kino|bier|bar|club|konzert|party|spiel|game|steam'), 'Freizeit'],
  [word('buch|bücher|kurs|schule|skript|heft|schulsachen'), 'Schule'],
  [word('shampoo|duschgel|dm|bipa|drogerie'), 'Drogerie'],
  [word('amazon|hoodie|schuhe|jacke|shirt|hose|kleidung'), 'Kleidung'],
  [word('geschenk|blumen'), 'Geschenke'],
];

const DEPOSIT_WORDS = 'sparen|spare|spart|einzahlen|einzahlung|zurücklegen|zurückgelegt|spartopf|sparschwein';
const INCOME_WORDS = 'gehalt|lohn|einnahme|taschengeld|bekommen|erhalten|zurückbekommen|verkauft';
const WEEKDAYS = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];

const AMOUNT_AFTER = re(String.raw`([+-]?)(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro?(?![\p{L}]))`);
const AMOUNT_BEFORE = re(String.raw`(?:€|euro?)\s*([+-]?)(\d+(?:[.,]\d{1,2})?)`);
const POT_TARGET = re(String.raw`(?:^|\s)(?:in|für|auf|zum|zur)\s+(?:den|das|die|meinen|mein|meine)?\s*(.+)$`);
const TIME_OF_DAY = re(String.raw`(?:(?<![\p{L}])(?:um|bis)\s+)?(?<![\d:.])([01]?\d|2[0-3])(?::([0-5]\d)(?:\s*uhr)?|\s*uhr)(?![\p{L}\d])`);
const DURATION = re(String.raw`(?<![\p{L}\d:.,])(\d+(?:[.,]\d+)?)\s*(minuten|min|m|stunden|stunde|std|h)\.?(?![\p{L}\d])`);
const EXPLICIT_DATE = re(String.raw`(?:(?<![\p{L}])(?:bis|am|zum)\s+)?(?<![\d.])(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(?!\d)`, 'u');

const tidy = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/^[\s,:;–-]+|[\s,:;–-]+$/g, '')
    .replace(/\s+(bis|am|um|für|in)$/i, '')
    .trim();

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function parseNaturalLanguage(input: string, now: Date = new Date()): ParsedIntent | null {
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  return parseMoney(text) ?? parseTask(text, now);
}

function parseMoney(text: string): ParsedTransaction | ParsedDeposit | null {
  const match = text.match(AMOUNT_AFTER) ?? text.match(AMOUNT_BEFORE);
  if (!match) return null;
  const amount = Math.abs(parseFloat(match[2].replace(',', '.')));
  if (!amount) return null;

  let rest = text.replace(match[0], ' ');

  if (word(DEPOSIT_WORDS).test(text)) {
    rest = rest.replace(word(DEPOSIT_WORDS, 'giu'), ' ');
    const target = rest.match(POT_TARGET);
    return { type: 'deposit', amount, potName: tidy(target ? target[1] : rest) };
  }

  const isIncome = match[1] === '+' || word(INCOME_WORDS).test(text);
  const category = isIncome
    ? 'Einkommen'
    : CATEGORY_RULES.find(([rule]) => rule.test(text))?.[1] ?? 'Sonstiges';

  const title = tidy(rest.replace(word('ausgabe|einnahme|bezahlt|gekauft|für|fürs', 'giu'), ' '));

  return {
    type: 'transaction',
    title: title ? capitalize(title) : isIncome ? 'Einnahme' : 'Ausgabe',
    amount,
    category,
    txType: isIncome ? 'income' : 'expense',
  };
}

function parseTask(text: string, now: Date): ParsedTask {
  let rest = text;
  const consume = (pattern: RegExp) => {
    const m = rest.match(pattern);
    if (m) rest = rest.replace(m[0], ' ');
    return m;
  };

  // Priority
  let priority: Priority = 'medium';
  if (consume(word(String.raw`prio\s*1|p1|dringend|urgent|sofort|asap`))) priority = 'urgent';
  else if (consume(word(String.raw`prio\s*2|p2|wichtig|hoch|high`))) priority = 'high';
  else if (consume(word(String.raw`prio\s*4|p4|niedrig|low|unwichtig`))) priority = 'low';
  else consume(word(String.raw`prio\s*3|p3`));

  // Time of day: "18:00", "18:00 Uhr", "18 Uhr"
  let hours: number | null = null;
  let minutes = 0;
  const time = consume(TIME_OF_DAY);
  if (time) {
    hours = parseInt(time[1], 10);
    minutes = time[2] ? parseInt(time[2], 10) : 0;
  }

  // Duration: "45min", "1,5h", "2 Std"
  let estimatedMinutes = 30;
  const duration = consume(DURATION);
  if (duration) {
    const value = parseFloat(duration[1].replace(',', '.'));
    const isHours = /^(stunde|std|h)/i.test(duration[2]);
    estimatedMinutes = Math.max(5, Math.round(isHours ? value * 60 : value));
  }

  // Due date
  const due = new Date(now);
  let hasExplicitDay = false;

  const relative = consume(word(String.raw`(?:bis\s+|für\s+|am\s+)?(übermorgen|morgen|heute)`));
  const explicit = relative ? null : consume(EXPLICIT_DATE);
  const weekday =
    relative || explicit
      ? null
      : consume(word(String.raw`(?:bis\s+|am\s+|zum\s+|nächsten\s+|nächster\s+)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)`)) ??
        consume(word(String.raw`(?:bis|am|ab|zum)\s+(mo|di|mi|do|fr|sa|so)\.?`));

  if (relative) {
    const offset = { heute: 0, morgen: 1, übermorgen: 2 }[relative[1].toLowerCase() as 'heute'] ?? 0;
    due.setDate(due.getDate() + offset);
    hasExplicitDay = true;
  } else if (explicit) {
    const day = parseInt(explicit[1], 10);
    const month = parseInt(explicit[2], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let year = explicit[3] ? parseInt(explicit[3], 10) : now.getFullYear();
      if (year < 100) year += 2000;
      due.setFullYear(year, month - 1, day);
      if (!explicit[3] && due < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        due.setFullYear(year + 1);
      }
      hasExplicitDay = true;
    }
  } else if (weekday) {
    const target = WEEKDAYS.findIndex((d) => d.startsWith(weekday[1].toLowerCase()));
    let diff = target - now.getDay();
    if (diff <= 0) diff += 7;
    due.setDate(now.getDate() + diff);
    hasExplicitDay = true;
  }

  due.setHours(hours ?? 18, hours === null ? 0 : minutes, 0, 0);
  if (!hasExplicitDay && due < now) due.setDate(due.getDate() + 1);

  // Subject (a leading subject word is removed from the title, it becomes a pill instead)
  let subjectName: string | undefined;
  for (const [pattern, canonical] of SUBJECTS) {
    const m = rest.match(word(pattern));
    if (!m) continue;
    subjectName = canonical;
    if (rest.trimStart().toLowerCase().startsWith(m[0].toLowerCase())) rest = rest.replace(m[0], ' ');
    break;
  }

  const title = tidy(rest);

  return {
    type: 'task',
    title: title ? capitalize(title) : subjectName ? `${subjectName} Aufgabe` : 'Neue Aufgabe',
    subjectName,
    dueDate: due.toISOString(),
    estimatedMinutes,
    priority,
  };
}
