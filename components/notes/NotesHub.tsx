'use client';

import React, { useState, useEffect } from 'react';
import { Note } from '@/types';
import { 
  FileText, 
  Plus, 
  Search, 
  Pin, 
  Trash2, 
  Sparkles, 
  Folder, 
  Calendar, 
  Check, 
  Clock,
  BookOpen,
  Lightbulb,
  Zap
} from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface NotesHubProps {
  notes: Note[];
  onAddNote: (newNote: Partial<Note>) => Promise<Note | void>;
  onUpdateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export const NotesHub: React.FC<NotesHubProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    notes.length > 0 ? notes[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Active note
  const activeNote = notes.find((n) => n.id === selectedNoteId) || (notes.length > 0 ? notes[0] : null);

  // If active note was deleted or not selected, pick first available
  useEffect(() => {
    if (!selectedNoteId && notes.length > 0) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId]);

  // Categories
  const categories = [
    { id: 'all', label: 'Alle Notizen', icon: Folder },
    { id: 'Gedanken', label: 'Gedanken & Reflexion', icon: Lightbulb },
    { id: 'Uni', label: 'Uni & Schule', icon: BookOpen },
    { id: 'Ideen', label: 'Ideen & Projekte', icon: Sparkles },
    { id: 'Wichtig', label: 'Wichtig & To-Do', icon: Zap },
  ];

  // Filtering
  const filteredNotes = notes.filter((n) => {
    const matchesCategory = activeCategory === 'all' || n.category === activeCategory;
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.isPinned);

  const handleCreateNote = async (presetCategory = 'Gedanken', presetTitle = 'Neue Gedanken') => {
    const created = await onAddNote({
      title: presetTitle,
      content: '',
      category: presetCategory,
      isPinned: false,
      colorHex: '#6366F1',
    });
    if (created && created.id) {
      setSelectedNoteId(created.id);
    }
    fireMilestoneGlow();
  };

  const handleTitleChange = async (val: string) => {
    if (!activeNote) return;
    setIsAutoSaving(true);
    await onUpdateNote(activeNote.id, { title: val });
    setIsAutoSaving(false);
  };

  const handleContentChange = async (val: string) => {
    if (!activeNote) return;
    setIsAutoSaving(true);
    await onUpdateNote(activeNote.id, { content: val });
    setIsAutoSaving(false);
  };

  const handleCategoryChange = async (val: string) => {
    if (!activeNote) return;
    await onUpdateNote(activeNote.id, { category: val });
  };

  const handleTogglePin = async () => {
    if (!activeNote) return;
    await onUpdateNote(activeNote.id, { isPinned: !activeNote.isPinned });
  };

  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] shadow-bento overflow-hidden animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#141824] flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              Gedanken & Notizen
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                {notes.length} Notizen
              </span>
            </h2>
            <p className="text-xs text-muted">
              Apple Notes & Notion Workflow • Spontane Einfälle, Mitschriften & Ideen
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCreateNote('Gedanken', '💡 Neuer Gedanke')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Notiz verfassen</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        
        {/* LEFT COLUMN: Sidebar & Notes List (4 Cols) */}
        <div className="md:col-span-4 border-r border-white/[0.06] p-4 flex flex-col bg-[#0D1017]/50">
          
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Notizen durchsuchen..."
              className="w-full pl-8.5 pr-3 py-2 rounded-xl bg-[#161B26] border border-white/10 text-xs text-white placeholder-muted focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3 scrollbar-none">
            {categories.map((c) => {
              const Icon = c.icon;
              const isSelected = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'bg-[#161B26] text-muted hover:text-white border border-white/5'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[480px]">
            {filteredNotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                Keine Notizen gefunden.
              </div>
            ) : (
              <>
                {/* Pinned notes */}
                {pinnedNotes.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider px-1 flex items-center gap-1">
                      <Pin className="h-2.5 w-2.5" />
                      <span>Angepinnt</span>
                    </div>
                    {pinnedNotes.map((note) => {
                      const isSelected = activeNote?.id === note.id;
                      return (
                        <button
                          key={note.id}
                          onClick={() => setSelectedNoteId(note.id)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-indigo-950/40 border-indigo-500/40 shadow-sm'
                              : 'bg-[#161B26] border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="font-semibold text-xs text-white truncate">
                              {note.title || 'Ohne Titel'}
                            </span>
                            <Pin className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                          </div>
                          <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                            {note.content || 'Keine Notiz vorhanden...'}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-muted mt-2">
                            <span className="px-1.5 py-0.2 rounded bg-white/5 font-medium">
                              {note.category}
                            </span>
                            <span className="font-mono">
                              {format(new Date(note.updatedAt), 'dd. MMM', { locale: de })}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Regular notes */}
                <div className="space-y-1.5">
                  {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 mt-3">
                      Weitere Notizen
                    </div>
                  )}
                  {unpinnedNotes.map((note) => {
                    const isSelected = activeNote?.id === note.id;
                    return (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500/40 shadow-sm'
                            : 'bg-[#161B26] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="font-semibold text-xs text-white truncate mb-1">
                          {note.title || 'Ohne Titel'}
                        </div>
                        <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                          {note.content || 'Keine Notiz vorhanden...'}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-muted mt-2">
                          <span className="px-1.5 py-0.2 rounded bg-white/5 font-medium">
                            {note.category}
                          </span>
                          <span className="font-mono">
                            {format(new Date(note.updatedAt), 'dd. MMM', { locale: de })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Note Editor (8 Cols) */}
        <div className="md:col-span-8 p-6 flex flex-col bg-[#11141D]">
          {activeNote ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Note Header & Metadata Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <select
                    value={activeNote.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-[#161B26] border border-white/10 text-xs text-indigo-300 font-medium focus:outline-none"
                  >
                    <option value="Gedanken">💡 Gedanken & Reflexion</option>
                    <option value="Uni">📚 Uni & Vorlesung</option>
                    <option value="Ideen">🎯 Ideen & Projekte</option>
                    <option value="Wichtig">⚡ Wichtig & To-Do</option>
                  </select>

                  <span className="text-[11px] text-muted font-mono hidden sm:inline">
                    Zuletzt gespeichert: {format(new Date(activeNote.updatedAt), 'HH:mm', { locale: de })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePin}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs border transition-colors ${
                      activeNote.isPinned
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                        : 'bg-[#161B26] text-muted hover:text-white border-white/5'
                    }`}
                    title={activeNote.isPinned ? 'Pin entfernen' : 'Oben anpinnen'}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{activeNote.isPinned ? 'Angepinnt' : 'Anpinnen'}</span>
                  </button>

                  <button
                    onClick={() => onDeleteNote(activeNote.id)}
                    className="p-1.5 rounded-xl text-muted hover:text-rose-400 bg-[#161B26] hover:bg-rose-500/10 border border-white/5 transition-colors"
                    title="Notiz löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Editable Title */}
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Titel der Notiz..."
                className="w-full bg-transparent text-xl sm:text-2xl font-bold text-white tracking-tight placeholder-muted/50 focus:outline-none border-b border-transparent focus:border-indigo-500/30 pb-1"
              />

              {/* Editable Content */}
              <textarea
                value={activeNote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Schreibe hier deine Gedanken, Mitschriften, Ideen oder To-Dos auf..."
                className="flex-1 w-full bg-transparent text-sm text-white/90 placeholder-muted/40 focus:outline-none resize-none leading-relaxed min-h-[350px]"
              />

              {/* Footer info */}
              <div className="flex items-center justify-between text-[11px] text-muted pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span>{activeNote.content.split(/\s+/).filter(Boolean).length} Wörter</span>
                  <span>{activeNote.content.length} Zeichen</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Check className="h-3 w-3" />
                  <span>Automatisch synchronisiert</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted">
              <FileText className="h-12 w-12 text-muted-dark mb-3" />
              <h3 className="text-sm font-medium text-white mb-1">Keine Notiz ausgewählt</h3>
              <p className="text-xs max-w-xs mb-4">
                Erstelle eine neue Notiz oder wähle eine bestehende aus der linken Liste.
              </p>
              <button
                onClick={() => handleCreateNote()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow"
              >
                + Neue Notiz anlegen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
