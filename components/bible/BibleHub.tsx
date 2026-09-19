'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Copy, Search, Trash2, X } from 'lucide-react';
import type { BibleBookmark, BibleChapterData, DailyVerse } from '@/types';
import { api, errorMessage } from '@/lib/client';
import { BIBLE_TRANSLATIONS, DEFAULT_TRANSLATION, bookByNr, booksFor, parseReference, translationInfo, type BibleTranslation } from '@/lib/bible/books';
import { useToast } from '@/components/ui/Toast';

interface BibleHubProps {
  bookmarks: BibleBookmark[];
  onSaved: (bookmark: BibleBookmark) => void;
  onRemoved: (id: string) => void;
  /** Chapter to jump to, e.g. from the daily verse on "Heute". */
  jumpTo?: { bookNr: number; chapter: number; verse?: number } | null;
  onJumpHandled?: () => void;
}

const POSITION_KEY = 'lifetracker:bible-position';
const TRANSLATION_KEY = 'lifetracker:bible-translation';

export function BibleHub({ bookmarks, onSaved, onRemoved, jumpTo, onJumpHandled }: BibleHubProps) {
  const toast = useToast();
  const [translation, setTranslation] = useState<BibleTranslation>(DEFAULT_TRANSLATION);
  const [bookNr, setBookNr] = useState(43);
  const [chapter, setChapter] = useState(3);
  const [data, setData] = useState<BibleChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [testament, setTestament] = useState<'at' | 'nt' | 'spaet'>('nt');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const versesRef = useRef<HTMLDivElement>(null);

  // Restore the last reading position.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(POSITION_KEY);
      if (stored) {
        const { bookNr: b, chapter: c } = JSON.parse(stored);
        if (typeof b === 'number' && typeof c === 'number') {
          setBookNr(b);
          setChapter(c);
        }
      }
      const storedTranslation = localStorage.getItem(TRANSLATION_KEY) as BibleTranslation | null;
      if (storedTranslation && BIBLE_TRANSLATIONS.some((t) => t.id === storedTranslation)) setTranslation(storedTranslation);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!jumpTo) return;
    setBookNr(jumpTo.bookNr);
    setChapter(jumpTo.chapter);
    setHighlight(jumpTo.verse ?? null);
    onJumpHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<BibleChapterData>(`/api/v1/bible/chapter?translation=${translation}&book=${bookNr}&chapter=${chapter}`);
      setData(result);
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify({ bookNr, chapter }));
      } catch {
        // ignore
      }
    } catch (e) {
      setError(errorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [translation, bookNr, chapter]);

  useEffect(() => {
    load();
  }, [load]);

  // Scroll a jumped-to verse into view once its chapter is on screen.
  useEffect(() => {
    if (!highlight || !data) return;
    const el = versesRef.current?.querySelector(`[data-verse="${highlight}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlight, data]);

  const chapterCount = data?.chapterCount ?? bookByNr(bookNr)?.chapters ?? 1;
  const book = bookByNr(bookNr);

  const go = (nextBook: number, nextChapter: number, verse?: number) => {
    setBookNr(nextBook);
    setChapter(nextChapter);
    setHighlight(verse ?? null);
    setPickerOpen(false);
  };

  /** Previous/next chapter, rolling over into the neighbouring book of this edition. */
  const step = (direction: -1 | 1) => {
    const nextChapter = chapter + direction;
    if (nextChapter >= 1 && nextChapter <= chapterCount) return go(bookNr, nextChapter);
    const list = booksFor(translation);
    const nextBook = list[list.findIndex((b) => b.nr === bookNr) + direction];
    if (!nextBook) return;
    go(nextBook.nr, direction === 1 ? 1 : nextBook.chapters);
  };

  const submitQuery = (e: React.FormEvent) => {
    e.preventDefault();
    const reference = parseReference(query);
    if (!reference) return toast('Stelle nicht erkannt – z. B. „Joh 3,16“', 'error');
    go(reference.bookNr, reference.chapter, reference.verse);
    setQuery('');
  };

  const bookmarkOf = (verse: number) => bookmarks.find((b) => b.bookNr === bookNr && b.chapter === chapter && b.verse === verse);

  const toggleBookmark = async (verse: number, text: string) => {
    const existing = bookmarkOf(verse);
    try {
      if (existing) {
        await api(`/api/v1/bible/bookmarks/${existing.id}`, { method: 'DELETE' });
        onRemoved(existing.id);
      } else {
        const bookmark = await api<BibleBookmark>('/api/v1/bible/bookmarks', {
          body: { bookNr, bookName: data?.bookName ?? book?.name, chapter, verse, text, translation },
        });
        onSaved(bookmark);
        toast(`${data?.bookName ?? ''} ${chapter},${verse} gemerkt`);
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const copyVerse = async (verse: number, text: string) => {
    try {
      await navigator.clipboard.writeText(`„${text}“ – ${data?.bookName ?? ''} ${chapter},${verse}`);
      toast('Vers kopiert');
    } catch {
      toast('Kopieren hat nicht geklappt', 'error');
    }
  };

  const chooseTranslation = (id: BibleTranslation) => {
    setTranslation(id);
    // Leaving a catholic edition while reading one of its extra books: go back to the gospel.
    if (!booksFor(id).some((b) => b.nr === bookNr)) {
      setBookNr(43);
      setChapter(1);
      setTestament('nt');
    }
    try {
      localStorage.setItem(TRANSLATION_KEY, id);
    } catch {
      // ignore
    }
  };

  const canon = booksFor(translation);
  const books = canon.filter((b) => b.testament === testament);
  const hasDeutero = canon.some((b) => b.testament === 'spaet');

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-12 lg:items-start">
      <section className="card min-w-0 lg:col-span-8" aria-label="Bibel lesen">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3 sm:p-5 sm:pb-3">
          <button type="button" onClick={() => setPickerOpen((v) => !v)} aria-expanded={pickerOpen} className="min-w-0 text-left">
            <p className="eyebrow">Lesen</p>
            <h2 className="card-title mt-1 flex items-center gap-1.5 truncate">
              {data?.bookName ?? book?.name} {chapter}
              <ChevronRight className={`h-4 w-4 flex-shrink-0 text-ink-3 transition-transform ${pickerOpen ? 'rotate-90' : ''}`} />
            </h2>
          </button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => step(-1)} className="icon-btn h-9 w-9" aria-label="Vorheriges Kapitel">
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <span className="min-w-[54px] text-center font-mono text-[12px] text-ink-2 tabular">
              {chapter} / {chapterCount}
            </span>
            <button type="button" onClick={() => step(1)} className="icon-btn h-9 w-9" aria-label="Nächstes Kapitel">
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <p className="-mt-2 px-4 pb-2 text-[12px] text-ink-3 sm:px-5">{translationInfo(translation)?.label}</p>

        <div className="px-4 pb-3 sm:px-5">
          <form onSubmit={submitQuery} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <label htmlFor="bible-reference" className="sr-only">
              Bibelstelle öffnen
            </label>
            <input
              id="bible-reference"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Stelle öffnen: Joh 3,16 · Psalm 23 · 1. Kor 13"
              className="field-input h-11 pl-9"
            />
          </form>
        </div>

        {pickerOpen && (
          <div className="border-y border-line/10 bg-inset/60 px-4 py-3 sm:px-5">
            <div className={`segmented mb-3 ${hasDeutero ? 'grid-cols-3' : 'grid-cols-2'}`} role="group" aria-label="Teil der Bibel">
              <button type="button" aria-pressed={testament === 'at'} onClick={() => setTestament('at')} className="segmented-item">
                Altes Test.
              </button>
              {hasDeutero && (
                <button
                  type="button"
                  aria-pressed={testament === 'spaet'}
                  onClick={() => setTestament('spaet')}
                  className="segmented-item"
                  title="Tobit, Judit, Weisheit, Jesus Sirach, Baruch, 1. und 2. Makkabäer"
                >
                  Spätschriften
                </button>
              )}
              <button type="button" aria-pressed={testament === 'nt'} onClick={() => setTestament('nt')} className="segmented-item">
                Neues Test.
              </button>
            </div>
            <div className="grid max-h-[220px] grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
              {books.map((b) => (
                <button
                  key={b.nr}
                  type="button"
                  onClick={() => go(b.nr, 1)}
                  aria-pressed={b.nr === bookNr}
                  className={`truncate rounded-[8px] px-2.5 py-2 text-left text-[13px] font-bold transition-colors ${
                    b.nr === bookNr ? 'bg-accent text-on-accent' : 'text-ink-2 hover:bg-sheet hover:text-ink'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
            {book && (
              <div className="mt-3">
                <p className="field-label">Kapitel in {data?.bookName ?? book.name}</p>
                <div className="flex max-h-[132px] flex-wrap gap-1 overflow-y-auto">
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => go(bookNr, c)}
                      aria-pressed={c === chapter}
                      className={`h-8 w-8 rounded-[8px] font-mono text-[12px] font-bold transition-colors ${
                        c === chapter ? 'bg-accent text-on-accent' : 'bg-sheet text-ink-2 hover:text-ink'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={versesRef} className={`px-4 pb-5 sm:px-5 ${loading ? 'opacity-60' : ''}`}>
          {error ? (
            <div className="py-8 text-center">
              <p className="text-[14px] text-pen">{error}</p>
              <button type="button" onClick={load} className="btn-secondary mt-3">
                Nochmal versuchen
              </button>
            </div>
          ) : !data ? (
            <div className="space-y-2 py-4" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-inset" style={{ width: `${70 + ((i * 7) % 30)}%` }} />
              ))}
            </div>
          ) : (
            <ol className="ruled space-y-1">
              {data.verses.map((v) => {
                const saved = bookmarkOf(v.verse);
                return (
                  <li
                    key={v.verse}
                    data-verse={v.verse}
                    className={`group -mx-2 rounded-[8px] px-2 py-1 transition-colors ${highlight === v.verse ? 'bg-marker/20' : 'hover:bg-inset/70'}`}
                  >
                    <span className="flex gap-2">
                      <span className="mt-[3px] w-6 flex-shrink-0 text-right font-mono text-[11px] font-bold text-ink-3 tabular">{v.verse}</span>
                      <span className="min-w-0 flex-1 text-[16px] leading-7 text-ink">{v.text}</span>
                      <span className="flex flex-shrink-0 items-start gap-0.5">
                        <button
                          type="button"
                          onClick={() => copyVerse(v.verse, v.text)}
                          className="icon-btn h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          aria-label={`Vers ${v.verse} kopieren`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBookmark(v.verse, v.text)}
                          className={`icon-btn h-7 w-7 ${saved ? 'text-accent' : 'sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'}`}
                          aria-label={saved ? `Vers ${v.verse} nicht mehr merken` : `Vers ${v.verse} merken`}
                        >
                          {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                        </button>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <p className="border-t border-line/10 px-4 pt-3 text-[12px] leading-relaxed text-ink-3 sm:px-5">
          Nur gemeinfreie Ausgaben – „kath." enthält die Spätschriften (Tobit, Judit, Weisheit, Sirach, Baruch, 1./2. Makkabäer). Einheitsübersetzung und Zürcher Bibel sind
          urheberrechtlich geschützt und dürfen hier nicht eingebunden werden.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <div className="scrollbar-none flex gap-1 overflow-x-auto" role="group" aria-label="Übersetzung">
            {BIBLE_TRANSLATIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={translation === t.id}
                onClick={() => chooseTranslation(t.id)}
                title={`${t.label}${t.canon === 'catholic' ? ' · mit Spätschriften' : ''}`}
                className="tab h-8 px-3 text-[13px]"
              >
                {t.short}
                {t.canon === 'catholic' && <span className="text-[10px] opacity-70">kath.</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => step(-1)} className="btn-ghost h-8 px-2 text-[13px]">
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>
            <button type="button" onClick={() => step(1)} className="btn-secondary h-8 px-3 text-[13px]">
              Weiter <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="card min-w-0 lg:col-span-4" aria-label="Merkverse">
        <div className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
          <div>
            <p className="eyebrow">Gemerkt</p>
            <h2 className="card-title mt-1">Merkverse</h2>
            <p className="mt-1 text-[13px] text-ink-3">{bookmarks.length === 0 ? 'Noch keiner gemerkt' : `${bookmarks.length} Verse`}</p>
          </div>
        </div>

        {bookmarks.length === 0 ? (
          <p className="px-5 pb-5 text-[14px] text-ink-2">
            Tipp beim Lesen auf das Lesezeichen neben einem Vers – hier sammeln sich deine Verse, auch der Tagesvers.
          </p>
        ) : (
          <ul className="divide-y divide-line/10 px-4 pb-3 sm:px-5">
            {(showBookmarks ? bookmarks : bookmarks.slice(0, 8)).map((b) => (
              <li key={b.id} className="group py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <button type="button" onClick={() => go(b.bookNr, b.chapter, b.verse)} className="min-w-0 flex-1 text-left">
                    <span className="block text-[14px] font-bold text-accent">
                      {b.bookName} {b.chapter},{b.verse}
                    </span>
                    <span className="mt-0.5 line-clamp-3 block text-[13px] leading-relaxed text-ink-2">{b.text}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api(`/api/v1/bible/bookmarks/${b.id}`, { method: 'DELETE' });
                        onRemoved(b.id);
                      } catch (e) {
                        toast(errorMessage(e), 'error');
                      }
                    }}
                    className="icon-btn h-7 w-7 flex-shrink-0 hover:text-pen sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    aria-label="Vers entfernen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-0.5 text-[11px] text-ink-3">{format(new Date(b.createdAt), 'd. MMM yyyy', { locale: de })}</p>
              </li>
            ))}
            {bookmarks.length > 8 && (
              <li className="py-1">
                <button type="button" onClick={() => setShowBookmarks((v) => !v)} className="btn-ghost w-full">
                  {showBookmarks ? 'Weniger anzeigen' : `Alle ${bookmarks.length} anzeigen`}
                </button>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
