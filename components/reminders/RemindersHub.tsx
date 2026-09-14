'use client';

import React, { useState } from 'react';
import { Reminder } from '@/types';
import { 
  Bell, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Sparkles, 
  Clock, 
  Repeat, 
  Package, 
  Shirt, 
  Pill, 
  Trash, 
  Droplet,
  Calendar,
  X
} from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';

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
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Haushalt');
  const [dueTime, setDueTime] = useState('18:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [repeatPattern, setRepeatPattern] = useState<'none' | 'daily' | 'weekly'>('none');
  const [submitting, setSubmitting] = useState(false);

  // One-click quick presets
  const quickPresets = [
    { title: 'Wäsche rausbringen / aufhängen', category: 'Haushalt', icon: 'shirt', dueTime: '18:30' },
    { title: 'Paket aus Packstation abholen', category: 'Erledigung', icon: 'package', dueTime: '17:00' },
    { title: 'Vitamine & Medis nehmen', category: 'Gesundheit', icon: 'pill', dueTime: '08:30', repeatPattern: 'daily' as const },
    { title: 'Mülltonne rausstellen', category: 'Haushalt', icon: 'trash', dueTime: '20:00' },
    { title: '2L Wasser trinken', category: 'Gesundheit', icon: 'droplet', dueTime: '14:00' },
  ];

  const handleQuickAdd = async (preset: typeof quickPresets[0]) => {
    await onAddReminder({
      title: preset.title,
      category: preset.category,
      dueTime: preset.dueTime,
      icon: preset.icon,
      priority: 'medium',
      repeatPattern: (preset.repeatPattern as any) || 'none',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onAddReminder({
        title: title.trim(),
        category,
        dueTime,
        priority,
        repeatPattern,
        icon: category === 'Haushalt' ? 'shirt' : category === 'Paket' ? 'package' : 'bell',
      });
      setTitle('');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: string, iconName: string) => {
    if (iconName === 'shirt' || cat === 'Haushalt') return <Shirt className="h-3.5 w-3.5 text-blue-400" />;
    if (iconName === 'package' || cat === 'Paket') return <Package className="h-3.5 w-3.5 text-amber-400" />;
    if (iconName === 'pill' || cat === 'Gesundheit') return <Pill className="h-3.5 w-3.5 text-emerald-400" />;
    if (iconName === 'trash') return <Trash className="h-3.5 w-3.5 text-slate-400" />;
    if (iconName === 'droplet') return <Droplet className="h-3.5 w-3.5 text-cyan-400" />;
    return <Bell className="h-3.5 w-3.5 text-indigo-400" />;
  };

  const activeReminders = reminders.filter((r) => !r.isDone);
  const doneReminders = reminders.filter((r) => r.isDone);

  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 sm:p-6 shadow-bento glow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white tracking-tight">
                Alltags-Erinnerungen
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                {activeReminders.length} offen
              </span>
            </div>
            <p className="text-xs text-muted">
              Wäsche, Pakete, Besorgungen & Gewohnheiten
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Erinnerung</span>
        </button>
      </div>

      {/* One-Click Quick Presets Strip */}
      <div className="mb-4">
        <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">
          Schnell-Erfassung mit 1 Klick
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          {quickPresets.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickAdd(qp)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#161B26] hover:bg-white/10 text-muted hover:text-white border border-white/5 text-xs whitespace-nowrap transition-all group active:scale-95"
            >
              <span className="text-xs">{qp.icon === 'shirt' ? '🧺' : qp.icon === 'package' ? '📦' : qp.icon === 'pill' ? '💊' : qp.icon === 'trash' ? '🗑️' : '💧'}</span>
              <span>{qp.title}</span>
              <Plus className="h-3 w-3 text-muted group-hover:text-amber-400 ml-0.5 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-2">
        {activeReminders.length === 0 && doneReminders.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted">
            Keine Erinnerungen vorhanden. Nutze die Schnell-Pills oben für z. B. Wäsche oder Pakete!
          </div>
        ) : (
          <>
            {activeReminders.map((r) => (
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

                  <div className="p-1 rounded-lg bg-white/5 flex-shrink-0">
                    {getCategoryIcon(r.category, r.icon)}
                  </div>

                  <div className="min-w-0">
                    <span className="text-white font-medium block truncate">
                      {r.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                      <span className="text-amber-300/80">{r.category}</span>
                      {r.dueTime && (
                        <span className="flex items-center gap-0.5 font-mono text-white/70">
                          <Clock className="h-2.5 w-2.5" />
                          {r.dueTime} Uhr
                        </span>
                      )}
                      {r.repeatPattern !== 'none' && (
                        <span className="flex items-center gap-0.5 text-indigo-400">
                          <Repeat className="h-2.5 w-2.5" />
                          {r.repeatPattern === 'daily' ? 'Täglich' : 'Wöchentlich'}
                        </span>
                      )}
                    </div>
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
            ))}

            {/* Completed Reminders */}
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
                      <span className="truncate">{r.title}</span>
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

      {/* Modal: Custom Reminder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#11141D] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#141824]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Bell className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">Neue Erinnerung eintragen</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Was möchtest du erledigen? *
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z. B. Wäsche rausbringen, Paket abholen, Medis nehmen..."
                  className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                    Kategorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Haushalt">🧺 Haushalt & Wäsche</option>
                    <option value="Erledigung">📦 Erledigung & Paket</option>
                    <option value="Gesundheit">💊 Gesundheit & Fitness</option>
                    <option value="Uni">📚 Uni & Lernen</option>
                    <option value="Sonstiges">🔔 Sonstiges</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                    Uhrzeit
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                    Wiederholung
                  </label>
                  <select
                    value={repeatPattern}
                    onChange={(e) => setRepeatPattern(e.target.value as any)}
                    className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="none">Einmalig</option>
                    <option value="daily">Täglich wiederholen</option>
                    <option value="weekly">Wöchentlich</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                    Priorität
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="high">🔴 Wichtig</option>
                    <option value="medium">🟡 Normal</option>
                    <option value="low">🔵 Niedrig</option>
                  </select>
                </div>
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
