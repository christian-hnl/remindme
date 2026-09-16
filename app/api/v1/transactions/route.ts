import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toDate, toNumber } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return NextResponse.json(transactions);
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
