import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { jsonError, readJson, serverError } from '@/lib/api';
import { findOwnSkill, loadSkill } from '@/lib/skills-db';

type Params = { params: { id: string; resourceId: string } };

async function ownResource(params: Params['params']) {
  const user = await getCurrentUser();
  const skill = await findOwnSkill(user.id, params.id);
  if (!skill) return null;
  return db.skillResource.findFirst({ where: { id: params.resourceId, skillId: skill.id } });
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const resource = await ownResource(params);
    if (!resource) return jsonError('Nicht gefunden', 404);
    await db.skillResource.update({ where: { id: resource.id }, data: { isDone: !!body.isDone } });
    return NextResponse.json(await loadSkill(resource.skillId));
  } catch (error) {
    return serverError('PATCH /skills/resources', error, 'Konnte nicht gespeichert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const resource = await ownResource(params);
    if (!resource) return jsonError('Nicht gefunden', 404);
    await db.skillResource.delete({ where: { id: resource.id } });
    return NextResponse.json(await loadSkill(resource.skillId));
  } catch (error) {
    return serverError('DELETE /skills/resources', error, 'Konnte nicht gelöscht werden');
  }
}
