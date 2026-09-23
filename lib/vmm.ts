import { db } from '@/lib/db';

/**
 * "View My Marks" – the school's grade portal (Django + Angular). It has no password login:
 * you ask for a mail, the mail carries a one-time token, and that token turns into a session
 * cookie. We keep that cookie server-side and read the grades with it.
 */
const BASE = 'https://vmm.htlstp.ac.at';
const TIMEOUT_MS = 20_000;

export interface VmmMark {
  id?: string | number;
  title: string;
  value: string | number | null;
  weight: number | null;
  date: string | null;
  category: string | null;
  /** Everything VMM sent, so nothing is lost if their format changes. */
  raw: Record<string, unknown>;
}

export interface VmmGroupData {
  externalId: string;
  name: string;
  subjectName: string | null;
  teacher: string | null;
  average: number | null;
  marks: VmmMark[];
}

const cookieHeader = (parts: Record<string, string | null | undefined>) =>
  Object.entries(parts)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

/** Reads one cookie out of a response's Set-Cookie headers. */
function readCookie(response: Response, name: string): string | null {
  const headers = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [response.headers.get('set-cookie') ?? ''];
  for (const header of headers) {
    const match = header?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function call(path: string, init: RequestInit = {}) {
  try {
    return await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Accept: 'application/json', Referer: `${BASE}/`, Origin: BASE, ...(init.headers ?? {}) },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error('View My Marks ist nicht erreichbar – bist du online?');
  }
}

/** Django protects POSTs with a CSRF token that comes from a plain GET first. */
async function freshCsrf(): Promise<string> {
  const response = await call('/api/auth/logged-in/');
  const token = readCookie(response, 'csrftoken');
  if (!token) throw new Error('View My Marks hat kein CSRF-Token geliefert.');
  return token;
}

/** Step 1: asks VMM to send the login link to this address. */
export async function requestLoginMail(email: string) {
  const csrf = await freshCsrf();
  const response = await call('/api/auth/get-mail/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf, Cookie: cookieHeader({ csrftoken: csrf }) },
    body: JSON.stringify({ email }),
  });
  if (response.status === 404) throw new Error('Diese Adresse kennt View My Marks nicht.');
  if (!response.ok) throw new Error(`View My Marks lehnt die Anfrage ab (HTTP ${response.status}).`);
  return { csrf };
}

/** Accepts the whole link out of the mail or just the token inside it. */
export function extractToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = trimmed.match(/[?&]token=([^&\s]+)/);
  if (fromUrl) return decodeURIComponent(fromUrl[1]);
  // A bare token: no spaces, no slashes.
  return /^[A-Za-z0-9._-]{10,}$/.test(trimmed) ? trimmed : null;
}

/** Step 2: turns the token from the mail into a session we can keep using. */
export async function connectWithToken(userId: string, token: string) {
  const csrf = await freshCsrf();
  const response = await call(`/api/auth/login/?token=${encodeURIComponent(token)}`, {
    headers: { Cookie: cookieHeader({ csrftoken: csrf }), 'X-CSRFToken': csrf },
  });
  if (!response.ok && response.status !== 302) {
    throw new Error('Der Link ist abgelaufen oder wurde schon benutzt – fordere einen neuen an.');
  }

  const sessionId = readCookie(response, 'sessionid');
  if (!sessionId) throw new Error('View My Marks hat keine Sitzung geöffnet – fordere einen neuen Link an.');
  const newCsrf = readCookie(response, 'csrftoken') ?? csrf;

  const profile = await call('/api/auth/logged-in/', { headers: { Cookie: cookieHeader({ sessionid: sessionId, csrftoken: newCsrf }) } });
  const data = profile.ok ? ((await profile.json().catch(() => null)) as { username?: string; role?: string } | null) : null;
  if (!data?.role) throw new Error('Anmeldung hat nicht geklappt – fordere einen neuen Link an.');

  return db.vmmConfig.update({
    where: { userId },
    data: { sessionId, csrfToken: newCsrf, username: data.username ?? null, role: data.role ?? null, lastError: null },
  });
}

async function authorized(config: { sessionId: string | null; csrfToken: string | null }, path: string) {
  if (!config.sessionId) throw new Error('Noch nicht mit View My Marks verbunden.');
  const response = await call(path, { headers: { Cookie: cookieHeader({ sessionid: config.sessionId, csrftoken: config.csrfToken }) } });
  if (response.status === 401 || response.status === 403) {
    throw new Error('Die Sitzung ist abgelaufen – fordere einen neuen Login-Link an.');
  }
  if (!response.ok) throw new Error(`View My Marks antwortet mit HTTP ${response.status}.`);
  return response.json().catch(() => null);
}

