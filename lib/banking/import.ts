import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { ImportError, readTable, type Cell } from './table';
import { categorize, detectKind, isOutflowType, mapFinanzguruCategory } from './categorize';
import { filterNewTransactions, getOwnIbans, storeTransactions, type IncomingTransaction } from './store';

export { ImportError };

export type ImportProfile = 'george' | 'traderepublic' | 'finanzguru' | 'generic';

export const PROFILE_LABELS: Record<ImportProfile, string> = {
  george: 'George-Export',
  traderepublic: 'Trade-Republic-Export',
  finanzguru: 'Finanzguru-Export',
  generic: 'Kontoauszug',
};

const DEFAULT_ACCOUNT: Record<ImportProfile, string> = {
  george: 'George',
  traderepublic: 'Trade Republic',
  finanzguru: 'Finanzguru',
  generic: 'Importiertes Konto',
};

type Field =
  | 'date'
  | 'amount'
  | 'debit'
  | 'credit'
  | 'currency'
  | 'account'
  | 'category'
  | 'subcategory'
  | 'counterparty'
  | 'counterpartyIban'
  | 'id'
  | 'type'
  | 'description'
  | 'description2';

/** Header names (normalised: lowercase, umlauts spelled out, no punctuation). */
const SYNONYMS: Record<Field, string[]> = {
  date: ['buchungsdatum', 'buchungstag', 'datum', 'date', 'booking', 'bookingdate', 'valutadatum', 'valuta', 'wertstellung', 'transactiondate', 'ausfuehrungsdatum', 'zeitpunkt', 'timestamp'],
  amount: ['betrag', 'amount', 'amountvalue', 'umsatz', 'betrageur', 'wert', 'value', 'summe'],
  debit: ['soll', 'ausgang', 'belastung', 'debit'],
  credit: ['haben', 'eingang', 'gutschrift', 'credit'],
  currency: ['waehrung', 'currency', 'amountcurrency', 'whrg'],
  account: ['namereferenzkonto', 'referenzkonto', 'kontoname', 'accountname'],
  category: ['analysehauptkategorie', 'hauptkategorie', 'kategorie', 'category'],
  subcategory: ['analyseunterkategorie', 'unterkategorie', 'subcategory'],
  counterparty: ['partnername', 'beguenstigterauftraggeber', 'beguenstigter', 'auftraggeber', 'empfaenger', 'zahlungsempfaenger', 'name', 'payee', 'counterparty', 'partner', 'gegenpartei', 'haendler', 'merchant'],
  counterpartyIban: ['partneriban', 'partneraccountiban', 'ibanbeguenstigterauftraggeber', 'gegenkontoiban', 'counterpartyiban'],
  id: ['umsatzid', 'transaktionsid', 'transactionid', 'id', 'buchungsreferenz', 'entryreference'],
  type: ['typ', 'type', 'transaktionstyp', 'transactiontype', 'umsatzart', 'art'],
  description: ['verwendungszweck', 'zahlungsreferenz', 'reference', 'beschreibung', 'description', 'text', 'details', 'notiz', 'memo', 'zweck'],
  description2: ['buchungstext', 'bookingtext', 'transaktionstext', 'additionaltext', 'receiverreference'],
};

const FIELD_ORDER: Field[] = ['date', 'amount', 'account', 'category', 'subcategory', 'counterpartyIban', 'counterparty', 'id', 'type', 'currency', 'debit', 'credit', 'description', 'description2'];

export const normalizeHeader = (header: string) =>
  header
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');

function mapColumns(row: Cell[]) {
  const names = row.map((c) => normalizeHeader(c === null ? '' : String(c)));
  const used = new Set<number>();
  const result: Partial<Record<Field, number>> = {};
  for (const field of FIELD_ORDER) {
    let index = -1;
    for (const synonym of SYNONYMS[field]) {
      index = names.findIndex((n, i) => !used.has(i) && n === synonym);
      if (index >= 0) break;
    }
    if (index < 0) {
      for (const synonym of SYNONYMS[field].filter((s) => s.length >= 6)) {
        index = names.findIndex((n, i) => !used.has(i) && n.includes(synonym));
        if (index >= 0) break;
      }
    }
    if (index >= 0) {
      result[field] = index;
      used.add(index);
    }
  }
  return result;
}

