'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Note } from '@/types';
import { AlertCircle, Check, ChevronLeft, Loader, Pin, Plus, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface NotesHubProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string | null) => void;
  onAddNote: (note: Partial<Note>) => Promise<Note | null>;
  onUpdateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (id: string) => void;
  /** Creates a note right away, e.g. from the global "Neu" menu. */
  createRequest?: boolean;
  onCreateRequestHandled?: () => void;
}

type Draft = { id: string; title: string; content: string };
type SaveState = 'saved' | 'pending' | 'saving' | 'error';

const AUTOSAVE_DELAY_MS = 700;

const CATEGORIES = [
  { id: 'all', label: 'Alle' },
  { id: 'Gedanken', label: 'Gedanken' },
  { id: 'Uni', label: 'Schule' },
  { id: 'Ideen', label: 'Ideen' },
  { id: 'Wichtig', label: 'Wichtig' },
];

export const NotesHub: React.FC<NotesHubProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  createRequest,
  onCreateRequestHandled,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  // Phones show either the list or the editor.
  const [mobileEditor, setMobileEditor] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const focusTitleFor = useRef<string | null>(null);
  const pending = useRef<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdateNote);
  onUpdateRef.current = onUpdateNote;

  const activeNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  /** Sends the pending draft immediately (used on timer, note switch and unmount). */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const toSave = pending.current;
    if (!toSave) return;
    pending.current = null;
    setSaveState('saving');
    onUpdateRef
      .current(toSave.id, { title: toSave.title, content: toSave.content })
      .then(() => setSaveState(pending.current ? 'pending' : 'saved'))
      .catch(() => setSaveState('error'));
  }, []);

  useEffect(() => {
    if (!activeNote && notes.length > 0) onSelectNote(notes[0].id);
  }, [activeNote, notes, onSelectNote]);

  // Load the draft when switching notes; save whatever was pending for the previous one.
  useEffect(() => {
    flush();
    setDraft(activeNote ? { id: activeNote.id, title: activeNote.title, content: activeNote.content } : null);
    setSaveState('saved');
    if (activeNote && focusTitleFor.current === activeNote.id) {
      focusTitleFor.current = null;
      requestAnimationFrame(() => titleRef.current?.select());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNote?.id]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      flush();
    };
  }, [flush]);

  const editDraft = (field: 'title' | 'content', value: string) => {
    if (!draft) return;
    const next = { ...draft, [field]: value };
    setDraft(next);
    pending.current = next;
    setSaveState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  };

  const handleCreateNote = async () => {
    const created = await onAddNote({
      title: '',
      content: '',
      category: activeCategory === 'all' ? 'Gedanken' : activeCategory,
    });
    if (created) {
      focusTitleFor.current = created.id;
      onSelectNote(created.id);
      setMobileEditor(true);
    }
  };

  useEffect(() => {
    if (!createRequest) return;
    onCreateRequestHandled?.();
    handleCreateNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRequest]);

  const handleDelete = () => {
    if (!activeNote) return;
    if (window.confirm(`Notiz „${draft?.title || activeNote.title || 'Ohne Titel'}“ löschen?`)) {
      pending.current = null;
      setMobileEditor(false);
      onDeleteNote(activeNote.id);
    }
  };

  const withDraft = (note: Note) => (draft && draft.id === note.id ? { ...note, title: draft.title, content: draft.content } : note);

  const query = searchQuery.trim().toLowerCase();
  const filtered = notes
    .map(withDraft)
    .filter(
      (n) =>
        (activeCategory === 'all' || n.category === activeCategory) &&
        (!query || n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query))
    )
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const saveIndicator = {
    saved: { icon: <Check className="h-3.5 w-3.5" />, text: 'Gespeichert', className: 'text-ink-3' },
    pending: { icon: <Loader className="h-3.5 w-3.5" />, text: 'Ungespeichert', className: 'text-ink-3' },
    saving: { icon: <Loader className="h-3.5 w-3.5 animate-spin" />, text: 'Speichert…', className: 'text-ink-2' },
    error: { icon: <AlertCircle className="h-3.5 w-3.5" />, text: 'Nicht gespeichert', className: 'text-pen' },
  }[saveState];

  return (
    <div className="card grid min-h-[70vh] overflow-hidden md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
      {/* List */}
      <div className={`${mobileEditor ? 'hidden md:flex' : 'flex'} min-w-0 flex-col border-line/10 md:border-r`}>
        <div className="space-y-3 border-b border-line/10 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <label htmlFor="notes-search" className="sr-only">
                Notizen durchsuchen
              </label>
              <input
                id="notes-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suchen…"
                className="field-input h-10 py-0 pl-9"
              />
            </div>
            <button type="button" onClick={handleCreateNote} className="btn-primary h-10 px-3" aria-label="Neue Notiz">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              <span className="hidden sm:inline">Neu</span>
            </button>
          </div>
          <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Kategorie">
            {CATEGORIES.map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={activeCategory === id} onClick={() => setActiveCategory(id)} className="tab h-8 px-3 text-[13px]">
                {label}
              </button>
            ))}
          </div>
        </div>

        <ul className="flex-1 divide-y divide-line/10 overflow-y-auto md:max-h-[calc(70vh-120px)]">
          {filtered.length === 0 && <li className="p-8 text-center text-[14px] text-ink-3">Keine Notizen gefunden.</li>}
          {filtered.map((note) => {
            const isSelected = note.id === selectedNoteId;
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectNote(note.id);
                    setMobileEditor(true);
                  }}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`relative block w-full px-4 py-3 text-left transition-colors ${isSelected ? 'md:bg-inset' : 'hover:bg-inset/60'}`}
                >
                  {isSelected && <span className="absolute inset-y-2 left-0 hidden w-[3px] rounded-r bg-accent md:block" aria-hidden />}
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[15px] font-bold text-ink">{note.title || 'Ohne Titel'}</span>
                    {note.isPinned && <Pin className="h-3.5 w-3.5 flex-shrink-0 text-ink-3" />}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-relaxed text-ink-2">{note.content || 'Noch leer'}</span>
                  <span className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-ink-3">
                    <span>{CATEGORIES.find((c) => c.id === note.category)?.label ?? note.category}</span>
                    <span>{format(new Date(note.updatedAt), 'd. MMM', { locale: de })}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Editor */}
      <div className={`${mobileEditor ? 'flex' : 'hidden md:flex'} min-w-0 flex-col`}>
        {activeNote && draft ? (
          <>
            <div className="flex items-center gap-1 border-b border-line/10 px-2 py-2 sm:px-4">
              <button type="button" onClick={() => setMobileEditor(false)} className="icon-btn md:hidden" aria-label="Zurück zur Liste">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <label htmlFor="note-category" className="sr-only">
                Kategorie
              </label>
              <select
                id="note-category"
                value={activeNote.category}
                onChange={(e) => onUpdateNote(activeNote.id, { category: e.target.value }).catch(() => {})}
                className="h-9 rounded-[9px] border border-line/15 bg-inset px-2 text-[13px] font-bold text-ink focus:outline-none"
              >
                <option value="Gedanken">Gedanken</option>
                <option value="Uni">Schule</option>
                <option value="Ideen">Ideen</option>
                <option value="Wichtig">Wichtig</option>
              </select>
              <span className={`ml-2 hidden items-center gap-1 text-[12px] sm:inline-flex ${saveIndicator.className}`} role="status">
                {saveIndicator.icon}
                {saveIndicator.text}
              </span>
              <div className="ml-auto flex items-center">
                <button
                  type="button"
                  onClick={() => onUpdateNote(activeNote.id, { isPinned: !activeNote.isPinned }).catch(() => {})}
                  aria-pressed={activeNote.isPinned}
                  className={`icon-btn ${activeNote.isPinned ? 'text-accent' : ''}`}
                  aria-label={activeNote.isPinned ? 'Nicht mehr anheften' : 'Oben anheften'}
                  title={activeNote.isPinned ? 'Nicht mehr anheften' : 'Oben anheften'}
                >
                  <Pin className="h-[18px] w-[18px]" fill={activeNote.isPinned ? 'currentColor' : 'none'} />
                </button>
                <button type="button" onClick={handleDelete} className="icon-btn hover:text-pen" aria-label="Notiz löschen" title="Löschen">
                  <Trash2 className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col px-4 py-4 sm:px-8 sm:py-6">
              <label htmlFor="note-title" className="sr-only">
                Titel
              </label>
              <input
                id="note-title"
                ref={titleRef}
                type="text"
                value={draft.title}
                onChange={(e) => editDraft('title', e.target.value)}
                placeholder="Titel"
                maxLength={200}
                className="w-full bg-transparent font-display text-[32px] font-bold leading-tight text-ink placeholder:text-ink-3/60 focus:outline-none sm:text-[40px]"
              />
              <p className="mb-3 mt-1 font-mono text-[12px] text-ink-3">
                {format(new Date(activeNote.updatedAt), "d. MMMM yyyy, HH:mm", { locale: de })} ·{' '}
                {draft.content.split(/\s+/).filter(Boolean).length} Wörter
                <span className={`ml-2 sm:hidden ${saveIndicator.className}`}>· {saveIndicator.text}</span>
              </p>
              <label htmlFor="note-content" className="sr-only">
                Inhalt
              </label>
              <textarea
                id="note-content"
                value={draft.content}
                onChange={(e) => editDraft('content', e.target.value)}
                onBlur={flush}
                placeholder="Einfach losschreiben…"
                className="ruled min-h-[50vh] w-full flex-1 resize-none bg-transparent text-[16px] text-ink placeholder:text-ink-3/60 focus:outline-none"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
            <p className="font-display text-[26px] font-semibold text-ink">Noch keine Notiz</p>
            <p className="mb-4 mt-1 text-[14px] text-ink-2">Halte Gedanken, Mitschriften und Ideen fest.</p>
            <button type="button" onClick={handleCreateNote} className="btn-primary">
              <Plus className="h-4 w-4" /> Erste Notiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
