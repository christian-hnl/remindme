import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { serverError } from '@/lib/api';
import { buildStats } from '@/lib/nutrition/server/stats';
import { loadContext } from '@/lib/nutrition/server/week';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json(await buildStats(await loadContext(user.id)));
  } catch (error) {
    return serverError('GET /nutrition/stats', error, 'Statistik konnte nicht geladen werden');
  }
}
