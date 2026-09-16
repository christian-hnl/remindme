import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = cleanString(body.name, 60);
    if (!name) return jsonError('Bitte einen Namen für die Routine eingeben');

    const user = await getCurrentUser();
    const habit = await db.habit.create({
      data: { userId: user.id, name, emoji: cleanString(body.emoji, 8) || '✅' },
    });
    return NextResponse.json({ ...habit, days: [] }, { status: 201 });
  } catch (error) {
    return serverError('POST /habits', error, 'Routine konnte nicht angelegt werden');
  }
}
