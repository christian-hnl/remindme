import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncWebUntisData } from '@/lib/webuntis';

export async function POST() {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const result = await syncWebUntisData(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('WebUntis sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
