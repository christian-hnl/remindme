import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, readJson, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const notes = await db.note.findMany({
      where: { userId: user.id },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json(notes);
  } catch (error) {
    return serverError('GET /notes', error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await readJson(req);

    const note = await db.note.create({
      data: {
        userId: user.id,
        title: cleanString(body.title, 200) || 'Neue Notiz',
        content: typeof body.content === 'string' ? body.content.slice(0, 100_000) : '',
        category: cleanString(body.category, 40) || 'Gedanken',
        isPinned: !!body.isPinned,
        colorHex: cleanString(body.colorHex, 9) || '#6366F1',
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return serverError('POST /notes', error, 'Notiz konnte nicht erstellt werden');
  }
}
