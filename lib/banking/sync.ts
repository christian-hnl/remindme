import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import * as eb from './enablebanking';
import { categorize, detectKind } from './categorize';
import { getOwnIbans, storeTransactions, type IncomingTransaction } from './store';

const DAY = 86_400_000;
const DEFAULT_CONSENT_DAYS = 90;
const MAX_CONSENT_DAYS = 180;
const INITIAL_HISTORY_DAYS = 90;
/** Re-read a few days back on every sync: banks book card payments with delay. */
const OVERLAP_DAYS = 5;

export async function getCredentials(userId: string): Promise<eb.Credentials | null> {
  const envAppId = process.env['ENABLE_BANKING_APP_ID'];
  const envKey = process.env['ENABLE_BANKING_PRIVATE_KEY'];
  if (envAppId && envKey) return { appId: envAppId, privateKey: envKey.replace(/\\n/g, '\n') };

  const config = await db.bankingConfig.findUnique({ where: { userId } });
  return config?.appId && config.privateKey ? { appId: config.appId, privateKey: config.privateKey } : null;
}

async function requireCredentials(userId: string) {
  const credentials = await getCredentials(userId);
  if (!credentials) throw new eb.EnableBankingError('Enable Banking ist noch nicht eingerichtet – App-ID und Schlüssel fehlen.', 400);
  return credentials;
}

/** Starts the bank's consent flow and returns the URL the browser has to open. */
export async function startConnection(userId: string, aspsp: { name: string; country: string }, redirectUrl: string) {
  const credentials = await requireCredentials(userId);
  const list = await eb.listAspsps(credentials, aspsp.country).catch(() => null);
  const info = list?.aspsps.find((a) => a.name === aspsp.name);
  const maxSeconds = info?.maximum_consent_validity && info.maximum_consent_validity > 0 ? info.maximum_consent_validity : DEFAULT_CONSENT_DAYS * 86_400;
  const validUntil = new Date(Date.now() + Math.min(maxSeconds, MAX_CONSENT_DAYS * 86_400) * 1000 - 60_000);

  const state = randomBytes(24).toString('hex');
  const auth = await eb.startAuthorization(credentials, { aspspName: aspsp.name, country: aspsp.country, redirectUrl, state, validUntil });
  await db.bankConnection.create({
    data: { userId, aspspName: aspsp.name, aspspCountry: aspsp.country, authState: state, status: 'pending' },
  });
  return auth.url;
}

/** Handles the redirect back from the bank: creates the session, stores accounts, fetches bookings. */
export async function completeConnection(userId: string, state: string, code: string) {
  const connection = await db.bankConnection.findFirst({ where: { userId, authState: state } });
  if (!connection) throw new eb.EnableBankingError('Diese Freigabe ist unbekannt oder wurde schon verwendet. Bitte erneut verbinden.', 400);

  const credentials = await requireCredentials(userId);
  const session = await eb.createSession(credentials, code);

  await db.bankConnection.update({
    where: { id: connection.id },
    data: { sessionId: session.session_id, validUntil: new Date(session.access.valid_until), status: 'active', authState: null, lastError: null },
  });

  for (const entry of session.accounts) {
    const account = typeof entry === 'string' ? await eb.getAccountDetails(credentials, entry) : entry;
    // identification_hash survives re-authorisation; the uid changes with every session.
    const externalKey = `eb:${account.identification_hash ?? account.uid}`;
    const iban = account.account_id?.iban ?? null;
    await db.bankAccount.upsert({
      where: { userId_externalKey: { userId, externalKey } },
      update: { connectionId: connection.id, providerAccountId: account.uid, iban, currency: account.currency ?? 'EUR' },
      create: {
        userId,
        connectionId: connection.id,
        providerAccountId: account.uid,
        externalKey,
        source: 'enablebanking',
        name: account.name || `${connection.aspspName}${iban ? ` ···${iban.slice(-4)}` : ''}`,
        iban,
        currency: account.currency ?? 'EUR',
      },
    });
  }

  // A re-authorised bank replaces its previous (expired) connection.
  const previous = await db.bankConnection.findMany({
    where: { userId, aspspName: connection.aspspName, aspspCountry: connection.aspspCountry, id: { not: connection.id } },
  });
  for (const old of previous) {
    if (old.sessionId) await eb.deleteSession(credentials, old.sessionId).catch(() => undefined);
    await db.bankConnection.delete({ where: { id: old.id } });
  }

  return syncConnection(userId, connection.id);
}

