import { db } from '@/lib/db';
import { BIBLE_TRANSLATIONS, DAILY_VERSES, GRUENEWALD_FILES, bookByNr, booksFor, dailyVerseIndex, formatReference, translationInfo, type BibleTranslation } from './books';

const GETBIBLE_API = 'https://api.getbible.net/v2';
const BOLLS_API = 'https://bolls.life';
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
  const sourceId = translationInfo(translation)?.sourceId ?? translation;
  let response: Response;
  try {
    response = await fetch(`${GETBIBLE_API}/${sourceId}/${bookNr}.json`, {
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

/** The Menge text carries line breaks and italic glosses as HTML. */
const stripHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** bolls.life serves single chapters, so the chapter count comes from the static book list. */
async function cacheBollsChapter(translation: BibleTranslation, bookNr: number, chapter: number) {
  const info = translationInfo(translation);
  const book = bookByNr(bookNr);
  if (!info || !book) throw new Error('Diese Ausgabe kennt das Buch nicht.');

  let response: Response;
  try {
    response = await fetch(`${BOLLS_API}/get-chapter/${info.sourceId}/${bookNr}/${chapter}/`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error('Bibeltext konnte nicht geladen werden – bist du online?');
  }
  if (!response.ok) throw new Error(`Bibeltext nicht gefunden (HTTP ${response.status}).`);

  const json = await response.json().catch(() => null);
  const verses: BibleVerse[] = (Array.isArray(json) ? json : [])
    .map((v: any) => ({ verse: Number(v.verse), text: stripHtml(String(v.text ?? '')) }))
    .filter((v: BibleVerse) => v.verse > 0 && v.text);
  if (verses.length === 0) throw new Error(`${book.name} hat kein Kapitel ${chapter}.`);

  await db.bibleBook.upsert({
    where: { translation_bookNr: { translation, bookNr } },
    update: { name: book.name, chapterCount: book.chapters, fetchedAt: new Date() },
    create: { translation, bookNr, name: book.name, chapterCount: book.chapters },
  });
  await db.bibleChapter.upsert({
    where: { translation_bookNr_chapter: { translation, bookNr, chapter } },
    update: { verses: JSON.stringify(verses) },
    create: { translation, bookNr, chapter, verses: JSON.stringify(verses) },
  });
}

const ROUNDTRIP_BASE = 'https://raw.githubusercontent.com/bibel';

const decodeEntities = (value: string) =>
  value
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&auml;/g, 'ä')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&');

/**
 * Editions published as "RoundtripHTML" keep one file per chapter, with every verse in a
 * <div class="v" id="vN">. Section headings sit inside as <h2> and are dropped.
 */
async function cacheRoundtripChapter(translation: BibleTranslation, bookNr: number, chapter: number) {
  const info = translationInfo(translation);
  const file = GRUENEWALD_FILES[bookNr];
  const book = bookByNr(bookNr);
  if (!info || !file || !book) throw new Error('Diese Ausgabe kennt das Buch nicht.');

  const url = `${ROUNDTRIP_BASE}/${info.sourceId}/RoundtripHTML/${file.folder}/${encodeURIComponent(file.abbr)}_${chapter}.html`;
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new Error('Bibeltext konnte nicht geladen werden – bist du online?');
  }
  if (response.status === 404) throw new Error(`${book.name} hat kein Kapitel ${chapter}.`);
  if (!response.ok) throw new Error(`Bibeltext nicht gefunden (HTTP ${response.status}).`);

  const html = await response.text();
  const verses: BibleVerse[] = [];
  for (const match of html.matchAll(/<div class="v" id="v(\d+)">([\s\S]*?)<\/div>/g)) {
    const text = decodeEntities(
      match[2]
        .replace(/<h2[\s\S]*?<\/h2>/g, ' ')
        .replace(/<span class="vn">\d+<\/span>/g, ' ')
        // Footnote markers would otherwise leave a stray digit in the verse.
        .replace(/<sup[\s\S]*?<\/sup>/g, '')
        .replace(/<[^>]+>/g, ' ')
    )
      .replace(/\s+/g, ' ')
      .trim();
    if (text) verses.push({ verse: Number(match[1]), text });
  }
  if (verses.length === 0) throw new Error(`${book.name} ${chapter} enthält keinen Text.`);

  await db.bibleBook.upsert({
    where: { translation_bookNr: { translation, bookNr } },
    update: { name: book.name, chapterCount: book.chapters, fetchedAt: new Date() },
    create: { translation, bookNr, name: book.name, chapterCount: book.chapters },
  });
  await db.bibleChapter.upsert({
    where: { translation_bookNr_chapter: { translation, bookNr, chapter } },
    update: { verses: JSON.stringify(verses) },
    create: { translation, bookNr, chapter, verses: JSON.stringify(verses) },
  });
}

export async function getChapter(translation: BibleTranslation, bookNr: number, chapter: number): Promise<BibleChapterData> {
  const info = bookByNr(bookNr);
  if (!info) throw new Error('Dieses Buch gibt es nicht.');
  if (!booksFor(translation).some((b) => b.nr === bookNr)) {
    throw new Error(`${info.name} steht nur in katholischen Ausgaben – wechsle die Übersetzung.`);
  }

  let book = await db.bibleBook.findUnique({ where: { translation_bookNr: { translation, bookNr } } });
  let row = book ? await db.bibleChapter.findUnique({ where: { translation_bookNr_chapter: { translation, bookNr, chapter } } }) : null;

  if (!book || !row) {
    const source = translationInfo(translation)?.source;
    if (source === 'bolls') {
      await cacheBollsChapter(translation, bookNr, chapter);
    } else if (source === 'roundtriphtml') {
      await cacheRoundtripChapter(translation, bookNr, chapter);
    } else {
      const fetched = await cacheBook(translation, bookNr);
      book = book ?? { id: '', translation, bookNr, name: fetched.name, chapterCount: fetched.chapterCount, fetchedAt: new Date() };
    }
    book = await db.bibleBook.findUnique({ where: { translation_bookNr: { translation, bookNr } } });
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
