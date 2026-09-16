import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toDate, toNumber } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Filters: from, to (ISO), category, type (in|out|all), q (search), limit. */
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const user = await getCurrentUser();
    const from = toDate(params.get('from'));
    const to = toDate(params.get('to'));
    const category = params.get('category');
    const type = params.get('type');
    const q = params.get('q')?.trim();
    const limit = Math.min(1000, Math.max(1, Math.round(toNumber(params.get('limit')) ?? 100)));

    const where: Prisma.TransactionWhereInput = {
      userId: user.id,
      ...(from || to ? { transactionDate: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
      ...(category ? { category: category.includes(',') ? { in: category.split(',') } : category } : {}),
      ...(type === 'out' ? { type: 'expense' } : type === 'in' ? { type: 'income' } : {}),
      ...(q
        ? { OR: [{ title: { contains: q } }, { counterparty: { contains: q } }, { description: { contains: q } }, { category: { contains: q } }] }
        : {}),
    };

    const [transactions, total, sums] = await Promise.all([
      db.transaction.findMany({
        where,
        include: { bankAccount: { select: { name: true, source: true } } },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      }),
      db.transaction.count({ where }),
      db.transaction.groupBy({ by: ['type'], where, _sum: { amount: true } }),
    ]);
    const sumOf = (t: string) => sums.find((s) => s.type === t)?._sum.amount ?? 0;
    return NextResponse.json({
      transactions,
      total,
      income: Math.round(sumOf('income') * 100) / 100,
      expenses: Math.round(-sumOf('expense') * 100) / 100,
    });
  } catch (error) {
    return serverError('GET /transactions', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const title = cleanString(body.title, 120);
    const rawAmount = toNumber(body.amount);
    if (!title) return jsonError('Beschreibung ist erforderlich');
    if (rawAmount === null || rawAmount === 0) return jsonError('Bitte einen gültigen Betrag angeben');

    const type = body.type === 'income' || body.type === 'expense' ? body.type : rawAmount < 0 ? 'expense' : 'income';
    // Amounts are stored signed: income positive, expenses negative.
    const amount = type === 'income' ? Math.abs(rawAmount) : -Math.abs(rawAmount);
    const transactionDate = body.transactionDate ? toDate(body.transactionDate) : new Date();
    if (!transactionDate) return jsonError('Ungültiges Datum');

    const user = await getCurrentUser();
    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        title,
        amount,
        category: cleanString(body.category, 40) || (type === 'income' ? 'Einkommen' : 'Sonstiges'),
        type,
        isRecurring: !!body.isRecurring,
        transactionDate,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return serverError('POST /transactions', error, 'Transaktion konnte nicht gespeichert werden');
  }
}
