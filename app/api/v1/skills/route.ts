import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, pickEnum, readJson, serverError, toNumber } from '@/lib/api';
import { SKILL_STATUSES, guessSkillMeta } from '@/lib/skills';
import { loadSkill } from '@/lib/skills-db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const title = cleanString(body.title, 100);
    if (!title) return jsonError('Was möchtest du lernen?');
    const guess = guessSkillMeta(title);
    const status = pickEnum(body.status, SKILL_STATUSES) ?? 'idea';
    const weekly = toNumber(body.weeklyMinutes);

    const user = await getCurrentUser();
    const skill = await db.skill.create({
      data: {
        userId: user.id,
        title,
        emoji: cleanString(body.emoji, 16) || guess.emoji,
        category: cleanString(body.category, 30) || guess.category,
        status,
        why: cleanString(body.why, 500) || null,
        weeklyMinutes: weekly !== null ? Math.max(0, Math.min(3000, Math.round(weekly))) : 60,
        startedAt: status === 'active' ? new Date() : null,
      },
    });
    return NextResponse.json(await loadSkill(skill.id), { status: 201 });
  } catch (error) {
    return serverError('POST /skills', error, 'Konnte nicht gespeichert werden');
  }
}
