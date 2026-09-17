import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { toSafeUntisConfig } from '@/lib/webuntis';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const config = await db.webUntisConfig.findUnique({ where: { userId: user.id } });
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
      selectedGroups: Array.isArray(body.selectedGroups)
        ? JSON.stringify(body.selectedGroups.filter((g: unknown) => typeof g === 'string').map((g: string) => g.slice(0, 60)).slice(0, 20))
        : undefined,
      hiddenLessons: Array.isArray(body.hiddenLessons)
        ? JSON.stringify(body.hiddenLessons.filter((k: unknown) => typeof k === 'string').map((k: string) => k.slice(0, 120)).slice(0, 200))
        : undefined,
      rotatingLessons: Array.isArray(body.rotatingLessons)
        ? JSON.stringify(
            body.rotatingLessons
              .filter(
                (r: any) =>
                  r &&
                  Array.isArray(r.keys) &&
                  r.keys.length > 1 &&
                  r.keys.every((k: unknown) => typeof k === 'string') &&
                  typeof r.anchorMonday === 'string' &&
                  /^\d{4}-\d{2}-\d{2}$/.test(r.anchorMonday) &&
                  typeof r.anchorKey === 'string' &&
                  r.keys.includes(r.anchorKey)
              )
              .slice(0, 50)
              .map((r: any) => ({ keys: r.keys.slice(0, 6), anchorMonday: r.anchorMonday, anchorKey: r.anchorKey }))
          )
        : undefined,
    };

    const existing = await db.webUntisConfig.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!existing && !fields.icalUrl && !(fields.school && fields.server)) {
      return jsonError('Bitte Server und Schul-Kürzel eintragen – oder einen iCal-Link.');
    }

    const config = await db.webUntisConfig.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        school: fields.school ?? '',
        schoolName: fields.schoolName ?? fields.school ?? '',
        server: fields.server ?? '',
        username: fields.username ?? '',
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
