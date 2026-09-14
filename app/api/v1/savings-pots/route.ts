import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pots = await db.savingsPot.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(pots);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch savings pots' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, targetAmount, currentAmount, monthlyContribution, targetDate, icon, colorHex } = body;

    if (!name || !targetAmount) {
      return NextResponse.json({ error: 'Name and target amount are required' }, { status: 400 });
    }

    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pot = await db.savingsPot.create({
      data: {
        userId: user.id,
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
        monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        icon: icon || 'piggy-bank',
        colorHex: colorHex || '#10B981',
      },
    });

    return NextResponse.json(pot, { status: 201 });
  } catch (error) {
    console.error('Error creating savings pot:', error);
    return NextResponse.json({ error: 'Failed to create savings pot' }, { status: 500 });
  }
}
