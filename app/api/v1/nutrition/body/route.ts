import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { jsonError, readJson, serverError, toNumber } from '@/lib/api';
import { dayKey, isDayKey } from '@/lib/nutrition/dates';

/** Weekly check-in for the recomp trend: `{ day?, weightKg?, waistCm? }`. */
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const day = isDayKey(body.day) ? body.day : dayKey(new Date());
    const weightKg = toNumber(body.weightKg);
    const waistCm = toNumber(body.waistCm);
    const weight = weightKg !== null && weightKg >= 30 && weightKg <= 250 ? Math.round(weightKg * 10) / 10 : null;
    const waist = waistCm !== null && waistCm >= 40 && waistCm <= 200 ? Math.round(waistCm * 10) / 10 : null;
    if (weight === null && waist === null) return jsonError('Gewicht oder Taillenumfang eintragen');

    const user = await getCurrentUser();
    const metric = await db.bodyMetric.upsert({
      where: { userId_day: { userId: user.id, day } },
      update: { ...(weight !== null && { weightKg: weight }), ...(waist !== null && { waistCm: waist }) },
      create: { userId: user.id, day, weightKg: weight, waistCm: waist },
    });
    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    return serverError('POST /nutrition/body', error, 'Messung konnte nicht gespeichert werden');
  }
}
