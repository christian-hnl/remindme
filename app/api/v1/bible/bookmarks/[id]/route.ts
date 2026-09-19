import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const user = await getCurrentUser();
    const bookmark = await db.bibleBookmark.findFirst({ where: { id: params.id, userId: user.id } });
    if (!bookmark) return jsonError('Nicht gefunden', 404);

    const updated = await db.bibleBookmark.update({
      where: { id: bookmark.id },
      data: { note: cleanString(body.note, 1000) || null },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError('PATCH /bible/bookmarks/[id]', error, 'Notiz konnte nicht gespeichert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { count } = await db.bibleBookmark.deleteMany({ where: { id: params.id, userId: user.id } });
    if (!count) return jsonError('Nicht gefunden', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /bible/bookmarks/[id]', error, 'Vers konnte nicht entfernt werden');
  }
}
