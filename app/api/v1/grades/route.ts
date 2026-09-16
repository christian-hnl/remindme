import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { DEFAULT_GRADE_WEIGHT, GRADE_KINDS } from '@/lib/school';
import { cleanString, jsonError, pickEnum, readJson, serverError, toDate, toNumber } from '@/lib/api';

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const value = toNumber(body.value);
    if (value === null || value < 1 || value > 5) return jsonError('Die Note muss zwischen 1 und 5 liegen');

    const user = await getCurrentUser();
    const subject = body.subjectId ? await db.subject.findFirst({ where: { id: String(body.subjectId), userId: user.id } }) : null;
    if (!subject) return jsonError('Bitte ein Fach auswählen');

    const kind = pickEnum(body.kind, GRADE_KINDS) ?? 'test';
    const weight = toNumber(body.weight);
    const grade = await db.grade.create({
      data: {
        userId: user.id,
        subjectId: subject.id,
        value: Math.round(value * 2) / 2,
        kind,
        weight: weight !== null && weight > 0 ? weight : DEFAULT_GRADE_WEIGHT[kind],
        title: cleanString(body.title, 120) || null,
        date: toDate(body.date) ?? new Date(),
      },
      include: { subject: true },
    });
    return NextResponse.json(grade, { status: 201 });
  } catch (error) {
    return serverError('POST /grades', error, 'Note konnte nicht gespeichert werden');
  }
}
