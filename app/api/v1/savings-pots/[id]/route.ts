import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toDate, toNumber } from '@/lib/api';

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const pot = await db.savingsPot.findFirst({ where: { id: params.id, userId: user.id } });
    if (!pot) return jsonError('Spartopf nicht gefunden', 404);

    const body = await readJson(req);
    const data: Prisma.SavingsPotUpdateInput = {};

    if (body.name !== undefined) {
      const name = cleanString(body.name, 80);
      if (!name) return jsonError('Name darf nicht leer sein');
      data.name = name;
    }
    if (body.targetAmount !== undefined) {
      const target = toNumber(body.targetAmount);
      if (target === null || target <= 0) return jsonError('Zielbetrag muss größer als 0 sein');
      data.targetAmount = target;
    }
    if (body.monthlyContribution !== undefined) {
      data.monthlyContribution = Math.max(0, toNumber(body.monthlyContribution) ?? 0);
    }
    if (body.targetDate !== undefined) data.targetDate = body.targetDate ? toDate(body.targetDate) : null;
    if (body.colorHex !== undefined) data.colorHex = cleanString(body.colorHex, 9) || pot.colorHex;
    if (body.icon !== undefined) data.icon = cleanString(body.icon, 30) || pot.icon;
    if (body.isArchived !== undefined) data.isArchived = !!body.isArchived;

    const updated = await db.savingsPot.update({ where: { id: pot.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError('PATCH /savings-pots/[id]', error, 'Spartopf konnte nicht gespeichert werden');
  }
}

/** Deleting a pot books its remaining balance back to the account. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const pot = await db.savingsPot.findFirst({ where: { id: params.id, userId: user.id } });
    if (!pot) return jsonError('Spartopf nicht gefunden', 404);

    await db.$transaction([
      ...(pot.currentAmount > 0
        ? [
            db.transaction.create({
              data: {
                userId: user.id,
                title: `Auflösung: ${pot.name}`,
                amount: pot.currentAmount,
                category: 'Sparen',
                type: 'transfer_from_pot',
              },
            }),
          ]
        : []),
      db.savingsPot.delete({ where: { id: pot.id } }),
    ]);

    return NextResponse.json({ success: true, id: pot.id, refunded: pot.currentAmount });
  } catch (error) {
    return serverError('DELETE /savings-pots/[id]', error, 'Spartopf konnte nicht gelöscht werden');
  }
}
