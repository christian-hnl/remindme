import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';
import { findOwnSkill, loadSkill } from '@/lib/skills-db';

type Params = { params: { id: string; stepId: string } };

async function ownStep(params: Params['params']) {
  const user = await getCurrentUser();
  const skill = await findOwnSkill(user.id, params.id);
  if (!skill) return null;
  return db.skillStep.findFirst({ where: { id: params.stepId, skillId: skill.id } });
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const step = await ownStep(params);
    if (!step) return jsonError('Nicht gefunden', 404);
    const data: Record<string, unknown> = {};
    if (body.isDone !== undefined) data.isDone = !!body.isDone;
    if (body.title !== undefined) {
      const title = cleanString(body.title, 200);
      if (!title) return jsonError('Schritt fehlt');
      data.title = title;
    }
    await db.skillStep.update({ where: { id: step.id }, data });
    return NextResponse.json(await loadSkill(step.skillId));
  } catch (error) {
    return serverError('PATCH /skills/steps', error, 'Konnte nicht gespeichert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const step = await ownStep(params);
    if (!step) return jsonError('Nicht gefunden', 404);
    await db.skillStep.delete({ where: { id: step.id } });
    return NextResponse.json(await loadSkill(step.skillId));
  } catch (error) {
    return serverError('DELETE /skills/steps', error, 'Konnte nicht gelöscht werden');
  }
}
