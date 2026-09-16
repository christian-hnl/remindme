import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/lib/dashboard';
import { serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getDashboardSummary());
  } catch (error) {
    return serverError('/dashboard/summary', error);
  }
}
