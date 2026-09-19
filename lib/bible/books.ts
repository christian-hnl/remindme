// Shared by server and client – keep free of server-only imports.

export type BibleTranslation = 'schlachter' | 'menge' | 'gruenewald' | 'luther1545' | 'elberfelder1905' | 'vulgate' | 'douayrheims';

export interface TranslationInfo {
  id: BibleTranslation;
  label: string;
  short: string;
  language: 'de' | 'la' | 'en';
  /** catholic editions carry the seven deuterocanonical books as well. */
  canon: 'protestant' | 'catholic';
  /** Where the text comes from – see lib/bible/source.ts. */
  source: 'getbible' | 'bolls' | 'roundtriphtml';
  sourceId: string;
}

/**
 * Only editions that are in the public domain. The Einheitsübersetzung and the modern Zürcher
 * Bibel are still under copyright, so they can't be included.
 */
export const BIBLE_TRANSLATIONS: TranslationInfo[] = [
  { id: 'schlachter', label: 'Schlachter 1951', short: 'SCH51', language: 'de', canon: 'protestant', source: 'getbible', sourceId: 'schlachter' },
  { id: 'menge', label: 'Menge 1939', short: 'MENGE', language: 'de', canon: 'protestant', source: 'bolls', sourceId: 'MB' },
  {
    id: 'gruenewald',
    label: 'Grünewald – Rießler/Storr 1934 (kath.)',
    short: 'GRÜN',
    language: 'de',
    canon: 'catholic',
    source: 'roundtriphtml',
    sourceId: 'Gruenewald',
  },
  { id: 'luther1545', label: 'Luther 1545', short: 'LUT45', language: 'de', canon: 'protestant', source: 'getbible', sourceId: 'luther1545' },
  { id: 'elberfelder1905', label: 'Elberfelder 1905', short: 'ELB05', language: 'de', canon: 'protestant', source: 'getbible', sourceId: 'elberfelder1905' },
  { id: 'douayrheims', label: 'Douay-Rheims (englisch, kath.)', short: 'DR', language: 'en', canon: 'catholic', source: 'getbible', sourceId: 'douayrheims' },
  { id: 'vulgate', label: 'Vulgata Clementina (lat., kath.)', short: 'VUL', language: 'la', canon: 'catholic', source: 'getbible', sourceId: 'vulgate' },
];

export const translationInfo = (id: string) => BIBLE_TRANSLATIONS.find((t) => t.id === id);

export const DEFAULT_TRANSLATION: BibleTranslation = 'schlachter';

export interface BibleBookInfo {
  nr: number;
  name: string;
  /** Common short forms used when typing a reference. */
  aliases: string[];
  chapters: number;
  testament: 'at' | 'nt' | 'spaet';
}

