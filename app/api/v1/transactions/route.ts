import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const transactions = await db.transaction.findMany({
      orderBy: { transactionDate: 'desc' },
      take: 50,
    });
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, amount, category, type, isRecurring, transactionDate, savingsPotId } = body;

    if (!title || amount === undefined) {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 });
    }

    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const numAmount = parseFloat(amount);
    // Negative for expense if not specified
    const finalAmount = type === 'expense' && numAmount > 0 ? -numAmount : numAmount;

    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        savingsPotId: savingsPotId || null,
        title,
        amount: finalAmount,
        category: category || 'Sonstiges',
        type: type || (finalAmount < 0 ? 'expense' : 'income'),
        isRecurring: !!isRecurring,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
