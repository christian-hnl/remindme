import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const amount = parseFloat(body.amount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    const pot = await db.savingsPot.findUnique({
      where: { id },
    });

    if (!pot) {
      return NextResponse.json({ error: 'Savings pot not found' }, { status: 404 });
    }

    const newAmount = pot.currentAmount + amount;

    // Transaction & Pot Update in a single transaction
    const [updatedPot, transaction] = await db.$transaction([
      db.savingsPot.update({
        where: { id },
        data: { currentAmount: newAmount },
      }),
      db.transaction.create({
        data: {
          userId: pot.userId,
          savingsPotId: pot.id,
          title: `Einzahlung: ${pot.name}`,
          amount: -amount,
          category: 'Sparen',
          type: 'transfer_to_pot',
          isRecurring: false,
          transactionDate: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pot: updatedPot,
      transaction,
      isGoalReached: updatedPot.currentAmount >= updatedPot.targetAmount,
    });
  } catch (error) {
    console.error('Error depositing to savings pot:', error);
    return NextResponse.json({ error: 'Failed to process deposit' }, { status: 500 });
  }
}