/** Chapter counts are the usual German ones; the reader corrects them from the real text. */
export const BIBLE_BOOKS: BibleBookInfo[] = [
  { nr: 1, name: '1. Mose', aliases: ['1mo', 'gen', 'genesis'], chapters: 50, testament: 'at' },
  { nr: 2, name: '2. Mose', aliases: ['2mo', 'ex', 'exodus'], chapters: 40, testament: 'at' },
  { nr: 3, name: '3. Mose', aliases: ['3mo', 'lev', 'levitikus'], chapters: 27, testament: 'at' },
  { nr: 4, name: '4. Mose', aliases: ['4mo', 'num', 'numeri'], chapters: 36, testament: 'at' },
  { nr: 5, name: '5. Mose', aliases: ['5mo', 'dtn', 'deu'], chapters: 34, testament: 'at' },
  { nr: 6, name: 'Josua', aliases: ['jos'], chapters: 24, testament: 'at' },
  { nr: 7, name: 'Richter', aliases: ['ri', 'ric'], chapters: 21, testament: 'at' },
  { nr: 8, name: 'Ruth', aliases: ['rut'], chapters: 4, testament: 'at' },
  { nr: 9, name: '1. Samuel', aliases: ['1sam'], chapters: 31, testament: 'at' },
  { nr: 10, name: '2. Samuel', aliases: ['2sam'], chapters: 24, testament: 'at' },
  { nr: 11, name: '1. Könige', aliases: ['1kön', '1koe', '1kg'], chapters: 22, testament: 'at' },
  { nr: 12, name: '2. Könige', aliases: ['2kön', '2koe', '2kg'], chapters: 25, testament: 'at' },
  { nr: 13, name: '1. Chronik', aliases: ['1chr'], chapters: 29, testament: 'at' },
  { nr: 14, name: '2. Chronik', aliases: ['2chr'], chapters: 36, testament: 'at' },
  { nr: 15, name: 'Esra', aliases: ['esr'], chapters: 10, testament: 'at' },
  { nr: 16, name: 'Nehemia', aliases: ['neh'], chapters: 13, testament: 'at' },
  { nr: 17, name: 'Esther', aliases: ['est'], chapters: 10, testament: 'at' },
  { nr: 18, name: 'Hiob', aliases: ['hi', 'job'], chapters: 42, testament: 'at' },
  { nr: 19, name: 'Psalmen', aliases: ['ps', 'psalm'], chapters: 150, testament: 'at' },
  { nr: 20, name: 'Sprüche', aliases: ['spr', 'sprueche'], chapters: 31, testament: 'at' },
  { nr: 21, name: 'Prediger', aliases: ['pred', 'koh'], chapters: 12, testament: 'at' },
  { nr: 22, name: 'Hoheslied', aliases: ['hld', 'hohelied'], chapters: 8, testament: 'at' },
  { nr: 23, name: 'Jesaja', aliases: ['jes'], chapters: 66, testament: 'at' },
  { nr: 24, name: 'Jeremia', aliases: ['jer'], chapters: 52, testament: 'at' },
  { nr: 25, name: 'Klagelieder', aliases: ['klgl', 'klag'], chapters: 5, testament: 'at' },
  { nr: 26, name: 'Hesekiel', aliases: ['hes', 'ez'], chapters: 48, testament: 'at' },
  { nr: 27, name: 'Daniel', aliases: ['dan'], chapters: 12, testament: 'at' },
  { nr: 28, name: 'Hosea', aliases: ['hos'], chapters: 14, testament: 'at' },
  { nr: 29, name: 'Joel', aliases: ['joe'], chapters: 4, testament: 'at' },
  { nr: 30, name: 'Amos', aliases: ['am'], chapters: 9, testament: 'at' },
  { nr: 31, name: 'Obadja', aliases: ['ob'], chapters: 1, testament: 'at' },
  { nr: 32, name: 'Jona', aliases: ['jon'], chapters: 4, testament: 'at' },
  { nr: 33, name: 'Micha', aliases: ['mi'], chapters: 7, testament: 'at' },
  { nr: 34, name: 'Nahum', aliases: ['nah'], chapters: 3, testament: 'at' },
  { nr: 35, name: 'Habakuk', aliases: ['hab'], chapters: 3, testament: 'at' },
  { nr: 36, name: 'Zephanja', aliases: ['zeph', 'zef'], chapters: 3, testament: 'at' },
  { nr: 37, name: 'Haggai', aliases: ['hag'], chapters: 2, testament: 'at' },
  { nr: 38, name: 'Sacharja', aliases: ['sach'], chapters: 14, testament: 'at' },
  { nr: 39, name: 'Maleachi', aliases: ['mal'], chapters: 3, testament: 'at' },
  { nr: 40, name: 'Matthäus', aliases: ['mt', 'matt'], chapters: 28, testament: 'nt' },
  { nr: 41, name: 'Markus', aliases: ['mk', 'mark'], chapters: 16, testament: 'nt' },
  { nr: 42, name: 'Lukas', aliases: ['lk', 'luk'], chapters: 24, testament: 'nt' },
  { nr: 43, name: 'Johannes', aliases: ['joh', 'jh'], chapters: 21, testament: 'nt' },
  { nr: 44, name: 'Apostelgeschichte', aliases: ['apg', 'act'], chapters: 28, testament: 'nt' },
  { nr: 45, name: 'Römer', aliases: ['röm', 'roem', 'rom'], chapters: 16, testament: 'nt' },
  { nr: 46, name: '1. Korinther', aliases: ['1kor'], chapters: 16, testament: 'nt' },
  { nr: 47, name: '2. Korinther', aliases: ['2kor'], chapters: 13, testament: 'nt' },
  { nr: 48, name: 'Galater', aliases: ['gal'], chapters: 6, testament: 'nt' },
  { nr: 49, name: 'Epheser', aliases: ['eph'], chapters: 6, testament: 'nt' },
  { nr: 50, name: 'Philipper', aliases: ['phil', 'php'], chapters: 4, testament: 'nt' },
  { nr: 51, name: 'Kolosser', aliases: ['kol'], chapters: 4, testament: 'nt' },
  { nr: 52, name: '1. Thessalonicher', aliases: ['1thess', '1th'], chapters: 5, testament: 'nt' },
  { nr: 53, name: '2. Thessalonicher', aliases: ['2thess', '2th'], chapters: 3, testament: 'nt' },
  { nr: 54, name: '1. Timotheus', aliases: ['1tim'], chapters: 6, testament: 'nt' },
  { nr: 55, name: '2. Timotheus', aliases: ['2tim'], chapters: 4, testament: 'nt' },
  { nr: 56, name: 'Titus', aliases: ['tit'], chapters: 3, testament: 'nt' },
  { nr: 57, name: 'Philemon', aliases: ['phlm', 'phm'], chapters: 1, testament: 'nt' },
  { nr: 58, name: 'Hebräer', aliases: ['hebr', 'heb'], chapters: 13, testament: 'nt' },
  { nr: 59, name: 'Jakobus', aliases: ['jak'], chapters: 5, testament: 'nt' },
  { nr: 60, name: '1. Petrus', aliases: ['1petr', '1pe'], chapters: 5, testament: 'nt' },
  { nr: 61, name: '2. Petrus', aliases: ['2petr', '2pe'], chapters: 3, testament: 'nt' },
  { nr: 62, name: '1. Johannes', aliases: ['1joh'], chapters: 5, testament: 'nt' },
  { nr: 63, name: '2. Johannes', aliases: ['2joh'], chapters: 1, testament: 'nt' },
  { nr: 64, name: '3. Johannes', aliases: ['3joh'], chapters: 1, testament: 'nt' },
  { nr: 65, name: 'Judas', aliases: ['jud'], chapters: 1, testament: 'nt' },
  { nr: 66, name: 'Offenbarung', aliases: ['offb', 'apk', 'off'], chapters: 22, testament: 'nt' },
];

