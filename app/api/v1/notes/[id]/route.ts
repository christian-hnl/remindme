import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const note = await db.note.findFirst({ where: { id: params.id, userId: user.id } });
    if (!note) return jsonError('Notiz nicht gefunden', 404);

    const body = await readJson(req);
    const data: Prisma.NoteUpdateInput = {};
    if (body.title !== undefined) data.title = cleanString(body.title, 200) ?? '';
    if (typeof body.content === 'string') data.content = body.content.slice(0, 100_000);
    if (body.category !== undefined) data.category = cleanString(body.category, 40) || 'Gedanken';
    if (body.isPinned !== undefined) data.isPinned = !!body.isPinned;
    if (body.colorHex !== undefined) data.colorHex = cleanString(body.colorHex, 9) || note.colorHex;

    const updated = await db.note.update({ where: { id: note.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError('PATCH /notes/[id]', error, 'Notiz konnte nicht gespeichert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { count } = await db.note.deleteMany({ where: { id: params.id, userId: user.id } });
    if (!count) return jsonError('Notiz nicht gefunden', 404);
    return NextResponse.json({ success: true, id: params.id });
  } catch (error) {
    return serverError('DELETE /notes/[id]', error, 'Notiz konnte nicht gelöscht werden');
  }
}
