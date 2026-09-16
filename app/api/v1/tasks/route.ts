import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { createTask } from '@/lib/tasks';
import { PRIORITIES, cleanString, jsonError, pickEnum, readJson, serverError, toDate, toNumber } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const tasks = await db.task.findMany({
      where: { userId: user.id },
      include: { subject: true },
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return serverError('GET /tasks', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const title = cleanString(body.title, 200);
    if (!title) return jsonError('Titel ist erforderlich');

    const dueDate = body.dueDate ? toDate(body.dueDate) : new Date();
    if (!dueDate) return jsonError('Ungültiges Fälligkeitsdatum');

    const minutes = toNumber(body.estimatedMinutes) ?? 30;
    const user = await getCurrentUser();
    const task = await createTask(user.id, {
      title,
      description: cleanString(body.description, 5000) || null,
      dueDate,
      estimatedMinutes: Math.min(24 * 60, Math.max(5, Math.round(minutes))),
      priority: pickEnum(body.priority, PRIORITIES) ?? 'medium',
      subjectId: typeof body.subjectId === 'string' ? body.subjectId : null,
      subjectName: cleanString(body.subjectName, 60) || null,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return serverError('POST /tasks', error, 'Aufgabe konnte nicht erstellt werden');
  }
}