export const bookByNr = (nr: number) => [...BIBLE_BOOKS, ...DEUTEROCANONICAL_BOOKS].find((b) => b.nr === nr);

/**
 * The seven deuterocanonical books ("Spätschriften"), only present in catholic editions.
 * The numbers are the ones the source uses for them.
 */
export const DEUTEROCANONICAL_BOOKS: BibleBookInfo[] = [
  { nr: 69, name: 'Tobit', aliases: ['tob', 'tobias'], chapters: 14, testament: 'spaet' },
  { nr: 70, name: 'Judit', aliases: ['jdt', 'judith'], chapters: 16, testament: 'spaet' },
  { nr: 73, name: 'Weisheit', aliases: ['weish', 'sap'], chapters: 19, testament: 'spaet' },
  { nr: 74, name: 'Jesus Sirach', aliases: ['sir', 'sirach', 'ekklesiastikus'], chapters: 51, testament: 'spaet' },
  { nr: 75, name: 'Baruch', aliases: ['bar'], chapters: 6, testament: 'spaet' },
  { nr: 80, name: '1. Makkabäer', aliases: ['1makk', '1mak'], chapters: 16, testament: 'spaet' },
  { nr: 81, name: '2. Makkabäer', aliases: ['2makk', '2mak'], chapters: 15, testament: 'spaet' },
];

/** The books a translation actually contains. */
export function booksFor(translation: string): BibleBookInfo[] {
  return translationInfo(translation)?.canon === 'catholic' ? [...BIBLE_BOOKS, ...DEUTEROCANONICAL_BOOKS] : BIBLE_BOOKS;
}

export const bookByNrIn = (translation: string, nr: number) => booksFor(translation).find((b) => b.nr === nr);


const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');

/** Finds a book by name, alias or prefix ("joh", "1. Kor", "psalm"). */
export function findBook(query: string): BibleBookInfo | undefined {
  const needle = normalize(query);
  if (!needle) return undefined;
  const candidates = [...BIBLE_BOOKS, ...DEUTEROCANONICAL_BOOKS].map((book) => ({
    book,
    keys: [normalize(book.name), ...book.aliases.map(normalize)],
  }));
  return (
    candidates.find((c) => c.keys.includes(needle))?.book ??
    candidates.find((c) => c.keys.some((k) => k.startsWith(needle) && needle.length >= 2))?.book
  );
}

export interface BibleReference {
  bookNr: number;
  bookName: string;
  chapter: number;
  verse?: number;
}

/** Parses "Joh 3,16", "1. Kor 13", "Psalm 23:1" and similar. */
export function parseReference(input: string): BibleReference | null {
  const match = input.trim().match(/^(.+?)[\s.]*(\d+)(?:\s*[,:.]\s*(\d+))?\s*$/);
  if (!match) {
    const book = findBook(input);
    return book ? { bookNr: book.nr, bookName: book.name, chapter: 1 } : null;
  }
  const book = findBook(match[1]);
  if (!book) return null;
  const chapter = Math.min(Math.max(1, Number(match[2])), book.chapters);
  const verse = match[3] ? Number(match[3]) : undefined;
  return { bookNr: book.nr, bookName: book.name, chapter, verse };
}

