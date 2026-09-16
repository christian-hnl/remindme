import { db } from '@/lib/db';
import type { TransactionKind } from './categorize';

export interface IncomingTransaction {
  /** Stable id used to recognise the same booking on the next sync or re-import. */
  externalId: string;
  date: Date;
  amount: number;
  currency: string;
  title: string;
  counterparty: string | null;
  counterpartyIban: string | null;
  description: string | null;
  category: string;
  type: TransactionKind;
}

const DAY = 86_400_000;

export const normalizeIban = (iban: string) => iban.replace(/\s/g, '').toUpperCase();

export async function getOwnIbans(userId: string) {
  const accounts = await db.bankAccount.findMany({ where: { userId, iban: { not: null } }, select: { iban: true } });
  return new Set(accounts.map((a) => normalizeIban(a.iban!)));
}

/**
 * Drops bookings that are already stored: same external id, or the same amount within
 * two days on another account/source (e.g. George live and a Finanzguru export of George,
 * or a manually entered expense).
 */
export async function filterNewTransactions(userId: string, accountId: string | null, rows: IncomingTransaction[]) {
  if (rows.length === 0) return { fresh: [] as IncomingTransaction[], duplicates: 0 };

  const existingIds = new Set<string>();
  const ids = rows.map((r) => r.externalId);
  for (let i = 0; i < ids.length; i += 400) {
    const found = await db.transaction.findMany({
      where: { userId, externalId: { in: ids.slice(i, i + 400) } },
      select: { externalId: true },
    });
    for (const f of found) if (f.externalId) existingIds.add(f.externalId);
  }

  const times = rows.map((r) => r.date.getTime());
  const candidates = await db.transaction.findMany({
    where: {
      userId,
      type: { notIn: ['transfer_to_pot', 'transfer_from_pot'] },
      transactionDate: { gte: new Date(Math.min(...times) - 2 * DAY), lte: new Date(Math.max(...times) + 2 * DAY) },
      ...(accountId ? { OR: [{ bankAccountId: null }, { bankAccountId: { not: accountId } }] } : {}),
    },
    select: { amount: true, transactionDate: true },
  });
  const pool = new Map<number, number[]>();
  for (const c of candidates) {
    const cents = Math.round(c.amount * 100);
    pool.set(cents, [...(pool.get(cents) ?? []), c.transactionDate.getTime()]);
  }

  const fresh: IncomingTransaction[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    if (existingIds.has(row.externalId) || seen.has(row.externalId)) {
      duplicates++;
      continue;
    }
    const dates = pool.get(Math.round(row.amount * 100));
    const match = dates?.findIndex((t) => Math.abs(t - row.date.getTime()) <= 2 * DAY) ?? -1;
    if (dates && match >= 0) {
      dates.splice(match, 1);
      duplicates++;
      continue;
    }
    seen.add(row.externalId);
    fresh.push(row);
  }
  return { fresh, duplicates };
}

export async function storeTransactions(
  userId: string,
  account: { id: string; source: string },
  rows: IncomingTransaction[],
  ownIbans: Set<string>
) {
  const { fresh, duplicates } = await filterNewTransactions(userId, account.id, rows);

  const data = fresh.map((r) => {
    const toOwnAccount = r.counterpartyIban ? ownIbans.has(normalizeIban(r.counterpartyIban)) : false;
    const type = toOwnAccount ? 'transfer' : r.type;
    return {
      userId,
      bankAccountId: account.id,
      source: account.source,
      externalId: r.externalId,
      title: r.title.slice(0, 120),
      amount: Math.round(r.amount * 100) / 100,
      category: type === 'transfer' ? 'Umbuchung' : type === 'investment' ? 'Sparen & Anlegen' : r.category,
      type,
      counterparty: r.counterparty?.slice(0, 120) ?? null,
      description: r.description?.slice(0, 500) ?? null,
      transactionDate: r.date,
    };
  });

  for (let i = 0; i < data.length; i += 400) {
    await db.transaction.createMany({ data: data.slice(i, i + 400) });
  }
  return { created: data.length, duplicates };
}
