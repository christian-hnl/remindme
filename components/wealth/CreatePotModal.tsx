'use client';

import React, { useEffect, useState } from 'react';
import { PiggyBank } from 'lucide-react';
import type { SavingsPot } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/client';
import { fromDateInput, parseAmount } from '@/lib/format';
import { PotAppearancePicker } from './potIcons';

interface CreatePotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPotCreated: (pot: SavingsPot) => void;
}

const EMPTY = { name: '', targetAmount: '', currentAmount: '', monthlyContribution: '', targetDate: '', icon: 'piggy-bank', colorHex: '#10B981' };

export const CreatePotModal: React.FC<CreatePotModalProps> = ({ isOpen, onClose, onPotCreated }) => {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(EMPTY);
  }, [isOpen]);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseAmount(form.targetAmount);
    const current = form.currentAmount ? parseAmount(form.currentAmount) : 0;
    const monthly = form.monthlyContribution ? parseAmount(form.monthlyContribution) : 0;
    if (!form.name.trim()) return;
    if (!(target > 0)) return toast('Das Ziel muss größer als 0 sein', 'error');
    if (!(current >= 0) || !(monthly >= 0)) return toast('Beträge dürfen nicht negativ sein', 'error');

    setLoading(true);
    try {
      const pot = await api<SavingsPot>('/api/v1/savings-pots', {
        body: {
          name: form.name.trim(),
          targetAmount: target,
          currentAmount: current,
          monthlyContribution: monthly,
          targetDate: form.targetDate ? fromDateInput(form.targetDate).toISOString() : null,
          icon: form.icon,
          colorHex: form.colorHex,
        },
      });
      onPotCreated(pot);
      onClose();
    } catch (error) {
      toast(`Spartopf konnte nicht angelegt werden: ${errorMessage(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title="Neuer Spartopf"
      icon={<PiggyBank className="h-[18px] w-[18px]" />}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Abbrechen
          </button>
          <button type="submit" form="create-pot-form" disabled={loading || !form.name.trim() || !form.targetAmount} className="btn-primary">
            {loading ? 'Legt an…' : 'Anlegen'}
          </button>
        </>
      }
    >
      <form id="create-pot-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-pot-name" className="field-label">
            Wofür sparst du?
          </label>
          <input
            id="new-pot-name"
            autoFocus
            required
            maxLength={80}
            value={form.name}
            onChange={set('name')}
            placeholder="z. B. Führerschein, neues Handy"
            className="field-input text-[16px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="new-pot-target" className="field-label">
              Ziel (€)
            </label>
            <input id="new-pot-target" inputMode="decimal" required value={form.targetAmount} onChange={set('targetAmount')} placeholder="1000" className="field-input font-mono" />
          </div>
          <div>
            <label htmlFor="new-pot-current" className="field-label">
              Schon gespart
            </label>
            <input id="new-pot-current" inputMode="decimal" value={form.currentAmount} onChange={set('currentAmount')} placeholder="0" className="field-input font-mono" />
          </div>
          <div>
            <label htmlFor="new-pot-monthly" className="field-label">
              Pro Monat
            </label>
            <input id="new-pot-monthly" inputMode="decimal" value={form.monthlyContribution} onChange={set('monthlyContribution')} placeholder="50" className="field-input font-mono" />
          </div>
          <div>
            <label htmlFor="new-pot-date" className="field-label">
              Bis wann?
            </label>
            <input id="new-pot-date" type="date" value={form.targetDate} onChange={set('targetDate')} className="field-input font-mono text-[14px]" />
          </div>
        </div>

        <PotAppearancePicker
          icon={form.icon}
          colorHex={form.colorHex}
          onIconChange={(icon) => setForm((f) => ({ ...f, icon }))}
          onColorChange={(colorHex) => setForm((f) => ({ ...f, colorHex }))}
        />
      </form>
    </Modal>
  );
};
