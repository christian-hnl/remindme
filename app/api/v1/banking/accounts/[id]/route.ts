import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toNumber } from '@/lib/api';

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const account = await db.bankAccount.findFirst({ where: { id: params.id, userId: user.id } });
    if (!account) return jsonError('Konto nicht gefunden', 404);

    const body = await readJson(req);
    const data: Prisma.BankAccountUpdateInput = {};
    if (body.name !== undefined) {
      const name = cleanString(body.name, 80);
      if (!name) return jsonError('Name darf nicht leer sein');
      data.name = name;
    }
    if (typeof body.includeInBalance === 'boolean') data.includeInBalance = body.includeInBalance;
    if (body.balance !== undefined) {
      const balance = body.balance === null || body.balance === '' ? null : toNumber(body.balance);
      if (body.balance !== null && body.balance !== '' && balance === null) return jsonError('Ungültiger Kontostand');
      data.balance = balance;
      data.balanceUpdatedAt = balance === null ? null : new Date();
    }

    const updated = await db.bankAccount.update({ where: { id: account.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError('PATCH /banking/accounts/[id]', error, 'Konto konnte nicht gespeichert werden');
  }
}

/** Removes the account together with all of its imported bookings. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { count } = await db.bankAccount.deleteMany({ where: { id: params.id, userId: user.id } });
    if (!count) return jsonError('Konto nicht gefunden', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /banking/accounts/[id]', error, 'Konto konnte nicht gelöscht werden');
  }
}
