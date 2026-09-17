'use client';

import React, { useState } from 'react';
import { Landmark, School, Upload } from 'lucide-react';
import { api, errorMessage } from '@/lib/client';
import { parseAmount } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

interface WelcomeCardProps {
  onDone: () => void;
  onConnectUntis: () => void;
  onConnectBank: () => void;
  onImport: () => void;
}

/** First start: name, balance and budget – everything else is optional and can follow later. */
export function WelcomeCard({ onDone, onConnectUntis, onConnectBank, onImport }: WelcomeCardProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (skip: boolean) => {
    const body: Record<string, unknown> = { preferences: { onboardingDone: true } };
    if (!skip) {
      if (name.trim()) body.displayName = name.trim();
      if (balance.trim()) {
        const value = parseAmount(balance);
        if (Number.isNaN(value)) return toast('Kontostand ist keine gültige Zahl', 'error');
        body.startingBalance = value;
      }
      if (budget.trim()) {
        const value = parseAmount(budget);
        if (Number.isNaN(value) || value < 0) return toast('Budget ist keine gültige Zahl', 'error');
        body.monthlyBudget = value;
      }
    }
    setSaving(true);
    try {
      await api('/api/v1/settings', { body });
      if (!skip) toast(name.trim() ? `Willkommen, ${name.trim()}!` : 'Gespeichert');
      onDone();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card rise overflow-hidden" aria-label="Willkommen">
      <div className="border-b border-line/10 bg-accent/10 px-4 py-4 sm:px-6">
        <p className="eyebrow">Erster Start</p>
        <h1 className="mt-1 font-display text-[32px] font-bold leading-none text-ink sm:text-[40px]">Willkommen bei LifeTracker 👋</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-2">Alles ist leer und gehört dir. Drei kurze Angaben – den Rest kannst du jederzeit später einrichten.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6"
      >
        <div>
          <label htmlFor="welcome-name" className="field-label">
            Wie heißt du?
          </label>
          <input id="welcome-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Vorname" autoComplete="given-name" className="field-input" />
        </div>
        <div>
          <label htmlFor="welcome-balance" className="field-label">
            Kontostand jetzt <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <div className="relative">
            <input id="welcome-balance" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0,00" className="field-input pr-8 font-mono" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">€</span>
          </div>
          <p className="mt-1 text-[12px] text-ink-3">Bargeld & Konten ohne Bankanbindung</p>
        </div>
        <div>
          <label htmlFor="welcome-budget" className="field-label">
            Monatsbudget <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <div className="relative">
            <input id="welcome-budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="z. B. 300" className="field-input pr-8 font-mono" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">€</span>
          </div>
          <p className="mt-1 text-[12px] text-ink-3">Zum freien Ausgeben, ohne Fixkosten</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Speichert…' : 'Loslegen'}
          </button>
          <button type="button" onClick={() => save(true)} disabled={saving} className="btn-ghost">
            Überspringen
          </button>
        </div>
      </form>

      <div className="border-t border-line/10 px-4 py-4 sm:px-6">
        <p className="field-label">Optional verbinden</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onConnectUntis} className="btn-secondary">
            <School className="h-4 w-4" /> Stundenplan (WebUntis)
          </button>
          <button type="button" onClick={onConnectBank} className="btn-secondary">
            <Landmark className="h-4 w-4" /> Bank verbinden
          </button>
          <button type="button" onClick={onImport} className="btn-secondary">
            <Upload className="h-4 w-4" /> Umsätze importieren
          </button>
        </div>
      </div>
    </section>
  );
}
