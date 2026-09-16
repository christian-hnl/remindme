import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { jsonError, serverError } from '@/lib/api';
import { findOwnSkill, loadSkill } from '@/lib/skills-db';

type Params = { params: { id: string; sessionId: string } };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const skill = await findOwnSkill(user.id, params.id);
    if (!skill) return jsonError('Nicht gefunden', 404);
    const session = await db.skillSession.findFirst({ where: { id: params.sessionId, skillId: skill.id } });
    if (!session) return jsonError('Nicht gefunden', 404);
    await db.skillSession.delete({ where: { id: session.id } });
    return NextResponse.json(await loadSkill(skill.id));
  } catch (error) {
    return serverError('DELETE /skills/sessions', error, 'Konnte nicht gelöscht werden');
  }
}
