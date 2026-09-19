import { NextResponse } from 'next/server';
import { jsonError, serverError, toNumber } from '@/lib/api';
import { DEFAULT_TRANSLATION, bookByNr } from '@/lib/bible/books';
import { getChapter, isTranslation } from '@/lib/bible/source';

export const dynamic = 'force-dynamic';

/** One chapter of the Bible – cached in the database after the first request. */
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const translationParam = params.get('translation');
    const translation = isTranslation(translationParam) ? translationParam : DEFAULT_TRANSLATION;
    const bookNr = Math.round(toNumber(params.get('book')) ?? 0);
    const chapter = Math.round(toNumber(params.get('chapter')) ?? 1);

    const book = bookByNr(bookNr);
    if (!book) return jsonError('Unbekanntes Buch');
    if (chapter < 1) return jsonError('Ungültiges Kapitel');

    return NextResponse.json(await getChapter(translation, bookNr, chapter));
  } catch (error) {
    return serverError('GET /bible/chapter', error, error instanceof Error ? error.message : 'Kapitel konnte nicht geladen werden');
  }
}
