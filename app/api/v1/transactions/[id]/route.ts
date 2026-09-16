import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { jsonError, serverError } from '@/lib/api';

type Params = { params: { id: string } };

/** Deleting a pot transfer also reverts the pot balance, keeping both sides consistent. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const transaction = await db.transaction.findFirst({ where: { id: params.id, userId: user.id } });
    if (!transaction) return jsonError('Transaktion nicht gefunden', 404);

    const pot =
      transaction.savingsPotId &&
      (transaction.type === 'transfer_to_pot' || transaction.type === 'transfer_from_pot')
        ? await db.savingsPot.findUnique({ where: { id: transaction.savingsPotId } })
        : null;

    await db.$transaction([
      ...(pot
        ? [
            db.savingsPot.update({
              where: { id: pot.id },
              // transfer_to_pot is stored negative (pot grew), transfer_from_pot positive (pot shrank).
              data: { currentAmount: Math.max(0, pot.currentAmount + transaction.amount) },
            }),
          ]
        : []),
      db.transaction.delete({ where: { id: transaction.id } }),
    ]);

    return NextResponse.json({ success: true, id: transaction.id });
  } catch (error) {
    return serverError('DELETE /transactions/[id]', error, 'Transaktion konnte nicht gelöscht werden');
  }
}
