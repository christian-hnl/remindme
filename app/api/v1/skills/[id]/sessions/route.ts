import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toDate, toNumber } from '@/lib/api';
import { findOwnSkill, loadSkill } from '@/lib/skills-db';

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const minutes = toNumber(body.minutes);
    if (minutes === null || minutes < 1 || minutes > 24 * 60) return jsonError('Bitte zwischen 1 und 1440 Minuten eingeben');
    const date = body.date ? toDate(body.date) : new Date();
    if (!date) return jsonError('Ungültiges Datum');
    if (date.getTime() > Date.now() + 86_400_000) return jsonError('Das Datum liegt in der Zukunft');

    const user = await getCurrentUser();
    const skill = await findOwnSkill(user.id, params.id);
    if (!skill) return jsonError('Nicht gefunden', 404);
    await db.$transaction([
      db.skillSession.create({ data: { skillId: skill.id, minutes: Math.round(minutes), date, note: cleanString(body.note, 300) || null } }),
      // Logging time on a wish or a paused skill (re)starts it.
      ...(skill.status === 'idea' || skill.status === 'paused'
        ? [db.skill.update({ where: { id: skill.id }, data: { status: 'active', startedAt: new Date() } })]
        : []),
    ]);
    return NextResponse.json(await loadSkill(skill.id), { status: 201 });
  } catch (error) {
    return serverError('POST /skills/[id]/sessions', error, 'Lernzeit konnte nicht gespeichert werden');
  }
}
