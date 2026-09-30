'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/client';
import { WEEKDAY_SHORT } from '@/lib/nutrition/dates';
import { EQUIPMENT, REMINDER_LABELS, STORES, TRAINING_SHORT, type NutritionSettingsData, type ReminderKind, type StoreId, type TrainingType } from '@/lib/nutrition/types';

interface NutritionSettingsProps {
  onSaved: () => void;
}

const TRAINING_OPTIONS: TrainingType[] = ['upper', 'lower', 'rest'];

/** Everything the plan was built on – changing it adapts the plan on its next load. */
export function NutritionSettings({ onSaved }: NutritionSettingsProps) {
  const toast = useToast();
  const [form, setForm] = useState<NutritionSettingsData | null>(null);
  const [dislike, setDislike] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<NutritionSettingsData>('/api/v1/nutrition/settings')
      .then(setForm)
      .catch((error) => toast(`Einstellungen: ${errorMessage(error)}`, 'error'));
  }, [toast]);

  if (!form) return <p className="text-[14px] text-ink-3">Lädt…</p>;

  const set = <K extends keyof NutritionSettingsData>(key: K, value: NutritionSettingsData[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    setSaving(true);
    try {
      setForm(await api<NutritionSettingsData>('/api/v1/nutrition/settings', { method: 'PATCH', body: form }));
      toast('Ernährung gespeichert – der Plan passt sich an');
      onSaved();
    } catch (error) {
      toast(`Speichern fehlgeschlagen: ${errorMessage(error)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const numberInput = (key: 'kcalTarget' | 'kcalTolerance' | 'proteinMin' | 'proteinMax' | 'fatMin' | 'fatMax' | 'trainingMinutes' | 'commuteMinutes', label: string, unit: string) => (
    <div>
      <label htmlFor={`nut-${key}`} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={`nut-${key}`}
          inputMode="numeric"
          value={String(form[key])}
          onChange={(e) => set(key, parseInt(e.target.value || '0', 10) || 0)}
          className="field-input pr-12 font-mono"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">{unit}</span>
      </div>
    </div>
  );

  const timeInput = (key: 'trainingTime' | 'weekendBreakfast' | 'prepStartTime' | 'eveningTime' | 'checkInTime', label: string) => (
    <div>
      <label htmlFor={`nut-${key}`} className="field-label">
        {label}
      </label>
      <input id={`nut-${key}`} type="time" value={form[key]} onChange={(e) => set(key, e.target.value)} className="field-input font-mono" />
    </div>
  );

  const addDislike = () => {
    const value = dislike.trim();
    if (value && !form.dislikes.includes(value)) set('dislikes', [...form.dislikes, value]);
    setDislike('');
  };

  return (
    <div className="space-y-7">
      <p className="text-[14px] leading-relaxed text-ink-2">
        Der Plan richtet sich nach diesen Werten. Uhrzeiten für Jause, Mittag und Pre-Workout kommen aus deinem WebUntis-Stundenplan – hier legst du nur fest, wann du trainierst und wie lange dein Heimweg dauert.
      </p>

      <fieldset className="space-y-3">
        <legend className="font-display text-[18px] font-semibold text-ink">Ziele</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {numberInput('kcalTarget', 'kcal pro Tag', 'kcal')}
          {numberInput('kcalTolerance', 'Spielraum ±', 'kcal')}
          <div className="hidden sm:block" />
          {numberInput('proteinMin', 'Protein von', 'g')}
          {numberInput('proteinMax', 'Protein bis', 'g')}
          <div className="hidden sm:block" />
          {numberInput('fatMin', 'Fett von', 'g')}
          {numberInput('fatMax', 'Fett bis', 'g')}
        </div>
        <p className="text-[13px] text-ink-3">Der Rest sind Kohlenhydrate. Weicht das kcal-Ziel von 2.200 ab, werden Mittag- und Abendessen-Portionen skaliert.</p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-display text-[18px] font-semibold text-ink">Training</legend>
        <div className="grid grid-cols-7 gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div key={day} className="min-w-0">
              <p className="mb-1 text-center text-[12px] font-bold text-ink-3">{WEEKDAY_SHORT[day]}</p>
              <div className="flex flex-col gap-1">
                {TRAINING_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={form.trainingDays[String(day)] === t}
                    onClick={() => set('trainingDays', { ...form.trainingDays, [String(day)]: t })}
                    className="rounded-[8px] border border-line/10 py-1.5 text-[11px] font-bold text-ink-2 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-sheet"
                  >
                    {TRAINING_SHORT[t]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {timeInput('trainingTime', 'Lieblings-Trainingszeit')}
          {numberInput('trainingMinutes', 'Training dauert', 'min')}
          {numberInput('commuteMinutes', 'Heimweg', 'min')}
        </div>
        <p className="text-[13px] text-ink-3">An Trainingstagen gibt es nachmittags einen kohlenhydratreichen Pre-Workout-Snack, an Ruhetagen einen mit mehr Fett und Gemüse – die Tagessumme bleibt gleich.</p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-display text-[18px] font-semibold text-ink">Einkauf</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nut-budget" className="field-label">
              Budget pro Woche
            </label>
            <div className="relative">
              <input
                id="nut-budget"
                inputMode="decimal"
                value={String(form.weeklyBudget)}
                onChange={(e) => set('weeklyBudget', parseFloat(e.target.value.replace(',', '.')) || 0)}
                className="field-input pr-9 font-mono"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3">€</span>
            </div>
          </div>
          <div>
            <label htmlFor="nut-store" className="field-label">
              Supermarkt
            </label>
            <select id="nut-store" value={form.store} onChange={(e) => set('store', e.target.value as StoreId)} className="field-input">
              {(Object.keys(STORES) as StoreId[]).map((id) => (
                <option key={id} value={id}>
                  {STORES[id].label}
                  {STORES[id].factor !== 1 ? ` (+${Math.round((STORES[id].factor - 1) * 100)} %)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-[10px] bg-inset p-3 text-[14px]">
          <input type="checkbox" checked={form.shopWeekend} onChange={(e) => set('shopWeekend', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]" />
          <span>
            <span className="font-bold text-ink">Wochenende mit einkaufen</span>
            <span className="block text-ink-3">Aus: Am Wochenende isst du zu Hause mit – die Rezepte bleiben als Vorschlag im Plan, kommen aber nicht auf die Liste und ins Budget.</span>
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-display text-[18px] font-semibold text-ink">Küche</legend>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT.filter((e) => e !== 'Mikrowelle').map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={form.equipment.includes(e)}
              onClick={() => set('equipment', form.equipment.includes(e) ? form.equipment.filter((x) => x !== e) : [...form.equipment, e])}
              className="tab"
            >
              {e}
            </button>
          ))}
        </div>
        <label className="flex items-start gap-3 rounded-[10px] bg-inset p-3 text-[14px]">
          <input type="checkbox" checked={form.hasMicrowave} onChange={(e) => set('hasMicrowave', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]" />
          <span>
            <span className="font-bold text-ink">Mikrowelle in der Schule</span>
            <span className="block text-ink-3">Aus: Mittagessen, die du in der Schule isst, müssen kalt schmecken – warme Gerichte werden automatisch getauscht.</span>
          </span>
        </label>
        <div>
          <label htmlFor="nut-dislike" className="field-label">
            Mag ich nicht
          </label>
          <div className="flex gap-2">
            <input
              id="nut-dislike"
              value={dislike}
              onChange={(e) => setDislike(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDislike();
                }
              }}
              placeholder="z. B. Pilze, Thunfisch, Kichererbsen"
              className="field-input"
            />
            <button type="button" onClick={addDislike} disabled={!dislike.trim()} className="btn-secondary">
              Dazu
            </button>
          </div>
          {form.dislikes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.dislikes.map((d) => (
                <span key={d} className="chip text-[12px]">
                  {d}
                  <button type="button" onClick={() => set('dislikes', form.dislikes.filter((x) => x !== d))} aria-label={`${d} entfernen`} className="-mr-0.5 text-ink-3 hover:text-pen">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-display text-[18px] font-semibold text-ink">Zeiten</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {timeInput('weekendBreakfast', 'Frühstück ohne Schule')}
          {timeInput('prepStartTime', 'Sonntags-Prep ab')}
          {timeInput('eveningTime', 'Vorabend-Erinnerung')}
          {timeInput('checkInTime', 'Abhaken-Erinnerung')}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-display text-[18px] font-semibold text-ink">Erinnerungen</legend>
        <p className="text-[13px] text-ink-3">Landen in Erinnerungen (Kategorie „Ernährung“) und im Kalender-Abo mit Alarm.</p>
        {(Object.keys(REMINDER_LABELS) as ReminderKind[]).map((kind) => (
          <label key={kind} className="flex items-center gap-3 rounded-[10px] px-1 py-1.5 text-[14px]">
            <input
              type="checkbox"
              checked={form.reminders[kind]}
              onChange={(e) => set('reminders', { ...form.reminders, [kind]: e.target.checked })}
              className="h-4 w-4 accent-[rgb(var(--accent))]"
            />
            <span className="font-bold text-ink">{REMINDER_LABELS[kind].label}</span>
            <span className="text-ink-3">{REMINDER_LABELS[kind].hint}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Speichert…' : 'Ernährung speichern'}
        </button>
      </div>
    </div>
  );
}
