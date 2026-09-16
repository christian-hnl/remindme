'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Cake, Plus, Trash2 } from 'lucide-react';
import type { Birthday } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { countdownLabel, daysUntil, nextBirthday } from '@/lib/school';

export interface BirthdayPayload {
  name: string;
  month: number;
  day: number;
  year: number | null;
}

interface BirthdaysCardProps {
  birthdays: Birthday[];
  createRequest: boolean;
  onCreateRequestHandled: () => void;
  onAdd: (payload: BirthdayPayload) => Promise<void>;
  onDelete: (id: string) => void;
}

const COLLAPSED = 6;

export const BirthdaysCard: React.FC<BirthdaysCardProps> = ({ birthdays, createRequest, onCreateRequestHandled, onAdd, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', yearUnknown: false });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm({ name: '', date: '', yearUnknown: false });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!createRequest) return;
    openCreate();
    onCreateRequestHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRequest]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [y, m, d] = form.date.split('-').map(Number);
    if (!form.name.trim() || !m || !d) return;
    setSaving(true);
    try {
      await onAdd({ name: form.name.trim(), month: m, day: d, year: form.yearUnknown ? null : y });
      setIsOpen(false);
    } catch {
      // toast from container
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();
  const sorted = birthdays
    .map((b) => {
      const next = nextBirthday(b.month, b.day, now);
      return { birthday: b, next, days: daysUntil(next, now), age: b.year ? next.getFullYear() - b.year : null };
    })
    .sort((a, b) => a.days - b.days);
  const visible = showAll ? sorted : sorted.slice(0, COLLAPSED);

  return (
    <section className="card" aria-label="Geburtstage">
      <div className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div>
          <p className="eyebrow">Menschen</p>
          <h2 className="card-title mt-1">Geburtstage</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {sorted.length === 0 ? 'Nie wieder einen vergessen' : `Nächster: ${sorted[0].birthday.name} ${countdownLabel(sorted[0].days)}`}
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-secondary h-9 flex-shrink-0 px-3">
          <Plus className="h-4 w-4" /> Neu
        </button>
      </div>

      <div className="px-4 pb-3 sm:px-5">
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-ink-3">Noch keine Geburtstage eingetragen.</p>
        ) : (
          <ul className="divide-y divide-line/10">
            {visible.map(({ birthday, next, days, age }) => (
              <li key={birthday.id} className="group flex items-center gap-3 py-2.5">
                <div
                  className={`flex w-12 flex-shrink-0 flex-col items-center rounded-[10px] border py-1 ${
                    days === 0 ? 'border-marker bg-marker/30 text-ink' : days <= 7 ? 'border-warn/40 text-warn' : 'border-line/15 text-ink-2'
                  }`}
                >
                  <span className="font-display text-[20px] font-bold leading-none tabular">{birthday.day}</span>
                  <span className="text-[10px] font-bold uppercase">{format(next, 'MMM', { locale: de })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-ink">
                    {birthday.name}
                    {days === 0 && ' 🎉'}
                  </p>
                  <p className="text-[13px] text-ink-3">
                    {days === 0 ? 'hat heute Geburtstag' : countdownLabel(days)}
                    {age !== null && ` · wird ${age}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Geburtstag von ${birthday.name} löschen?`)) onDelete(birthday.id);
                  }}
                  className="icon-btn h-9 w-9 hover:text-pen sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                  aria-label={`${birthday.name} löschen`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {sorted.length > COLLAPSED && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="btn-ghost w-full">
            {showAll ? 'Weniger anzeigen' : `Alle ${sorted.length} anzeigen`}
          </button>
        )}
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="sm"
        title="Geburtstag eintragen"
        icon={<Cake className="h-[18px] w-[18px]" />}
        footer={
          <>
            <button type="button" onClick={() => setIsOpen(false)} className="btn-ghost">
              Abbrechen
            </button>
            <button type="submit" form="birthday-form" disabled={saving || !form.name.trim() || !form.date} className="btn-primary">
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
          </>
        }
      >
        <form id="birthday-form" onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="birthday-name" className="field-label">
              Name
            </label>
            <input
              id="birthday-name"
              autoFocus
              required
              value={form.name}
              maxLength={80}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="z. B. Oma, Lukas"
              className="field-input text-[16px]"
            />
          </div>
          <div>
            <label htmlFor="birthday-date" className="field-label">
              Geburtstag
            </label>
            <input id="birthday-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field-input font-mono text-[14px]" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink-2">
            <input type="checkbox" checked={form.yearUnknown} onChange={(e) => setForm({ ...form, yearUnknown: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--accent))]" />
            Jahr unbekannt (Alter nicht anzeigen)
          </label>
        </form>
      </Modal>
    </section>
  );
};
