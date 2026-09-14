import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const reminders = await db.reminder.findMany({
      where: { userId: user.id },
      orderBy: [
        { isDone: 'asc' },
        { dueDate: 'asc' },
      ],
    });

    return NextResponse.json(reminders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { 
      title, 
      category, 
      hasDueDate, 
      dueTime, 
      dueDate, 
      personName, 
      reminderType, 
      icon, 
      priority, 
      repeatPattern 
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const isDue = hasDueDate !== undefined ? !!hasDueDate : true;

    const reminder = await db.reminder.create({
      data: {
        userId: user.id,
        title: title.trim(),
        category: category || (personName ? 'Person' : 'Haushalt'),
        hasDueDate: isDue,
        dueDate: isDue && dueDate ? new Date(dueDate) : isDue ? new Date() : null,
        dueTime: isDue ? (dueTime || null) : null,
        personName: personName ? personName.trim() : null,
        reminderType: reminderType || (personName ? 'say_to_person' : 'todo'),
        icon: icon || (personName ? 'user' : 'bell'),
        priority: priority || 'medium',
        repeatPattern: repeatPattern || 'none',
        isDone: false,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}
