import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { jsonError, readJson, serverError, toNumber } from '@/lib/api';

type Params = { params: { id: string } };

/** Moves money into a pot (`direction: "deposit"`, default) or back out of it (`"withdraw"`). */
export async function POST(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const amount = toNumber(body.amount);
    const withdraw = body.direction === 'withdraw';
    if (amount === null || amount <= 0) return jsonError('Bitte einen positiven Betrag angeben');

    const user = await getCurrentUser();
    const pot = await db.savingsPot.findFirst({ where: { id: params.id, userId: user.id } });
    if (!pot) return jsonError('Spartopf nicht gefunden', 404);
    if (withdraw && amount > pot.currentAmount + 0.001) {
      return jsonError(`Im Spartopf sind nur ${pot.currentAmount.toFixed(2)} € verfügbar`);
    }

    const [updatedPot, transaction] = await db.$transaction([
      db.savingsPot.update({
        where: { id: pot.id },
        data: { currentAmount: withdraw ? { decrement: amount } : { increment: amount } },
      }),
      db.transaction.create({
        data: {
          userId: user.id,
          savingsPotId: pot.id,
          title: `${withdraw ? 'Entnahme' : 'Einzahlung'}: ${pot.name}`,
          amount: withdraw ? amount : -amount,
          category: 'Sparen',
          type: withdraw ? 'transfer_from_pot' : 'transfer_to_pot',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pot: updatedPot,
      transaction,
      isGoalReached: !withdraw && pot.currentAmount < pot.targetAmount && updatedPot.currentAmount >= updatedPot.targetAmount,
    });
  } catch (error) {
    return serverError('POST /savings-pots/[id]/deposit', error, 'Buchung fehlgeschlagen');
  }
}
