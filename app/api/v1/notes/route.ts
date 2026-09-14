import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const notes = await db.note.findMany({
      where: { userId: user.id },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { title, content, category, isPinned, colorHex } = body;

    const note = await db.note.create({
      data: {
        userId: user.id,
        title: (title || 'Neue Notiz').trim(),
        content: content || '',
        category: category || 'Gedanken',
        isPinned: !!isPinned,
        colorHex: colorHex || '#6366F1',
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
