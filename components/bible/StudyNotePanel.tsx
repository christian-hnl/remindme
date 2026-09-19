'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, NotebookPen, Plus } from 'lucide-react';
import type { Note } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/client';

interface StudyNotePanelProps {
  notes: Note[];
  /** Note the workspace writes into; null until one is picked or created. */
  noteId: string | null;
  onSelectNote: (id: string | null) => void;
  onAddNote: (note: Partial<Note>) => Promise<Note | null>;
  onUpdateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  /** Passage on screen, used as the title of a freshly created note. */
  passage: string;
  /** Set by the reader when a verse should be appended. */
  insert: { text: string; reference: string } | null;
  onInserted: () => void;
}

type SaveState = 'saved' | 'pending' | 'saving' | 'error';

const SAVE_DELAY_MS = 900;

/** The note half of the Bible workspace: read on the left, write on the right. */
export function StudyNotePanel({ notes, noteId, onSelectNote, onAddNote, onUpdateNote, passage, insert, onInserted }: StudyNotePanelProps) {
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<SaveState>('saved');
  const [creating, setCreating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const note = notes.find((n) => n.id === noteId) ?? null;

  // Load the note's text when another note is picked.
  useEffect(() => {
    setDraft(note?.content ?? '');
    setState('saved');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  const save = useCallback(
    async (id: string, content: string) => {
      setState('saving');
      try {
        await onUpdateNote(id, { content });
        setState('saved');
      } catch {
        setState('error');
      }
    },
    [onUpdateNote]
  );

  const edit = (content: string) => {
    setDraft(content);
    if (!noteId) return;
    setState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(noteId, content), SAVE_DELAY_MS);
  };

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const createNote = async () => {
    setCreating(true);
    try {
      const created = await onAddNote({ title: passage, content: '', category: 'Bibel' });
      if (created) {
        onSelectNote(created.id);
        setDraft('');
        textareaRef.current?.focus();
      }
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setCreating(false);
    }
  };

  // A verse handed over by the reader lands at the end of the note.
  useEffect(() => {
    if (!insert) return;
    onInserted();
    if (!noteId) {
      toast('Wähl zuerst eine Notiz aus oder leg eine an', 'error');
      return;
    }
    const line = `„${insert.text}“ – ${insert.reference}`;
    const next = draft.trim() ? `${draft.replace(/\s+$/, '')}\n\n${line}\n` : `${line}\n`;
    edit(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.selectionStart = el.selectionEnd = el.value.length;
      el.scrollTop = el.scrollHeight;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insert]);

  const stateLabel = { saved: 'gespeichert', pending: 'Änderungen…', saving: 'speichert…', error: 'nicht gespeichert' }[state];

  return (
    <section className="card min-w-0" aria-label="Notiz zur Bibelstelle">
      <div className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <NotebookPen className="h-3.5 w-3.5" /> Arbeitsplatz
          </p>
          <h2 className="card-title mt-1 truncate">{note ? note.title || 'Ohne Titel' : 'Notiz zur Stelle'}</h2>
        </div>
        <button type="button" onClick={createNote} disabled={creating} className="btn-secondary h-9 flex-shrink-0 px-3" title={`Neue Notiz „${passage}“`}>
          <Plus className="h-4 w-4" /> Neu
        </button>
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <label htmlFor="study-note-select" className="sr-only">
          Notiz auswählen
        </label>
        <select
          id="study-note-select"
          value={noteId ?? ''}
          onChange={(e) => onSelectNote(e.target.value || null)}
          className="field-input h-10 py-0 text-[14px]"
        >
          <option value="">Keine Notiz gewählt</option>
          {notes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title || 'Ohne Titel'}
            </option>
          ))}
        </select>

        {note ? (
          <>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => edit(e.target.value)}
              placeholder="Gedanken, Fragen, was dir auffällt…"
              className="field-input ruled mt-3 min-h-[260px] resize-y text-[15px] leading-7"
            />
            <p className={`mt-1.5 flex items-center gap-1 text-[12px] ${state === 'error' ? 'text-pen' : 'text-ink-3'}`} role="status">
              {state === 'saved' && <Check className="h-3.5 w-3.5 text-leaf" />}
              {stateLabel}
            </p>
          </>
        ) : (
          <p className="mt-3 rounded-[10px] bg-inset p-4 text-[14px] leading-relaxed text-ink-2">
            Wähl eine Notiz aus oder leg eine neue an – dann kannst du beim Lesen jeden Vers mit dem Stift-Symbol direkt hineinschreiben.
          </p>
        )}
      </div>
    </section>
  );
}
