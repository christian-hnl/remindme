import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, pickEnum, readJson, serverError, toDate, toNumber } from '@/lib/api';
import { SKILL_STATUSES } from '@/lib/skills';
import { findOwnSkill, loadSkill } from '@/lib/skills-db';

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const user = await getCurrentUser();
    const skill = await findOwnSkill(user.id, params.id);
    if (!skill) return jsonError('Nicht gefunden', 404);

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = cleanString(body.title, 100);
      if (!title) return jsonError('Titel fehlt');
      data.title = title;
    }
    if (body.emoji !== undefined) data.emoji = cleanString(body.emoji, 16) || '🎯';
    if (body.category !== undefined) data.category = cleanString(body.category, 30) || 'Sonstiges';
    if (body.why !== undefined) data.why = cleanString(body.why, 500) || null;
    if (body.weeklyMinutes !== undefined) {
      const weekly = toNumber(body.weeklyMinutes);
      if (weekly === null || weekly < 0) return jsonError('Ungültiges Wochenziel');
      data.weeklyMinutes = Math.min(3000, Math.round(weekly));
    }
    if (body.targetDate !== undefined) data.targetDate = body.targetDate ? toDate(body.targetDate) : null;
    if (body.status !== undefined) {
      const status = pickEnum(body.status, SKILL_STATUSES);
      if (!status) return jsonError('Ungültiger Status');
      data.status = status;
      if (status === 'active' && skill.status !== 'active') data.startedAt = new Date();
      data.finishedAt = status === 'done' ? new Date() : null;
    }

    await db.skill.update({ where: { id: skill.id }, data });
    return NextResponse.json(await loadSkill(skill.id));
  } catch (error) {
    return serverError('PATCH /skills/[id]', error, 'Konnte nicht gespeichert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const skill = await findOwnSkill(user.id, params.id);
    if (!skill) return jsonError('Nicht gefunden', 404);
    await db.skill.delete({ where: { id: skill.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /skills/[id]', error, 'Konnte nicht gelöscht werden');
  }
}
