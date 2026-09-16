import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const item = await db.shoppingItem.findFirst({ where: { id: params.id, userId: user.id } });
    if (!item) return jsonError('Eintrag nicht gefunden', 404);

    const body = await readJson(req);
    const updated = await db.shoppingItem.update({
      where: { id: item.id },
      data: {
        ...(body.name !== undefined && { name: cleanString(body.name, 120) || item.name }),
        ...(body.quantity !== undefined && { quantity: cleanString(body.quantity, 40) || null }),
        ...(typeof body.isDone === 'boolean' && { isDone: body.isDone, doneAt: body.isDone ? new Date() : null }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError('PATCH /shopping/[id]', error, 'Eintrag konnte nicht gespeichert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { count } = await db.shoppingItem.deleteMany({ where: { id: params.id, userId: user.id } });
    if (!count) return jsonError('Eintrag nicht gefunden', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /shopping/[id]', error, 'Eintrag konnte nicht gelöscht werden');
  }
}
