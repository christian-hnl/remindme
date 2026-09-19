import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError, toNumber } from '@/lib/api';
import { DEFAULT_TRANSLATION, bookByNr } from '@/lib/bible/books';
import { isTranslation } from '@/lib/bible/source';

export const dynamic = 'force-dynamic';

/** Saves a verse. Saving the same verse again just updates its note. */
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const bookNr = Math.round(toNumber(body.bookNr) ?? 0);
    const chapter = Math.round(toNumber(body.chapter) ?? 0);
    const verse = Math.round(toNumber(body.verse) ?? 0);
    const text = cleanString(body.text, 2000);
    const book = bookByNr(bookNr);

    if (!book || chapter < 1 || verse < 1) return jsonError('Ungültige Bibelstelle');
    if (!text) return jsonError('Der Verstext fehlt');

    const user = await getCurrentUser();
    const data = {
      translation: isTranslation(body.translation) ? body.translation : DEFAULT_TRANSLATION,
      bookName: cleanString(body.bookName, 60) || book.name,
      text,
      note: cleanString(body.note, 1000) || null,
    };

    const bookmark = await db.bibleBookmark.upsert({
      where: { userId_bookNr_chapter_verse: { userId: user.id, bookNr, chapter, verse } },
      update: data,
      create: { userId: user.id, bookNr, chapter, verse, ...data },
    });
    return NextResponse.json(bookmark, { status: 201 });
  } catch (error) {
    return serverError('POST /bible/bookmarks', error, 'Vers konnte nicht gespeichert werden');
  }
}
