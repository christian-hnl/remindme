import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toNumber } from '@/lib/api';

function parseBirthday(body: Record<string, unknown>) {
  const month = toNumber(body.month);
  const day = toNumber(body.day);
  const year = body.year === null || body.year === undefined || body.year === '' ? null : toNumber(body.year);
  if (!month || !day || month < 1 || month > 12 || day < 1) return null;
  // Leap year 2000 so 29 February stays valid.
  if (day > new Date(2000, Math.round(month), 0).getDate()) return null;
  if (year !== null && (year < 1900 || year > new Date().getFullYear())) return null;
  return { month: Math.round(month), day: Math.round(day), year: year === null ? null : Math.round(year) };
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = cleanString(body.name, 80);
    const date = parseBirthday(body);
    if (!name) return jsonError('Bitte einen Namen eingeben');
    if (!date) return jsonError('Ungültiges Datum');

    const user = await getCurrentUser();
    const birthday = await db.birthday.create({
      data: { userId: user.id, name, ...date, note: cleanString(body.note, 200) || null },
    });
    return NextResponse.json(birthday, { status: 201 });
  } catch (error) {
    return serverError('POST /birthdays', error, 'Geburtstag konnte nicht gespeichert werden');
  }
}
