import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [subjects, untisConfig] = await Promise.all([
      db.subject.findMany({ where: { userId: user.id } }),
      db.webUntisConfig.findUnique({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        monthlyBudget: user.monthlyBudget,
        preferences: JSON.parse(user.preferences || '{}'),
      },
      subjects,
      untisConfig,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { displayName, monthlyBudget, preferences, subjects } = body;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        ...(displayName && { displayName }),
        ...(monthlyBudget !== undefined && { monthlyBudget: parseFloat(monthlyBudget) }),
        ...(preferences && { preferences: JSON.stringify(preferences) }),
      },
    });

    // Update subjects if passed
    if (Array.isArray(subjects)) {
      for (const subj of subjects) {
        if (subj.id) {
          await db.subject.update({
            where: { id: subj.id },
            data: {
              ...(subj.name && { name: subj.name }),
              ...(subj.colorHex && { colorHex: subj.colorHex }),
              ...(subj.untisCode !== undefined && { untisCode: subj.untisCode }),
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
