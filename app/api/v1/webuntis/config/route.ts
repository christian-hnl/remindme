import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { DEMO_DEFAULTS, toSafeUntisConfig } from '@/lib/webuntis';
import { cleanString, readJson, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const config = await db.webUntisConfig.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, ...DEMO_DEFAULTS },
    });
    return NextResponse.json(toSafeUntisConfig(config));
  } catch (error) {
    return serverError('GET /webuntis/config', error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await readJson(req);

    const fields = {
      school: cleanString(body.school, 100) || undefined,
      schoolName: cleanString(body.schoolName, 120) || undefined,
      server: cleanString(body.server, 120)?.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || undefined,
      username: cleanString(body.username, 100) || undefined,
      // Empty string means "unchanged"; only an explicit clearPassword removes it.
      password: body.clearPassword ? null : typeof body.password === 'string' && body.password ? body.password : undefined,
      icalUrl: body.icalUrl !== undefined ? cleanString(body.icalUrl, 1000) || null : undefined,
      autoSync: typeof body.autoSync === 'boolean' ? body.autoSync : undefined,
      timetableScope: body.timetableScope === 'class' || body.timetableScope === 'personal' ? body.timetableScope : undefined,
    };

    const config = await db.webUntisConfig.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        school: fields.school ?? DEMO_DEFAULTS.school,
        schoolName: fields.schoolName ?? DEMO_DEFAULTS.schoolName,
        server: fields.server ?? DEMO_DEFAULTS.server,
        username: fields.username ?? DEMO_DEFAULTS.username,
        password: fields.password ?? null,
        icalUrl: fields.icalUrl ?? null,
        autoSync: fields.autoSync ?? true,
        timetableScope: fields.timetableScope ?? 'personal',
      },
      update: fields,
    });

    return NextResponse.json(toSafeUntisConfig(config));
  } catch (error) {
    return serverError('POST /webuntis/config', error, 'WebUntis-Einstellungen konnten nicht gespeichert werden');
  }
}
