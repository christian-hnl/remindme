import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, readPreferences } from '@/lib/user';
import { toSafeUntisConfig } from '@/lib/webuntis';
import { cleanString, jsonError, readJson, serverError, toNumber } from '@/lib/api';

export const dynamic = 'force-dynamic';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export async function GET() {
  try {
    const user = await getCurrentUser();
    const [subjects, untisConfig] = await Promise.all([
      db.subject.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
      db.webUntisConfig.findUnique({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        monthlyBudget: user.monthlyBudget,
        startingBalance: user.startingBalance,
        preferences: readPreferences(user),
      },
      subjects,
      untisConfig: toSafeUntisConfig(untisConfig),
    });
  } catch (error) {
    return serverError('GET /settings', error);
  }
}

interface SubjectPayload {
  id?: string;
  name?: string;
  colorHex?: string;
  untisCode?: string | null;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await readJson(req);

    const displayName = cleanString(body.displayName, 60);
    const monthlyBudget = body.monthlyBudget !== undefined ? toNumber(body.monthlyBudget) : undefined;
    const startingBalance = body.startingBalance !== undefined ? toNumber(body.startingBalance) : undefined;
    if (monthlyBudget === null || (monthlyBudget !== undefined && monthlyBudget < 0)) {
      return jsonError('Monatsbudget muss eine positive Zahl sein');
    }
    if (startingBalance === null) return jsonError('Ungültiger Startkontostand');

    const preferences =
      body.preferences && typeof body.preferences === 'object'
        ? JSON.stringify({ ...readPreferences(user), ...body.preferences })
        : undefined;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        ...(displayName && { displayName }),
        ...(monthlyBudget !== undefined && { monthlyBudget }),
        ...(startingBalance !== undefined && { startingBalance }),
        ...(preferences && { preferences }),
      },
    });

    if (Array.isArray(body.deletedSubjectIds) && body.deletedSubjectIds.length) {
      await db.subject.deleteMany({
        where: { userId: user.id, id: { in: body.deletedSubjectIds.map(String) } },
      });
    }

    if (Array.isArray(body.subjects)) {
      for (const subj of body.subjects as SubjectPayload[]) {
        const name = cleanString(subj.name, 60);
        const colorHex = subj.colorHex && HEX_COLOR.test(subj.colorHex) ? subj.colorHex : undefined;
        const untisCode = subj.untisCode !== undefined ? cleanString(subj.untisCode, 12) || null : undefined;

        if (subj.id) {
          const { count } = await db.subject.updateMany({
            where: { id: subj.id, userId: user.id },
            data: { ...(name && { name }), ...(colorHex && { colorHex }), ...(untisCode !== undefined && { untisCode }) },
          });
          // Lessons display the subject color, keep them in sync.
          if (count && colorHex) {
            await db.scheduleBlock.updateMany({ where: { userId: user.id, subjectId: subj.id }, data: { colorHex } });
          }
        } else if (name) {
          await db.subject.create({
            data: { userId: user.id, name, colorHex: colorHex ?? '#6366F1', untisCode: untisCode ?? null },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        displayName: updatedUser.displayName,
        monthlyBudget: updatedUser.monthlyBudget,
        startingBalance: updatedUser.startingBalance,
      },
    });
  } catch (error) {
    return serverError('POST /settings', error, 'Einstellungen konnten nicht gespeichert werden');
  }
}
