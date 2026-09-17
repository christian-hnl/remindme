import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { EXAM_KINDS, EXAM_KIND_LABELS } from '@/lib/school';
import { cleanString, jsonError, pickEnum, readJson, serverError, toDate } from '@/lib/api';

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const date = toDate(body.date);
    if (!date) return jsonError('Bitte ein Datum angeben');

    const user = await getCurrentUser();
    const subject = body.subjectId ? await db.subject.findFirst({ where: { id: String(body.subjectId), userId: user.id } }) : null;
    const kind = pickEnum(body.kind, EXAM_KINDS) ?? 'test';

    const exam = await db.exam.create({
      data: {
        userId: user.id,
        subjectId: subject?.id ?? null,
        kind,
        title: cleanString(body.title, 120) || `${subject ? `${subject.name} ` : ''}${EXAM_KIND_LABELS[kind]}`,
        date,
        topics: cleanString(body.topics, 2000) || null,
      },
      include: { subject: true, topicItems: true },
    });
    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    return serverError('POST /exams', error, 'Prüfung konnte nicht gespeichert werden');
  }
}
