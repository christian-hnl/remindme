'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BookOpenText, Bookmark, BookmarkCheck, RefreshCw } from 'lucide-react';
import type { BibleBookmark, DailyVerse } from '@/types';
import { api, errorMessage } from '@/lib/client';
import { DEFAULT_TRANSLATION, translationInfo } from '@/lib/bible/books';
import { useToast } from '@/components/ui/Toast';

interface DailyVerseCardProps {
  bookmarks: BibleBookmark[];
  onSaved: (bookmark: BibleBookmark) => void;
  onRemoved: (id: string) => void;
  onOpenBible: (verse: DailyVerse) => void;
  /** Compact version for the "Heute" view; the Bible tab shows the full one. */
  compact?: boolean;
}

export function DailyVerseCard({ bookmarks, onSaved, onRemoved, onOpenBible, compact = false }: DailyVerseCardProps) {
  const toast = useToast();
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (nextOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      // Follows the edition picked in the Bible tab.
      let chosen = DEFAULT_TRANSLATION as string;
      try {
        chosen = localStorage.getItem('lifetracker:bible-translation') || chosen;
      } catch {
        // ignore
      }
      setVerse(await api<DailyVerse>(`/api/v1/bible/daily?offset=${nextOffset}&translation=${chosen}`));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(offset);
  }, [load, offset]);

  const saved = verse ? bookmarks.find((b) => b.bookNr === verse.bookNr && b.chapter === verse.chapter && b.verse === verse.verse) : undefined;

  const toggleSave = async () => {
    if (!verse) return;
    setSaving(true);
    try {
      if (saved) {
        await api(`/api/v1/bible/bookmarks/${saved.id}`, { method: 'DELETE' });
        onRemoved(saved.id);
        toast('Vers entfernt');
      } else {
        const bookmark = await api<BibleBookmark>('/api/v1/bible/bookmarks', {
          body: { bookNr: verse.bookNr, bookName: verse.bookName, chapter: verse.chapter, verse: verse.verse, text: verse.text, translation: verse.translation },
        });
        onSaved(bookmark);
        toast(`${verse.reference} gemerkt`);
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const translationLabel = translationInfo(verse?.translation ?? '')?.label ?? '';

  return (
    <section className={`card ${compact ? '' : 'overflow-hidden'}`} aria-label="Tagesvers">
      <div className={`flex items-start justify-between gap-3 ${compact ? 'p-4 pb-2 sm:p-5 sm:pb-2' : 'p-5 pb-3 sm:p-6 sm:pb-3'}`}>
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <BookOpenText className="h-3.5 w-3.5" /> Tagesvers
          </p>
          {verse && <h2 className={`mt-1 truncate font-display font-semibold text-ink ${compact ? 'text-[20px]' : 'text-[26px]'}`}>{verse.reference}</h2>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            disabled={loading}
            className="icon-btn h-9 w-9"
            aria-label="Anderer Vers"
            title="Anderer Vers"
          >
            <RefreshCw className={`h-[17px] w-[17px] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={toggleSave}
            disabled={saving || !verse}
            className={`icon-btn h-9 w-9 ${saved ? 'text-accent' : ''}`}
            aria-label={saved ? 'Aus Merkversen entfernen' : 'Vers merken'}
            title={saved ? 'Gemerkt' : 'Vers merken'}
          >
            {saved ? <BookmarkCheck className="h-[17px] w-[17px]" /> : <Bookmark className="h-[17px] w-[17px]" />}
          </button>
        </div>
      </div>

      <div className={compact ? 'px-4 pb-4 sm:px-5' : 'px-5 pb-5 sm:px-6'}>
        {error ? (
          <div>
            <p className="text-[14px] text-pen">{error}</p>
            <button type="button" onClick={() => load(offset)} className="btn-secondary mt-3">
              Nochmal versuchen
            </button>
          </div>
        ) : !verse ? (
          <div className="space-y-2" aria-hidden>
            <div className="h-4 w-full animate-pulse rounded bg-inset" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-inset" />
          </div>
        ) : (
          <>
            <blockquote className={`border-l-[3px] border-accent/60 pl-4 leading-relaxed text-ink ${compact ? 'text-[15px]' : 'text-[18px] sm:text-[20px]'}`}>
              {verse.text}
            </blockquote>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-ink-3">{translationLabel}</span>
              <button type="button" onClick={() => onOpenBible(verse)} className="btn-ghost h-8 px-2 text-[13px] text-accent">
                Kapitel lesen
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
