import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';
import { findOwnSkill, loadSkill } from '@/lib/skills-db';

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const title = cleanString(body.title, 200);
    if (!title) return jsonError('Schritt fehlt');
    const user = await getCurrentUser();
    const skill = await findOwnSkill(user.id, params.id);
    if (!skill) return jsonError('Nicht gefunden', 404);
    const last = await db.skillStep.findFirst({ where: { skillId: skill.id }, orderBy: { position: 'desc' } });
    await db.skillStep.create({ data: { skillId: skill.id, title, position: (last?.position ?? 0) + 1 } });
    return NextResponse.json(await loadSkill(skill.id), { status: 201 });
  } catch (error) {
    return serverError('POST /skills/[id]/steps', error, 'Schritt konnte nicht gespeichert werden');
  }
}
