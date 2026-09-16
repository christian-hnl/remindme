import { createPrivateKey, sign } from 'crypto';

const API_BASE = 'https://api.enablebanking.com';

export interface Credentials {
  appId: string;
  privateKey: string;
}

export class EnableBankingError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface Aspsp {
  name: string;
  country: string;
  logo?: string;
  psu_types?: string[];
  /** Seconds */
  maximum_consent_validity?: number;
  beta?: boolean;
}

export interface EbAccount {
  uid: string;
  account_id?: { iban?: string };
  name?: string;
  currency?: string;
  identification_hash?: string;
}

export interface EbTransaction {
  entry_reference?: string;
  transaction_id?: string;
  status?: 'BOOK' | 'PDNG' | string;
  credit_debit_indicator?: 'CRDT' | 'DBIT';
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  transaction_amount: { currency?: string; amount: string };
  creditor?: { name?: string };
  debtor?: { name?: string };
  creditor_account?: { iban?: string };
  debtor_account?: { iban?: string };
  remittance_information?: string[];
}

interface EbBalance {
  balance_amount: { currency?: string; amount: string };
  balance_type?: string;
}

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Every API call is authenticated with a short-lived RS256 JWT signed by the app's key. */
export function createJwt({ appId, privateKey }: Credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: appId }));
  const payload = base64url(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 }));
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), createPrivateKey(privateKey));
  return `${header}.${payload}.${base64url(signature)}`;
}

export function isValidPrivateKey(pem: string) {
  try {
    createPrivateKey(pem);
    return true;
  } catch {
    return false;
  }
}

function describeError(status: number, detail: string) {
  if (status === 401) return 'Enable Banking lehnt die Anmeldung ab – App-ID und Schlüssel prüfen.';
  if (status === 403) return 'Zugriff verweigert – die Bankfreigabe ist abgelaufen oder das Konto ist nicht mit der App verknüpft.';
  if (status === 429) return 'Die Bank erlaubt nur wenige Abrufe pro Tag. Bitte später erneut versuchen.';
  return `Enable Banking (${status}): ${detail || 'unbekannter Fehler'}`;
}

async function request<T>(
  credentials: Credentials,
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {}
): Promise<T> {
  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(init.query ?? {})) if (value) url.searchParams.set(key, value);

  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${createJwt(credentials)}`,
        Accept: 'application/json',
        ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    if (error instanceof Error && /key|pem|asn1|decoder/i.test(error.message)) {
      throw new EnableBankingError('Der gespeicherte Schlüssel ist ungültig.', 400);
    }
    throw new EnableBankingError('Enable Banking ist nicht erreichbar.', 0);
  }

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON error body
  }
  if (!response.ok) {
    const detail = data?.message ?? data?.detail ?? data?.error ?? text.slice(0, 200);
    throw new EnableBankingError(describeError(response.status, typeof detail === 'string' ? detail : JSON.stringify(detail)), response.status);
  }
  return data as T;
}

export const listAspsps = (credentials: Credentials, country: string) =>
  request<{ aspsps: Aspsp[] }>(credentials, '/aspsps', { query: { country } });

export const startAuthorization = (
  credentials: Credentials,
  input: { aspspName: string; country: string; redirectUrl: string; state: string; validUntil: Date }
) =>
  request<{ url: string; authorization_id: string }>(credentials, '/auth', {
    method: 'POST',
    body: {
      access: { valid_until: input.validUntil.toISOString() },
      aspsp: { name: input.aspspName, country: input.country },
      state: input.state,
      redirect_url: input.redirectUrl,
      psu_type: 'personal',
    },
  });

export const createSession = (credentials: Credentials, code: string) =>
  request<{ session_id: string; accounts: (EbAccount | string)[]; access: { valid_until: string } }>(credentials, '/sessions', {
    method: 'POST',
    body: { code },
  });

export const deleteSession = (credentials: Credentials, sessionId: string) =>
  request<unknown>(credentials, `/sessions/${sessionId}`, { method: 'DELETE' });

export const getAccountDetails = (credentials: Credentials, uid: string) =>
  request<EbAccount>(credentials, `/accounts/${uid}/details`);

export async function getBalance(credentials: Credentials, uid: string): Promise<number | null> {
  const { balances = [] } = await request<{ balances: EbBalance[] }>(credentials, `/accounts/${uid}/balances`);
  const preference = ['ITAV', 'CLAV', 'ITBD', 'CLBD', 'XPCD', 'OPAV', 'OPBD'];
  const sorted = [...balances].sort(
    (a, b) => (preference.indexOf(a.balance_type ?? '') + 1 || 99) - (preference.indexOf(b.balance_type ?? '') + 1 || 99)
  );
  const amount = sorted[0] ? parseFloat(sorted[0].balance_amount.amount) : NaN;
  return Number.isFinite(amount) ? amount : null;
}

export async function getTransactions(credentials: Credentials, uid: string, dateFrom: Date): Promise<EbTransaction[]> {
  const all: EbTransaction[] = [];
  let continuationKey: string | undefined;
  for (let page = 0; page < 40; page++) {
    const res = await request<{ transactions?: EbTransaction[]; continuation_key?: string }>(credentials, `/accounts/${uid}/transactions`, {
      query: { date_from: dateFrom.toISOString().slice(0, 10), continuation_key: continuationKey },
    });
    all.push(...(res.transactions ?? []));
    continuationKey = res.continuation_key || undefined;
    if (!continuationKey) break;
  }
  return all;
}
