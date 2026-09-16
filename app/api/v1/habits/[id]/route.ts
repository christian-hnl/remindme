import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';

type Params = { params: { id: string } };

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Ticks a day on or off: `{ day: "yyyy-MM-dd" }`. Can also rename: `{ name, emoji }`. */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const habit = await db.habit.findFirst({ where: { id: params.id, userId: user.id } });
    if (!habit) return jsonError('Routine nicht gefunden', 404);

    const body = await readJson(req);
    if (typeof body.day === 'string') {
      if (!DAY_PATTERN.test(body.day)) return jsonError('Ungültiger Tag');
      const existing = await db.habitLog.findUnique({ where: { habitId_day: { habitId: habit.id, day: body.day } } });
      if (existing) await db.habitLog.delete({ where: { id: existing.id } });
      else await db.habitLog.create({ data: { habitId: habit.id, day: body.day } });
      return NextResponse.json({ day: body.day, done: !existing });
    }

    const updated = await db.habit.update({
      where: { id: habit.id },
      data: {
        ...(body.name !== undefined && { name: cleanString(body.name, 60) || habit.name }),
        ...(body.emoji !== undefined && { emoji: cleanString(body.emoji, 8) || habit.emoji }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError('PATCH /habits/[id]', error, 'Routine konnte nicht gespeichert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { count } = await db.habit.deleteMany({ where: { id: params.id, userId: user.id } });
    if (!count) return jsonError('Routine nicht gefunden', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /habits/[id]', error, 'Routine konnte nicht gelöscht werden');
  }
}
