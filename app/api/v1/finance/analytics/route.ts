import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { pickEnum, serverError } from '@/lib/api';
import { ANALYTICS_RANGES, getFinanceAnalytics } from '@/lib/finance/analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const range = pickEnum(new URL(req.url).searchParams.get('range'), ANALYTICS_RANGES) ?? 'month';
    const user = await getCurrentUser();
    return NextResponse.json(await getFinanceAnalytics(user, range));
  } catch (error) {
    return serverError('GET /finance/analytics', error, 'Analyse konnte nicht berechnet werden');
  }
}