export const formatReference = (bookName: string, chapter: number, verse?: number, endVerse?: number) =>
  `${bookName} ${chapter}${verse ? `,${verse}${endVerse && endVerse > verse ? `-${endVerse}` : ''}` : ''}`;

/**
 * Verses for the daily rotation – classics on trust, comfort, courage and gratitude.
 * [book, chapter, verse] or [book, chapter, verse, lastVerse] for a short passage.
 */
export const DAILY_VERSES: [number, number, number, number?][] = [
  [19, 23, 1, 3], [40, 6, 33], [45, 8, 28], [50, 4, 6, 7], [23, 41, 10],
  [43, 3, 16], [19, 46, 2], [20, 3, 5, 6], [58, 11, 1], [46, 13, 4, 7],
  [19, 121, 1, 2], [40, 11, 28, 30], [45, 12, 2], [49, 2, 8, 9], [24, 29, 11],
  [19, 27, 1], [43, 14, 27], [60, 5, 7], [48, 5, 22, 23], [19, 119, 105],
  [25, 3, 22, 23], [45, 5, 8], [51, 3, 23], [40, 5, 14, 16], [19, 34, 19],
  [43, 8, 12], [55, 1, 7], [19, 37, 5], [23, 40, 31], [59, 1, 2, 4],
  [45, 15, 13], [19, 139, 23, 24], [42, 6, 31], [50, 2, 3, 4], [66, 21, 4],
  [19, 103, 2, 4], [40, 7, 7], [45, 8, 38, 39], [21, 3, 1], [62, 4, 18, 19],
  [19, 51, 12], [43, 15, 5], [47, 12, 9], [19, 91, 1, 2], [40, 28, 19, 20],
  [20, 16, 3], [23, 43, 1, 2], [44, 1, 8], [19, 16, 11], [61, 3, 9],
  [45, 12, 12], [19, 32, 8], [42, 10, 27], [48, 6, 9], [40, 22, 37, 39],
  [19, 19, 15], [24, 17, 7, 8], [43, 16, 33], [51, 3, 12, 14], [19, 62, 2, 3],
  [5, 31, 6], [6, 1, 9], [19, 40, 2, 4], [23, 26, 3], [45, 14, 8],
  [19, 100, 4, 5], [40, 6, 34], [58, 12, 1, 2], [19, 145, 18, 19], [59, 5, 16],
  [43, 13, 34, 35], [20, 17, 22], [19, 73, 26], [40, 5, 44, 45], [46, 10, 13],
  [19, 30, 6], [23, 55, 8, 9], [50, 4, 13], [19, 56, 4], [43, 10, 10],
  [45, 5, 3, 5], [19, 143, 8], [40, 6, 21], [62, 1, 9], [49, 4, 32],
  [19, 63, 2, 4], [24, 31, 3], [43, 6, 35], [51, 3, 15, 17], [19, 84, 12],
  [1, 1, 1], [19, 8, 4, 6], [40, 4, 4], [45, 10, 9, 10], [19, 130, 5, 6],
  [23, 53, 4, 5], [42, 15, 20], [60, 2, 24], [19, 42, 2, 3], [66, 3, 20],
  [20, 4, 23], [19, 118, 24], [43, 11, 25, 26], [54, 6, 6, 8], [19, 25, 4, 5],
  [23, 6, 8], [40, 16, 24, 25], [19, 90, 12], [48, 2, 20], [59, 4, 7, 8],
  [19, 133, 1], [44, 20, 35], [45, 13, 8, 10], [20, 22, 6], [19, 139, 13, 14],
  [43, 20, 29], [58, 13, 5], [19, 34, 9], [40, 18, 20], [66, 22, 20, 21],
];

