import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';

type Params = { params: { id: string } };

/** Adds one checkable topic ("Stoff") to an exam. */
export async function POST(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const title = cleanString(body.title, 200);
    if (!title) return jsonError('Thema fehlt');

    const user = await getCurrentUser();
    const exam = await db.exam.findFirst({ where: { id: params.id, userId: user.id } });
    if (!exam) return jsonError('Prüfung nicht gefunden', 404);

    const last = await db.examTopic.findFirst({ where: { examId: exam.id }, orderBy: { position: 'desc' } });
    const topic = await db.examTopic.create({ data: { examId: exam.id, title, position: (last?.position ?? 0) + 1 } });
    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    return serverError('POST /exams/[id]/topics', error, 'Thema konnte nicht gespeichert werden');
  }
}