export function parseMoney(value: Cell): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value instanceof Date) return null;
  let s = String(value).trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[€$£\s']|EUR|USD|CHF/gi, '').replace(/[−–]/g, '-');
  if (s.endsWith('-')) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
  else if (lastComma >= 0) s = s.replace(/,/g, '');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  if (!s || !Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** Dates are stored at local noon so time zones never shift the booking day. */
export function parseDateCell(value: Cell): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12);
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);
  }
  if (value === null) return null;
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (m) return validDate(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  return null;
}

function validDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day, 12);
}

function detectProfile(headers: string[], filename: string): ImportProfile {
  if (headers.includes('analysehauptkategorie') || headers.includes('namereferenzkonto')) return 'finanzguru';
  if (/trade.?republic/i.test(filename) || headers.includes('isin')) return 'traderepublic';
  if (/george|erste|sparkasse/i.test(filename) || headers.some((h) => h.startsWith('partner'))) return 'george';
  return 'generic';
}

export interface ImportedTransaction extends IncomingTransaction {
  accountName: string;
}

export interface ParsedImport {
  profile: ImportProfile;
  columns: Partial<Record<Field, string>>;
  transactions: ImportedTransaction[];
  skippedRows: number;
}

const hash = (value: string) => createHash('sha1').update(value).digest('hex').slice(0, 24);

export async function parseImportFile(buffer: Buffer, filename: string): Promise<ParsedImport> {
  const table = await readTable(buffer, filename);
  if (table.length < 2) throw new ImportError('Die Datei enthält keine Umsätze.');

  let headerIndex = -1;
  let mapping: Partial<Record<Field, number>> = {};
  for (let i = 0; i < Math.min(25, table.length); i++) {
    const candidate = mapColumns(table[i]);
    const hasAmount = candidate.amount !== undefined || candidate.debit !== undefined || candidate.credit !== undefined;
    if (candidate.date !== undefined && hasAmount && Object.keys(candidate).length > Object.keys(mapping).length) {
      headerIndex = i;
      mapping = candidate;
    }
  }
  if (headerIndex < 0) {
    throw new ImportError('Keine Spalten für Datum und Betrag gefunden. Unterstützt werden Exporte von George, Trade Republic, Finanzguru und Kontoauszüge mit Datum- und Betragsspalte.');
  }

  const headers = table[headerIndex].map((h) => (h === null ? '' : String(h)));
  const normalized = headers.map(normalizeHeader);
  const profile = detectProfile(normalized, filename);
  const precisionIndex = normalized.indexOf('amountprecision');

  const get = (row: Cell[], field: Field) => (mapping[field] === undefined ? null : row[mapping[field]!] ?? null);
  const text = (value: Cell) => (value === null || value instanceof Date ? null : String(value).trim() || null);

  interface Raw {
    date: Date;
    amount: number;
    row: Cell[];
  }
  const raws: Raw[] = [];
  let skippedRows = 0;

  for (const row of table.slice(headerIndex + 1)) {
    const date = parseDateCell(get(row, 'date'));
    let amount = parseMoney(get(row, 'amount'));
    if (amount !== null && precisionIndex >= 0 && typeof get(row, 'amount') === 'number') {
      const precision = Number(row[precisionIndex]);
      if (Number.isInteger(precision) && precision > 0) amount = amount / 10 ** precision;
    }
    if (amount === null) {
      const debit = parseMoney(get(row, 'debit'));
      const credit = parseMoney(get(row, 'credit'));
      if (debit !== null || credit !== null) amount = (credit ?? 0) - Math.abs(debit ?? 0);
    }
    if (!date || amount === null || amount === 0) {
      skippedRows++;
      continue;
    }
    raws.push({ date, amount, row });
  }

  // Trade Republic sometimes lists outflows unsigned; only fix that if the file has no negatives at all.
  const unsignedOutflows = profile === 'traderepublic' && raws.every((r) => r.amount > 0);
  const occurrences = new Map<string, number>();

  const transactions = raws.map(({ date, amount: rawAmount, row }) => {
    const typeText = text(get(row, 'type'));
    const amount = unsignedOutflows && isOutflowType(typeText) ? -rawAmount : rawAmount;
    const counterparty = text(get(row, 'counterparty'));
    const description = [text(get(row, 'description')), text(get(row, 'description2'))].filter(Boolean).join(' · ') || null;
    const accountName = (text(get(row, 'account')) ?? DEFAULT_ACCOUNT[profile]).slice(0, 80);
    const currency = (text(get(row, 'currency')) ?? 'EUR').toUpperCase().slice(0, 3);
    const haystack = [counterparty, description, typeText].filter(Boolean).join(' ');

    let type = detectKind(haystack, amount, typeText);
    let category = categorize(haystack, amount);
    if (profile === 'finanzguru') {
      const mapped = mapFinanzguruCategory(text(get(row, 'category')), text(get(row, 'subcategory')), amount);
      if (mapped.category) category = mapped.category;
      if (mapped.type) type = mapped.type;
    }

    // Same booking twice on one day (two coffees) stays two rows; re-importing the file yields the same ids.
    const rawId = text(get(row, 'id'));
    let externalId: string;
    if (rawId) {
      externalId = `${profile}:${accountName}:${rawId}`;
    } else {
      const key = [accountName, date.toDateString(), amount.toFixed(2), counterparty, description].join('|');
      const n = (occurrences.get(key) ?? 0) + 1;
      occurrences.set(key, n);
      externalId = `${profile}:${hash(`${key}#${n}`)}`;
    }

    return {
      externalId,
      accountName,
      date,
      amount,
      currency,
      title: counterparty ?? description?.slice(0, 80) ?? typeText ?? (amount < 0 ? 'Ausgabe' : 'Eingang'),
      counterparty,
      counterpartyIban: text(get(row, 'counterpartyIban')),
      description,
      category,
      type,
    };
  });

  if (transactions.length === 0) throw new ImportError('In der Datei wurden keine gültigen Umsätze gefunden.');

  const columns: Partial<Record<Field, string>> = {};
  for (const [field, index] of Object.entries(mapping) as [Field, number][]) columns[field] = headers[index];

  return { profile, columns, transactions, skippedRows };
}

