import { NextResponse } from 'next/server';

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TASK_STATUSES = ['backlog', 'in_progress', 'done', 'archived'] as const;
export const REPEAT_PATTERNS = ['none', 'daily', 'weekly'] as const;

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

export function toNumber(value: unknown): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? parseFloat(value.replace(',', '.'))
      : NaN;
  return Number.isFinite(n) ? n : null;
}

export function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function pickEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value : undefined;
}

export function cleanString(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, maxLength);
}

/** Public origin of the request, respecting a reverse proxy (Caddy) in front of the app. */
export function requestOrigin(req: Request) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = req.headers.get('x-forwarded-proto') ?? (local ? 'http' : new URL(req.url).protocol.replace(':', ''));
  return `${proto}://${host}`;
}

export function serverError(label: string, error: unknown, message = 'Interner Serverfehler') {
  console.error(`API Error ${label}:`, error);
  return jsonError(message, 500);
}
