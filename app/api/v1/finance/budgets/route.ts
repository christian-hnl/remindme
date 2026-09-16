import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toNumber } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Sets the monthly limit of one category; a limit of 0 removes it. */
export async function PUT(req: Request) {
  try {
    const body = await readJson(req);
    const category = cleanString(body.category, 40);
    const limit = toNumber(body.limit);
    if (!category) return jsonError('Kategorie fehlt');
    if (limit === null || limit < 0 || limit > 100_000) return jsonError('Bitte einen gültigen Betrag eingeben');

    const user = await getCurrentUser();
    if (limit === 0) {
      await db.categoryBudget.deleteMany({ where: { userId: user.id, category } });
    } else {
      const value = Math.round(limit * 100) / 100;
      await db.categoryBudget.upsert({
        where: { userId_category: { userId: user.id, category } },
        update: { limit: value },
        create: { userId: user.id, category, limit: value },
      });
    }
    const budgets = await db.categoryBudget.findMany({ where: { userId: user.id }, orderBy: { category: 'asc' } });
    return NextResponse.json(budgets.map((b) => ({ category: b.category, limit: b.limit })));
  } catch (error) {
    return serverError('PUT /finance/budgets', error, 'Budget konnte nicht gespeichert werden');
  }
}
