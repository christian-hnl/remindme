import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, pickEnum, readJson, serverError } from '@/lib/api';
import { RESOURCE_KINDS, isValidUrl } from '@/lib/skills';
import { findOwnSkill, loadSkill } from '@/lib/skills-db';

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    let url = cleanString(body.url, 1000) || null;
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (url && !isValidUrl(url)) return jsonError('Der Link ist ungültig');
    const title = cleanString(body.title, 200) || (url ? new URL(url).hostname.replace(/^www\./, '') : '');
    if (!title) return jsonError('Titel oder Link fehlt');

    const user = await getCurrentUser();
    const skill = await findOwnSkill(user.id, params.id);
    if (!skill) return jsonError('Nicht gefunden', 404);
    await db.skillResource.create({
      data: { skillId: skill.id, title, url, kind: pickEnum(body.kind, RESOURCE_KINDS) ?? 'other' },
    });
    return NextResponse.json(await loadSkill(skill.id), { status: 201 });
  } catch (error) {
    return serverError('POST /skills/[id]/resources', error, 'Material konnte nicht gespeichert werden');
  }
}
