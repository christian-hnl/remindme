import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { jsonError, serverError } from '@/lib/api';

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { count } = await db.grade.deleteMany({ where: { id: params.id, userId: user.id } });
    if (!count) return jsonError('Note nicht gefunden', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /grades/[id]', error, 'Note konnte nicht gelöscht werden');
  }
}
