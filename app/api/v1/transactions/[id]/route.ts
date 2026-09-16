import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toDate } from '@/lib/api';
import { merchantKey } from '@/lib/finance/merchant';

type Params = { params: { id: string } };

const EDITABLE_TYPES = ['income', 'expense', 'transfer', 'investment'];

/**
 * Edits a booking. With applyToSimilar the category is also set on every booking of the
 * same merchant, with remember it is used for future imports too.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const user = await getCurrentUser();
    const transaction = await db.transaction.findFirst({ where: { id: params.id, userId: user.id } });
    if (!transaction) return jsonError('Buchung nicht gefunden', 404);
    if (transaction.type === 'transfer_to_pot' || transaction.type === 'transfer_from_pot') {
      return jsonError('Spartopf-Buchungen können nur gelöscht werden');
    }

    const data: Record<string, unknown> = {};
    const category = cleanString(body.category, 40);
    if (body.category !== undefined) {
      if (!category) return jsonError('Kategorie fehlt');
      data.category = category;
    }
    if (body.title !== undefined) {
      const title = cleanString(body.title, 120);
      if (!title) return jsonError('Beschreibung ist erforderlich');
      data.title = title;
    }
    if (body.isRecurring !== undefined) data.isRecurring = !!body.isRecurring;
    if (body.type !== undefined) {
      if (!EDITABLE_TYPES.includes(body.type)) return jsonError('Ungültige Art');
      data.type = body.type;
    }
    if (body.transactionDate !== undefined) {
      const date = toDate(body.transactionDate);
      if (!date) return jsonError('Ungültiges Datum');
      data.transactionDate = date;
    }

    const updated = await db.transaction.update({ where: { id: transaction.id }, data });

    let similarUpdated = 0;
    if (category && (body.applyToSimilar || body.remember)) {
      const key = merchantKey(transaction.counterparty, transaction.title);
      if (body.applyToSimilar) {
        const candidates = await db.transaction.findMany({
          where: { userId: user.id, id: { not: transaction.id }, type: transaction.type, category: { not: category } },
          select: { id: true, counterparty: true, title: true },
        });
        const ids = candidates.filter((c) => merchantKey(c.counterparty, c.title) === key).map((c) => c.id);
        if (ids.length) similarUpdated = (await db.transaction.updateMany({ where: { id: { in: ids } }, data: { category } })).count;
      }
      if (body.remember && key) {
        await db.categoryRule.upsert({
          where: { userId_pattern: { userId: user.id, pattern: key } },
          update: { category },
          create: { userId: user.id, pattern: key, category },
        });
      }
    }

    return NextResponse.json({ transaction: updated, similarUpdated });
  } catch (error) {
    return serverError('PATCH /transactions/[id]', error, 'Buchung konnte nicht gespeichert werden');
  }
}

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
