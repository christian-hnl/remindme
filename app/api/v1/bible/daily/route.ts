import { NextResponse } from 'next/server';
import { serverError, toNumber } from '@/lib/api';
import { DEFAULT_TRANSLATION } from '@/lib/bible/books';
import { getDailyVerse, isTranslation } from '@/lib/bible/source';

export const dynamic = 'force-dynamic';

/** Verse of the day; ?offset=n gives another verse from the same collection. */
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const translationParam = params.get('translation');
    const translation = isTranslation(translationParam) ? translationParam : DEFAULT_TRANSLATION;
    const offset = Math.round(toNumber(params.get('offset')) ?? 0);

    return NextResponse.json(await getDailyVerse(translation, offset));
  } catch (error) {
    return serverError('GET /bible/daily', error, error instanceof Error ? error.message : 'Tagesvers konnte nicht geladen werden');
  }
}
