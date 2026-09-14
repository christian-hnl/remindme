import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let config = await db.webUntisConfig.findUnique({
      where: { userId: user.id },
    });

    if (!config) {
      config = await db.webUntisConfig.create({
        data: {
          userId: user.id,
          school: 'gym-st-michael',
          schoolName: 'Gymnasium St. Michael',
          server: 'arche.webuntis.com',
          username: 'alexander.student',
          isConnected: true,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { school, schoolName, server, username, password, autoSync } = body;

    const config = await db.webUntisConfig.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        school: school || 'gym-st-michael',
        schoolName: schoolName || 'Gymnasium St. Michael',
        server: server || 'arche.webuntis.com',
        username: username || 'student',
        password: password || null,
        autoSync: autoSync !== undefined ? autoSync : true,
        isConnected: true,
      },
      update: {
        school: school || undefined,
        schoolName: schoolName || undefined,
        server: server || undefined,
        username: username || undefined,
        password: password !== undefined ? password : undefined,
        autoSync: autoSync !== undefined ? autoSync : undefined,
        isConnected: true,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Config save error:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
