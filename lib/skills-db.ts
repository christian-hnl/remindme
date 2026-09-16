import { subDays } from 'date-fns';
import { db } from '@/lib/db';

const SESSION_WINDOW_DAYS = 91;

const include = () => ({
  steps: { orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }] },
  resources: { orderBy: { createdAt: 'asc' as const } },
  sessions: { where: { date: { gte: subDays(new Date(), SESSION_WINDOW_DAYS) } }, orderBy: { date: 'desc' as const } },
});

async function withTotals<T extends { id: string }>(skills: T[]) {
  if (skills.length === 0) return [];
  const totals = await db.skillSession.groupBy({
    by: ['skillId'],
    where: { skillId: { in: skills.map((s) => s.id) } },
    _sum: { minutes: true },
  });
  const map = new Map(totals.map((t) => [t.skillId, t._sum.minutes ?? 0]));
  return skills.map((s) => ({ ...s, totalMinutes: map.get(s.id) ?? 0 }));
}

export async function loadSkills(userId: string) {
  const skills = await db.skill.findMany({ where: { userId }, include: include(), orderBy: { createdAt: 'asc' } });
  return withTotals(skills);
}

export async function loadSkill(id: string) {
  const skill = await db.skill.findUnique({ where: { id }, include: include() });
  return skill ? (await withTotals([skill]))[0] : null;
}

/** Returns the skill only if it belongs to the user. */
export function findOwnSkill(userId: string, id: string) {
  return db.skill.findFirst({ where: { id, userId }, select: { id: true, status: true } });
}