function toIncoming(accountKey: string, t: eb.EbTransaction): IncomingTransaction | null {
  const raw = parseFloat(t.transaction_amount?.amount ?? '');
  if (!Number.isFinite(raw) || raw === 0) return null;
  const amount = t.credit_debit_indicator === 'DBIT' ? -Math.abs(raw) : Math.abs(raw);

  const day = (t.booking_date ?? t.value_date ?? t.transaction_date)?.slice(0, 10);
  if (!day) return null;
  const [y, m, d] = day.split('-').map(Number);

  const counterparty = (amount < 0 ? t.creditor?.name : t.debtor?.name) ?? null;
  const counterpartyIban = (amount < 0 ? t.creditor_account?.iban : t.debtor_account?.iban) ?? null;
  const description = (t.remittance_information ?? []).join(' ').replace(/\s+/g, ' ').trim() || null;
  const reference =
    t.entry_reference ||
    t.transaction_id ||
    createHash('sha1').update([day, t.transaction_amount.amount, t.credit_debit_indicator, counterparty, description].join('|')).digest('hex').slice(0, 24);
  const text = [counterparty, description].filter(Boolean).join(' ');

  return {
    externalId: `${accountKey}:${reference}`,
    date: new Date(y, m - 1, d, 12),
    amount,
    currency: t.transaction_amount.currency ?? 'EUR',
    title: counterparty ?? description?.slice(0, 80) ?? (amount < 0 ? 'Ausgabe' : 'Eingang'),
    counterparty,
    counterpartyIban,
    description,
    category: categorize(text, amount),
    type: detectKind(text, amount, null),
  };
}

export async function syncConnection(userId: string, connectionId: string) {
  const connection = await db.bankConnection.findFirst({ where: { id: connectionId, userId }, include: { accounts: true } });
  if (!connection?.sessionId) return { created: 0, duplicates: 0 };
  if (connection.validUntil && connection.validUntil < new Date()) {
    await db.bankConnection.update({ where: { id: connection.id }, data: { status: 'expired' } });
    throw new eb.EnableBankingError('Die Bankfreigabe ist abgelaufen – bitte neu verbinden.', 403);
  }

  const credentials = await requireCredentials(userId);
  const ownIbans = await getOwnIbans(userId);
  let created = 0;
  let duplicates = 0;

  try {
    for (const account of connection.accounts) {
      if (!account.providerAccountId) continue;
      const since = account.lastImportAt
        ? new Date(account.lastImportAt.getTime() - OVERLAP_DAYS * DAY)
        : new Date(Date.now() - INITIAL_HISTORY_DAYS * DAY);

      const [balance, transactions] = await Promise.all([
        eb.getBalance(credentials, account.providerAccountId).catch(() => null),
        eb.getTransactions(credentials, account.providerAccountId, since),
      ]);

      // Pending bookings change their ids once booked – only store booked ones.
      const rows = transactions
        .filter((t) => t.status !== 'PDNG')
        .map((t) => toIncoming(account.externalKey, t))
        .filter((t): t is IncomingTransaction => t !== null);

      const result = await storeTransactions(userId, account, rows, ownIbans);
      created += result.created;
      duplicates += result.duplicates;

      await db.bankAccount.update({
        where: { id: account.id },
        data: { lastImportAt: new Date(), ...(balance !== null && { balance, balanceUpdatedAt: new Date() }) },
      });
    }
    await db.bankConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date(), lastError: null, status: 'active' } });
  } catch (error) {
    const status = error instanceof eb.EnableBankingError && error.status === 403 ? 'expired' : 'error';
    await db.bankConnection.update({
      where: { id: connection.id },
      data: { status, lastError: error instanceof Error ? error.message : 'Abruf fehlgeschlagen' },
    });
    throw error;
  }

  return { created, duplicates };
}

export async function syncAllConnections(userId: string) {
  const connections = await db.bankConnection.findMany({ where: { userId, status: { in: ['active', 'error'] }, sessionId: { not: null } } });
  let created = 0;
  let duplicates = 0;
  const errors: { bank: string; message: string }[] = [];
  for (const connection of connections) {
    try {
      const result = await syncConnection(userId, connection.id);
      created += result.created;
      duplicates += result.duplicates;
    } catch (error) {
      errors.push({ bank: connection.aspspName, message: error instanceof Error ? error.message : 'Abruf fehlgeschlagen' });
    }
  }
  return { created, duplicates, errors, connections: connections.length };
}

export async function removeConnection(userId: string, connectionId: string) {
  const connection = await db.bankConnection.findFirst({ where: { id: connectionId, userId } });
  if (!connection) return false;
  const credentials = await getCredentials(userId);
  if (credentials && connection.sessionId) await eb.deleteSession(credentials, connection.sessionId).catch(() => undefined);
  await db.bankConnection.delete({ where: { id: connection.id } });
  return true;
}
