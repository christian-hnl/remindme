import { NextResponse } from 'next/server';
import { testUntisConnection } from '@/lib/webuntis';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { server, school, username, password } = body;

    const result = await testUntisConnection(server, school, username, password);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Verbindungstest fehlgeschlagen' }, { status: 200 });
  }
}
