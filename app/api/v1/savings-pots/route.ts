import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toDate, toNumber } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const pots = await db.savingsPot.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(pots);
  } catch (error) {
    return serverError('GET /savings-pots', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = cleanString(body.name, 80);
    const targetAmount = toNumber(body.targetAmount);
    if (!name) return jsonError('Name ist erforderlich');
    if (targetAmount === null || targetAmount <= 0) return jsonError('Zielbetrag muss größer als 0 sein');

    const currentAmount = Math.max(0, toNumber(body.currentAmount) ?? 0);
    const monthlyContribution = Math.max(0, toNumber(body.monthlyContribution) ?? 0);

    const user = await getCurrentUser();
    const pot = await db.savingsPot.create({
      data: {
        userId: user.id,
        name,
        targetAmount,
        currentAmount,
        monthlyContribution,
        targetDate: body.targetDate ? toDate(body.targetDate) : null,
        icon: cleanString(body.icon, 30) || 'piggy-bank',
        colorHex: cleanString(body.colorHex, 9) || '#10B981',
      },
    });

    return NextResponse.json(pot, { status: 201 });
  } catch (error) {
    return serverError('POST /savings-pots', error, 'Spartopf konnte nicht angelegt werden');
  }
}
