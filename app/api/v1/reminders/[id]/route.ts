import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const reminder = await db.reminder.update({
      where: { id },
      data: {
        ...(body.isDone !== undefined && { isDone: body.isDone }),
        ...(body.title && { title: body.title }),
        ...(body.category && { category: body.category }),
        ...(body.dueTime !== undefined && { dueTime: body.dueTime }),
        ...(body.priority && { priority: body.priority }),
      },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await db.reminder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}
