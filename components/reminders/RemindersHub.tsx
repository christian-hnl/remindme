'use client';

import React, { useState } from 'react';
import { Reminder } from '@/types';
import { 
  Bell, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Clock, 
  Repeat, 
  Package, 
  Shirt, 
  Pill, 
  Trash, 
  Droplet,
  MessageSquare,
  User,
  CalendarOff,
  Calendar,
  X
} from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface RemindersHubProps {
  reminders: Reminder[];
  onToggleReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  onAddReminder: (data: Partial<Reminder>) => Promise<void>;
}

export const RemindersHub: React.FC<RemindersHubProps> = ({
  reminders,
  onToggleReminder,
  onDeleteReminder,
  onAddReminder,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'say' | 'action' | 'nodate' | 'withdate'>('all');

  // Form states
  const [title, setTitle] = useState('');
  const [personName, setPersonName] = useState('');
  const [reminderType, setReminderType] = useState<'say_to_person' | 'action'>('say_to_person');
  const [hasDueDate, setHasDueDate] = useState<boolean>(true);
  const [dueTime, setDueTime] = useState('18:00');
  const [dueDateStr, setDueDateStr] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [category, setCategory] = useState('Person');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [submitting, setSubmitting] = useState(false);

  // Quick preset clicks
  const handleQuickPreset = async (preset: {
    title: string;
    personName?: string;
    type: 'say_to_person' | 'action';
    hasDate: boolean;
    dueTime?: string;
    category: string;
  }) => {
    await onAddReminder({
      title: preset.title,
      personName: preset.personName || null,
      reminderType: preset.type,
      hasDueDate: preset.hasDate,
      dueTime: preset.dueTime || null,
      dueDate: preset.hasDate ? new Date().toISOString() : null,
      category: preset.category,
      icon: preset.type === 'say_to_person' ? 'user' : 'bell',
      priority: 'medium',
    });
    fireMilestoneGlow();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onAddReminder({
        title: title.trim(),
        personName: personName.trim() || null,
        reminderType,
        hasDueDate,
        dueTime: hasDueDate ? dueTime : null,
        dueDate: hasDueDate ? new Date(dueDateStr).toISOString() : null,
        category: personName.trim() ? 'Person' : category,
        priority,
        icon: reminderType === 'say_to_person' ? 'user' : category === 'Haushalt' ? 'shirt' : 'bell',
      });
      setTitle('');
      setPersonName('');
      setIsModalOpen(false);
      fireMilestoneGlow();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredReminders = reminders.filter((r) => {
    if (filterTab === 'say') return r.reminderType === 'say_to_person' || !!r.personName;
    if (filterTab === 'action') return r.reminderType !== 'say_to_person' && !r.personName;
    if (filterTab === 'nodate') return !r.hasDueDate;
    if (filterTab === 'withdate') return r.hasDueDate;
    return true;
  });

  const activeReminders = filteredReminders.filter((r) => !r.isDone);
  const doneReminders = filteredReminders.filter((r) => r.isDone);

  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 sm:p-6 shadow-bento glow-card">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white tracking-tight">
                Erinnerungen & Bescheid geben
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                {activeReminders.length} offen
              </span>
            </div>
            <p className="text-xs text-muted">
              Wem was sagen, Dinge erledigen • Mit Frist oder ohne Enddatum
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setReminderType('say_to_person');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Erinnerung</span>
        </button>
      </div>

      {/* Quick Preset Strip */}
      <div className="mb-4">
        <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">
          Schnell-Pills
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          <button
            onClick={() => handleQuickPreset({
              title: 'Bescheid sagen wegen Termin / Treffen',
              personName: 'Mama',
              type: 'say_to_person',
              hasDate: false,
              category: 'Person',
            })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#161B26] hover:bg-white/10 text-muted hover:text-white border border-white/5 text-xs whitespace-nowrap transition-all"
          >
            <span>🗣️ Mama Bescheid sagen (ohne Frist)</span>
          </button>

          <button
            onClick={() => handleQuickPreset({
              title: 'Fragen wegen Nachprüfung / Referat',
              personName: 'Hr. Weber',
              type: 'say_to_person',
              hasDate: true,
              dueTime: '09:45',
              category: 'Uni',
            })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#161B26] hover:bg-white/10 text-muted hover:text-white border border-white/5 text-xs whitespace-nowrap transition-all"
          >
            <span>🗣️ Lehrer fragen (morgen)</span>
          </button>

          <button
            onClick={() => handleQuickPreset({
              title: 'Wäsche rausbringen / aufhängen',
              type: 'action',
              hasDate: true,
              dueTime: '18:30',
              category: 'Haushalt',
            })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#161B26] hover:bg-white/10 text-muted hover:text-white border border-white/5 text-xs whitespace-nowrap transition-all"
          >
            <span>🧺 Wäsche rausbringen</span>
          </button>

          <button
            onClick={() => handleQuickPreset({
              title: 'Paket aus Packstation abholen',
              type: 'action',
              hasDate: false,
              category: 'Erledigung',
            })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#161B26] hover:bg-white/10 text-muted hover:text-white border border-white/5 text-xs whitespace-nowrap transition-all"
          >
            <span>📦 Paket abholen (Irgendwann)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-3 mb-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            filterTab === 'all'
              ? 'bg-amber-600/20 text-amber-200 border border-amber-500/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Alle ({reminders.filter((r) => !r.isDone).length})
        </button>

        <button
          onClick={() => setFilterTab('say')}
          className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            filterTab === 'say'
              ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="h-3 w-3 text-indigo-400" />
          <span>Wem was sagen</span>
        </button>

        <button
          onClick={() => setFilterTab('nodate')}
          className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            filterTab === 'nodate'
              ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <CalendarOff className="h-3 w-3 text-purple-400" />
          <span>Ohne Frist (Irgendwann)</span>
        </button>

        <button
          onClick={() => setFilterTab('withdate')}
          className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            filterTab === 'withdate'
              ? 'bg-emerald-600/20 text-emerald-200 border border-emerald-500/30'
              : 'text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="h-3 w-3 text-emerald-400" />
          <span>Mit Enddatum</span>
        </button>
      </div>

      {/* Reminders List */}
      <div className="space-y-2">
        {activeReminders.length === 0 && doneReminders.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted">
            Keine Erinnerungen in dieser Ansicht.
          </div>
        ) : (
          <>
            {activeReminders.map((r) => {
              const isSayToPerson = r.reminderType === 'say_to_person' || !!r.personName;
              return (
                <div
                  key={r.id}
                  className="group flex items-center justify-between p-3 rounded-2xl bg-[#161B26] border border-white/5 hover:border-amber-500/30 transition-all text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => {
                        onToggleReminder(r);
                        fireMilestoneGlow();
                      }}
                      className="text-muted hover:text-amber-400 transition-colors flex-shrink-0"
                    >
                      <Circle className="h-4 w-4" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {isSayToPerson && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                            <MessageSquare className="h-2.5 w-2.5" />
                            {r.personName ? `An ${r.personName}` : 'Zu sagen'}
                          </span>
                        )}

                        {!r.hasDueDate ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-white/5 text-purple-300 border border-white/5 flex items-center gap-0.5">
                            <CalendarOff className="h-2.5 w-2.5" />
                            Ohne Frist
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono text-muted bg-white/5 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5 text-amber-400" />
                            {r.dueTime ? `${r.dueTime} Uhr` : 'Heute'}
                          </span>
                        )}
                      </div>

                      <span className="text-white font-medium block truncate">
                        {r.title}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteReminder(r.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-400 p-1 transition-opacity"
                    title="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Completed */}
            {doneReminders.length > 0 && (
              <div className="pt-2 border-t border-white/5 space-y-1.5 opacity-50">
                {doneReminders.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#161B26]/40 text-xs"
                  >
                    <div className="flex items-center gap-2 line-through text-muted truncate">
                      <button
                        onClick={() => onToggleReminder(r)}
                        className="text-amber-400 hover:text-muted"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="truncate">
                        {r.personName ? `[${r.personName}] ` : ''}{r.title}
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteReminder(r.id)}
                      className="text-muted hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Custom Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#11141D] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#141824]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Bell className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">Erinnerung anlegen</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type Switcher: Zu Sagen vs Machen */}
              <div className="grid grid-cols-2 gap-2 bg-[#161B26] p-1 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setReminderType('say_to_person')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    reminderType === 'say_to_person'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Wem was sagen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReminderType('action')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    reminderType === 'action'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Etwas erledigen</span>
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Was möchtest du sagen oder erledigen? *
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    reminderType === 'say_to_person'
                      ? 'z. B. Bescheid sagen wegen Geburtstag / Skript fragen...'
                      : 'z. B. Wäsche aufhängen, Paket abholen...'
                  }
                  className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Person Name (Optional) */}
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Name der Person (Optional)</span>
                  <span className="text-[10px] text-muted">z. B. Mama, Hr. Weber, Lukas</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="Mama, Lehrer, Kollege..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#161B26] border border-white/10 text-sm text-white placeholder-muted focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Enddatum Toggle: Mit Datum vs Ohne Frist */}
              <div className="rounded-2xl bg-[#161B26] p-3 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Fälligkeit / Enddatum festlegen?</span>
                  <input
                    type="checkbox"
                    id="hasDueDate"
                    checked={hasDueDate}
                    onChange={(e) => setHasDueDate(e.target.checked)}
                    className="h-4 w-4 rounded bg-black/40 border-white/20 text-amber-600 focus:ring-amber-500"
                  />
                </div>

                {hasDueDate ? (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                    <div>
                      <label className="block text-[10px] text-muted uppercase mb-1">Datum</label>
                      <input
                        type="date"
                        value={dueDateStr}
                        onChange={(e) => setDueDateStr(e.target.value)}
                        className="w-full rounded-xl bg-[#11141D] border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted uppercase mb-1">Uhrzeit</label>
                      <input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="w-full rounded-xl bg-[#11141D] border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-purple-300/90 flex items-center gap-1.5 pt-1">
                    <CalendarOff className="h-3.5 w-3.5" />
                    <span>Ohne Frist: Bleibt in der Liste, bis du es erledigst.</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-white"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/30 active:scale-95 transition-all"
                >
                  {submitting ? 'Speichere...' : 'Erinnerung speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