/** The same verse for everyone on a given day, moving on at midnight. */
export function dailyVerseIndex(date = new Date(), offset = 0) {
  const key = Number(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`);
  // Spread consecutive days across the list instead of walking through it in order.
  return (((key * 7919) % DAILY_VERSES.length) + offset + DAILY_VERSES.length * 2) % DAILY_VERSES.length;
}

/**
 * File names of the Grünewald edition (RoundtripHTML): book number → folder and abbreviation,
 * e.g. 43 → nt/Joh_3.html. Its deuterocanonical books use the same numbers as the other
 * catholic editions here.
 */
export const GRUENEWALD_FILES: Record<number, { folder: 'ot' | 'nt'; abbr: string }> = {
  1: { folder: 'ot', abbr: 'Gen' }, 2: { folder: 'ot', abbr: 'Ex' }, 3: { folder: 'ot', abbr: 'Lev' },
  4: { folder: 'ot', abbr: 'Num' }, 5: { folder: 'ot', abbr: 'Dtn' }, 6: { folder: 'ot', abbr: 'Jos' },
  7: { folder: 'ot', abbr: 'Ri' }, 8: { folder: 'ot', abbr: 'Rut' }, 9: { folder: 'ot', abbr: '1Sam' },
  10: { folder: 'ot', abbr: '2Sam' }, 11: { folder: 'ot', abbr: '1Kön' }, 12: { folder: 'ot', abbr: '2Kön' },
  13: { folder: 'ot', abbr: '1Chr' }, 14: { folder: 'ot', abbr: '2Chr' }, 15: { folder: 'ot', abbr: 'Esra' },
  16: { folder: 'ot', abbr: 'Neh' }, 17: { folder: 'ot', abbr: 'Est' }, 18: { folder: 'ot', abbr: 'Ijob' },
  19: { folder: 'ot', abbr: 'Ps' }, 20: { folder: 'ot', abbr: 'Spr' }, 21: { folder: 'ot', abbr: 'Koh' },
  22: { folder: 'ot', abbr: 'Hld' }, 23: { folder: 'ot', abbr: 'Jes' }, 24: { folder: 'ot', abbr: 'Jer' },
  25: { folder: 'ot', abbr: 'Klgl' }, 26: { folder: 'ot', abbr: 'Ez' }, 27: { folder: 'ot', abbr: 'Dan' },
  28: { folder: 'ot', abbr: 'Hos' }, 29: { folder: 'ot', abbr: 'Joel' }, 30: { folder: 'ot', abbr: 'Amos' },
  31: { folder: 'ot', abbr: 'Obd' }, 32: { folder: 'ot', abbr: 'Jona' }, 33: { folder: 'ot', abbr: 'Mi' },
  34: { folder: 'ot', abbr: 'Nah' }, 35: { folder: 'ot', abbr: 'Hab' }, 36: { folder: 'ot', abbr: 'Zef' },
  37: { folder: 'ot', abbr: 'Hag' }, 38: { folder: 'ot', abbr: 'Sach' }, 39: { folder: 'ot', abbr: 'Mal' },
  40: { folder: 'nt', abbr: 'Mt' }, 41: { folder: 'nt', abbr: 'Mk' }, 42: { folder: 'nt', abbr: 'Lk' },
  43: { folder: 'nt', abbr: 'Joh' }, 44: { folder: 'nt', abbr: 'Apg' }, 45: { folder: 'nt', abbr: 'Röm' },
  46: { folder: 'nt', abbr: '1Kor' }, 47: { folder: 'nt', abbr: '2Kor' }, 48: { folder: 'nt', abbr: 'Gal' },
  49: { folder: 'nt', abbr: 'Eph' }, 50: { folder: 'nt', abbr: 'Phil' }, 51: { folder: 'nt', abbr: 'Kol' },
  52: { folder: 'nt', abbr: '1Thess' }, 53: { folder: 'nt', abbr: '2Thess' }, 54: { folder: 'nt', abbr: '1Tim' },
  55: { folder: 'nt', abbr: '2Tim' }, 56: { folder: 'nt', abbr: 'Tit' }, 57: { folder: 'nt', abbr: 'Phlm' },
  58: { folder: 'nt', abbr: 'Hebr' }, 59: { folder: 'nt', abbr: 'Jak' }, 60: { folder: 'nt', abbr: '1Petr' },
  61: { folder: 'nt', abbr: '2Petr' }, 62: { folder: 'nt', abbr: '1Joh' }, 63: { folder: 'nt', abbr: '2Joh' },
  64: { folder: 'nt', abbr: '3Joh' }, 65: { folder: 'nt', abbr: 'Jud' }, 66: { folder: 'nt', abbr: 'Offb' },
  69: { folder: 'ot', abbr: 'Tob' }, 70: { folder: 'ot', abbr: 'Jdt' }, 73: { folder: 'ot', abbr: 'Weish' },
  74: { folder: 'ot', abbr: 'Sir' }, 75: { folder: 'ot', abbr: 'Bar' }, 80: { folder: 'ot', abbr: '1Makk' },
  81: { folder: 'ot', abbr: '2Makk' },
};
