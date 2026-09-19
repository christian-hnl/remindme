import { db } from '@/lib/db';
import { BIBLE_TRANSLATIONS, DAILY_VERSES, bookByNr, dailyVerseIndex, formatReference, type BibleTranslation } from './books';

const API = 'https://api.getbible.net/v2';
const REQUEST_TIMEOUT_MS = 20_000;

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapterData {
  translation: BibleTranslation;
  bookNr: number;
  bookName: string;
  chapter: number;
  chapterCount: number;
  verses: BibleVerse[];
}

export const isTranslation = (value: unknown): value is BibleTranslation =>
  typeof value === 'string' && BIBLE_TRANSLATIONS.some((t) => t.id === value);

/**
 * Downloads a whole book once and stores every chapter. One request gives the real chapter
 * count and makes all further reading instant – and offline.
 */
async function cacheBook(translation: BibleTranslation, bookNr: number) {
  let response: Response;
  try {
    response = await fetch(`${API}/${translation}/${bookNr}.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error('Bibeltext konnte nicht geladen werden – bist du online?');
  }
  if (!response.ok) throw new Error(`Bibeltext nicht gefunden (HTTP ${response.status}).`);

  const json = await response.json().catch(() => null);
  const chapters: any[] = json?.chapters ?? [];
  if (!json || chapters.length === 0) throw new Error('Die Bibel-Quelle lieferte keinen Text.');

  const name = String(json.name ?? bookByNr(bookNr)?.name ?? `Buch ${bookNr}`);
  await db.bibleBook.upsert({
    where: { translation_bookNr: { translation, bookNr } },
    update: { name, chapterCount: chapters.length, fetchedAt: new Date() },
    create: { translation, bookNr, name, chapterCount: chapters.length },
  });

  for (const chapter of chapters) {
    const nr = Number(chapter.chapter);
    const verses: BibleVerse[] = (chapter.verses ?? []).map((v: any) => ({
      verse: Number(v.verse),
      text: String(v.text ?? '').replace(/\s+/g, ' ').trim(),
    }));
    if (!nr || verses.length === 0) continue;
    const data = { translation, bookNr, chapter: nr, verses: JSON.stringify(verses) };
    await db.bibleChapter.upsert({
      where: { translation_bookNr_chapter: { translation, bookNr, chapter: nr } },
      update: { verses: data.verses },
      create: data,
    });
  }

  return { name, chapterCount: chapters.length };
}

export async function getChapter(translation: BibleTranslation, bookNr: number, chapter: number): Promise<BibleChapterData> {
  const info = bookByNr(bookNr);
  if (!info) throw new Error('Dieses Buch gibt es nicht.');

  let book = await db.bibleBook.findUnique({ where: { translation_bookNr: { translation, bookNr } } });
  let row = book ? await db.bibleChapter.findUnique({ where: { translation_bookNr_chapter: { translation, bookNr, chapter } } }) : null;

  if (!book || !row) {
    const fetched = await cacheBook(translation, bookNr);
    book = book ?? { id: '', translation, bookNr, name: fetched.name, chapterCount: fetched.chapterCount, fetchedAt: new Date() };
    row = await db.bibleChapter.findUnique({ where: { translation_bookNr_chapter: { translation, bookNr, chapter } } });
  }
  if (!row) throw new Error(`${info.name} hat kein Kapitel ${chapter}.`);

  return {
    translation,
    bookNr,
    bookName: book?.name ?? info.name,
    chapter,
    chapterCount: book?.chapterCount ?? info.chapters,
    verses: JSON.parse(row.verses) as BibleVerse[],
  };
}

export interface DailyVerse {
  reference: string;
  bookNr: number;
  bookName: string;
  chapter: number;
  verse: number;
  endVerse: number | null;
  text: string;
  translation: BibleTranslation;
}

/** The verse of the day; offset shows another one from the same list. */
export async function getDailyVerse(translation: BibleTranslation, offset = 0, date = new Date()): Promise<DailyVerse> {
  const [bookNr, chapter, verse, endVerse] = DAILY_VERSES[dailyVerseIndex(date, offset)];
  const data = await getChapter(translation, bookNr, chapter);
  const last = endVerse && endVerse > verse ? endVerse : verse;
  const text = data.verses
    .filter((v) => v.verse >= verse && v.verse <= last)
    .map((v) => v.text)
    .join(' ')
    .trim();

  return {
    reference: formatReference(data.bookName, chapter, verse, endVerse ?? undefined),
    bookNr,
    bookName: data.bookName,
    chapter,
    verse,
    endVerse: endVerse && endVerse > verse ? endVerse : null,
    text: text || 'Dieser Vers konnte nicht geladen werden.',
    translation,
  };
}
