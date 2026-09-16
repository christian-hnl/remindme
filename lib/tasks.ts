import { db } from '@/lib/db';

const SUBJECT_COLORS = ['#6366F1', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#3B82F6', '#06B6D4', '#EAB308', '#14B8A6'];

export function colorForName(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

/** Finds a subject by name or Untis code (case-insensitive) or creates it. */
export async function findOrCreateSubject(userId: string, name: string) {
  const needle = name.trim().toLowerCase();
  const subjects = await db.subject.findMany({ where: { userId } });
  const existing = subjects.find(
    (s) => s.name.toLowerCase() === needle || s.untisCode?.toLowerCase() === needle
  );
  if (existing) return existing;

  return db.subject.create({
    data: { userId, name: name.trim(), colorHex: colorForName(name) },
  });
}

export interface TaskInput {
  title: string;
  description?: string | null;
  dueDate: Date;
  estimatedMinutes: number;
  priority: string;
  subjectId?: string | null;
  subjectName?: string | null;
}

/** Creates a task, resolving its subject and auto-linking it to the matching lesson. */
export async function createTask(userId: string, input: TaskInput) {
  let subjectId: string | null = null;
  if (input.subjectId) {
    const subject = await db.subject.findFirst({ where: { id: input.subjectId, userId } });
    subjectId = subject?.id ?? null;
  }
  if (!subjectId && input.subjectName) {
    subjectId = (await findOrCreateSubject(userId, input.subjectName)).id;
  }

  return db.task.create({
    data: {
      userId,
      subjectId,
      scheduleBlockId: await findScheduleBlockId(userId, subjectId, input.dueDate),
      title: input.title,
      description: input.description || null,
      dueDate: input.dueDate,
      estimatedMinutes: input.estimatedMinutes,
      priority: input.priority,
      status: 'backlog',
    },
    include: { subject: true },
  });
}

/**
 * Picks the lesson a homework belongs to: preferably the lesson of that subject on the
 * due date's weekday, otherwise the subject's first lesson of the week.
 */
export async function findScheduleBlockId(userId: string, subjectId: string | null, dueDate: Date) {
  if (!subjectId) return null;
  const blocks = await db.scheduleBlock.findMany({
    where: { userId, subjectId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    select: { id: true, dayOfWeek: true },
  });
  const weekday = dueDate.getDay() || 7;
  return (blocks.find((b) => b.dayOfWeek === weekday) ?? blocks[0])?.id ?? null;
}
