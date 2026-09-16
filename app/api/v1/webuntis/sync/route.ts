import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { syncWebUntisData } from '@/lib/webuntis';
import { jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json(await syncWebUntisData(user.id));
  } catch (error) {
    console.error('WebUntis sync error:', error);
    return jsonError(error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen', 502);
  }
}
