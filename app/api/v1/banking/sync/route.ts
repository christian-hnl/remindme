import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { syncAllConnections } from '@/lib/banking/sync';
import { serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json(await syncAllConnections(user.id));
  } catch (error) {
    return serverError('POST /banking/sync', error, 'Abruf fehlgeschlagen');
  }
}
