import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { EXAM_KINDS } from '@/lib/school';
import { cleanString, jsonError, pickEnum, readJson, serverError, toDate } from '@/lib/api';

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const exam = await db.exam.findFirst({ where: { id: params.id, userId: user.id } });
    if (!exam) return jsonError('Prüfung nicht gefunden', 404);

    const body = await readJson(req);
    const data: Prisma.ExamUncheckedUpdateInput = {};
    if (body.title !== undefined) data.title = cleanString(body.title, 120) || exam.title;
    const kind = pickEnum(body.kind, EXAM_KINDS);
    if (kind) data.kind = kind;
    if (body.date !== undefined) {
      const date = toDate(body.date);
      if (!date) return jsonError('Ungültiges Datum');
      data.date = date;
    }
    if (body.topics !== undefined) data.topics = cleanString(body.topics, 2000) || null;
    if (typeof body.isDone === 'boolean') data.isDone = body.isDone;
    if (body.subjectId !== undefined) {
      const subject = body.subjectId ? await db.subject.findFirst({ where: { id: String(body.subjectId), userId: user.id } }) : null;
      data.subjectId = subject?.id ?? null;
    }

    const updated = await db.exam.update({
      where: { id: exam.id },
      data,
      include: { subject: true, topicItems: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError('PATCH /exams/[id]', error, 'Prüfung konnte nicht gespeichert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { count } = await db.exam.deleteMany({ where: { id: params.id, userId: user.id } });
    if (!count) return jsonError('Prüfung nicht gefunden', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /exams/[id]', error, 'Prüfung konnte nicht gelöscht werden');
  }
}