const asArray = (value: unknown): any[] => (Array.isArray(value) ? value : Array.isArray((value as any)?.results) ? (value as any).results : []);

const pick = (row: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const toNumber = (value: unknown) => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** VMM's field names aren't documented – map defensively and keep the raw row. */
function normalizeMark(row: Record<string, any>): VmmMark {
  return {
    id: pick(row, ['id', 'pk', 'uuid']) ?? undefined,
    title: String(pick(row, ['name', 'title', 'description', 'column_name', 'competence']) ?? 'Note'),
    value: pick(row, ['mark', 'grade', 'value', 'points', 'score']),
    weight: toNumber(pick(row, ['weight', 'weighting', 'factor'])),
    date: (pick(row, ['date', 'created_at', 'created', 'timestamp', 'day']) as string) ?? null,
    category: (pick(row, ['category', 'category_name', 'type', 'kind']) as string) ?? null,
    raw: row,
  };
}

function normalizeGroup(row: Record<string, any>): VmmGroupData {
  return {
    externalId: String(pick(row, ['id', 'pk', 'uuid']) ?? pick(row, ['name']) ?? ''),
    name: String(pick(row, ['name', 'title', 'group_name']) ?? 'Gruppe'),
    subjectName: (pick(row, ['subject', 'subject_name', 'subject_long']) as string) ?? null,
    teacher: (() => {
      const teachers = row?.teachers ?? row?.teacher;
      if (Array.isArray(teachers)) {
        return teachers.map((t: any) => (typeof t === 'string' ? t : [t?.first_name, t?.last_name].filter(Boolean).join(' '))).filter(Boolean).join(', ') || null;
      }
      return typeof teachers === 'string' ? teachers : null;
    })(),
    average: toNumber(pick(row, ['average', 'avg', 'mark_average', 'grade'])),
    marks: [],
  };
}

/** Loads every group with its marks and stores them, so they stay readable offline. */
export async function syncVmm(userId: string) {
  const config = await db.vmmConfig.findUnique({ where: { userId } });
  if (!config?.sessionId) throw new Error('Noch nicht mit View My Marks verbunden.');

  try {
    const groups = asArray(await authorized(config, '/api/students/groups/')).map(normalizeGroup).filter((g) => g.externalId);

    for (const group of groups) {
      const marks = await authorized(config, `/api/students/groups/${encodeURIComponent(group.externalId)}/marks/`).catch(() => null);
      group.marks = asArray(marks).map(normalizeMark);
      if (group.average === null) {
        const numbers = group.marks.map((m) => toNumber(m.value)).filter((n): n is number => n !== null && n >= 1 && n <= 5);
        group.average = numbers.length ? Math.round((numbers.reduce((s, n) => s + n, 0) / numbers.length) * 100) / 100 : null;
      }

      await db.vmmGroup.upsert({
        where: { configId_externalId: { configId: config.id, externalId: group.externalId } },
        update: { name: group.name, subjectName: group.subjectName, teacher: group.teacher, average: group.average, marks: JSON.stringify(group.marks) },
        create: {
          configId: config.id,
          externalId: group.externalId,
          name: group.name,
          subjectName: group.subjectName,
          teacher: group.teacher,
          average: group.average,
          marks: JSON.stringify(group.marks),
        },
      });
    }

    // Groups that vanished in VMM shouldn't linger here.
    await db.vmmGroup.deleteMany({ where: { configId: config.id, externalId: { notIn: groups.map((g) => g.externalId) } } });
    await db.vmmConfig.update({ where: { id: config.id }, data: { lastSyncAt: new Date(), lastError: null } });

    return { groups: groups.length, marks: groups.reduce((sum, g) => sum + g.marks.length, 0) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await db.vmmConfig.update({ where: { id: config.id }, data: { lastError: message } });
    throw error;
  }
}

/** Config as sent to the browser – the session cookie never goes with it. */
export function toSafeVmmConfig<T extends { sessionId: string | null; csrfToken: string | null; userId: string }>(config: T | null) {
  if (!config) return null;
  const { sessionId, csrfToken: _csrf, userId: _userId, ...rest } = config;
  return { ...rest, isConnected: !!sessionId };
}

/** The same, with the groups and their marks parsed back out of JSON. */
export function toSafeVmmConfigWithGroups<T extends { sessionId: string | null; csrfToken: string | null; userId: string }>(
  config: (T & { groups: { marks: string }[] }) | null,
) {
  if (!config) return null;
  const { groups, ...plain } = config;
  return { ...toSafeVmmConfig(plain as unknown as T)!, groups: groups.map((g) => ({ ...g, marks: JSON.parse(g.marks) })) };
}
