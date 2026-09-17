import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';

type Params = { params: { id: string; topicId: string } };

async function ownTopic(params: Params['params']) {
  const user = await getCurrentUser();
  const exam = await db.exam.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true } });
  if (!exam) return null;
  return db.examTopic.findFirst({ where: { id: params.topicId, examId: exam.id } });
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await readJson(req);
    const topic = await ownTopic(params);
    if (!topic) return jsonError('Nicht gefunden', 404);

    const data: Record<string, unknown> = {};
    if (body.isDone !== undefined) data.isDone = !!body.isDone;
    if (body.title !== undefined) {
      const title = cleanString(body.title, 200);
      if (!title) return jsonError('Thema fehlt');
      data.title = title;
    }
    const updated = await db.examTopic.update({ where: { id: topic.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError('PATCH /exams/topics', error, 'Konnte nicht gespeichert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const topic = await ownTopic(params);
    if (!topic) return jsonError('Nicht gefunden', 404);
    await db.examTopic.delete({ where: { id: topic.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /exams/topics', error, 'Konnte nicht gelöscht werden');
  }
}
