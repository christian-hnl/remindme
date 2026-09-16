import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = cleanString(body.name, 120);
    if (!name) return jsonError('Was soll auf die Liste?');

    const user = await getCurrentUser();
    const item = await db.shoppingItem.create({
      data: { userId: user.id, name, quantity: cleanString(body.quantity, 40) || null },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return serverError('POST /shopping', error, 'Eintrag konnte nicht gespeichert werden');
  }
}

/** Removes everything already ticked off. */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    const { count } = await db.shoppingItem.deleteMany({ where: { userId: user.id, isDone: true } });
    return NextResponse.json({ success: true, count });
  } catch (error) {
    return serverError('DELETE /shopping', error, 'Liste konnte nicht aufgeräumt werden');
  }
}
