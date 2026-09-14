import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      include: { subject: true, scheduleBlock: true },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, dueDate, estimatedMinutes, priority, subjectId, subjectName, scheduleBlockId } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let finalSubjectId = subjectId;
    if (!finalSubjectId && subjectName) {
      let subj = await db.subject.findFirst({
        where: { name: { equals: subjectName } },
      });
      if (!subj) {
        subj = await db.subject.create({
          data: {
            name: subjectName,
            userId: user.id,
            colorHex: '#6366F1',
          },
        });
      }
      finalSubjectId = subj.id;
    }

    // Auto-connect to ScheduleBlock if not explicitly given
    let finalScheduleBlockId = scheduleBlockId || null;
    if (!finalScheduleBlockId && finalSubjectId) {
      const matchingBlock = await db.scheduleBlock.findFirst({
        where: { userId: user.id, subjectId: finalSubjectId },
        orderBy: { dayOfWeek: 'asc' },
      });
      if (matchingBlock) {
        finalScheduleBlockId = matchingBlock.id;
      }
    }

    const task = await db.task.create({
      data: {
        userId: user.id,
        subjectId: finalSubjectId || null,
        scheduleBlockId: finalScheduleBlockId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : 30,
        priority: priority || 'medium',
        status: 'backlog',
      },
      include: { subject: true, scheduleBlock: true },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