const accountKey = (profile: ImportProfile, name: string) => `${profile === 'generic' ? 'file' : profile}:${name}`;

export async function previewImport(userId: string, parsed: ParsedImport) {
  const names = Array.from(new Set(parsed.transactions.map((t) => t.accountName)));
  const accounts = [];
  for (const name of names) {
    const rows = parsed.transactions.filter((t) => t.accountName === name);
    const existing = await db.bankAccount.findUnique({
      where: { userId_externalKey: { userId, externalKey: accountKey(parsed.profile, name) } },
      select: { id: true },
    });
    const { fresh, duplicates } = await filterNewTransactions(userId, existing?.id ?? '__new__', rows);
    const times = rows.map((r) => r.date.getTime());
    accounts.push({
      name,
      count: rows.length,
      newCount: fresh.length,
      duplicates,
      from: new Date(Math.min(...times)).toISOString(),
      to: new Date(Math.max(...times)).toISOString(),
      exists: !!existing,
    });
  }

  const sample = [...parsed.transactions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8)
    .map((t) => ({ date: t.date.toISOString(), title: t.title, category: t.category, type: t.type, amount: t.amount, accountName: t.accountName }));

  return {
    profile: parsed.profile,
    profileLabel: PROFILE_LABELS[parsed.profile],
    columns: parsed.columns,
    skippedRows: parsed.skippedRows,
    accounts,
    sample,
  };
}

export async function commitImport(userId: string, parsed: ParsedImport, accountNames: string[]) {
  const source = parsed.profile === 'generic' ? 'file' : parsed.profile;
  const ownIbans = await getOwnIbans(userId);
  let created = 0;
  let duplicates = 0;

  for (const name of accountNames) {
    const rows = parsed.transactions.filter((t) => t.accountName === name);
    if (rows.length === 0) continue;
    const externalKey = accountKey(parsed.profile, name);
    const account = await db.bankAccount.upsert({
      where: { userId_externalKey: { userId, externalKey } },
      update: {},
      create: { userId, source, externalKey, name, currency: rows[0].currency },
    });
    const result = await storeTransactions(userId, account, rows, ownIbans);
    created += result.created;
    duplicates += result.duplicates;
    await db.bankAccount.update({ where: { id: account.id }, data: { lastImportAt: new Date() } });
  }

  return { created, duplicates };
}
