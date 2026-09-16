'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import type { Transaction } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/client';
import { fromDateInput, parseAmount, toDateInput } from '@/lib/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryMeta } from '@/lib/finance/categories';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated: (tx: Transaction) => void;
}

const CATEGORIES = {
  expense: EXPENSE_CATEGORIES as readonly string[],
  income: INCOME_CATEGORIES as readonly string[],
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onTransactionCreated }) => {
  const toast = useToast();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [date, setDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType('expense');
    setTitle('');
    setAmount('');
    setCategory(CATEGORIES.expense[0]);
    setDate(toDateInput(new Date()));
    setIsRecurring(false);
  }, [isOpen]);

  const switchType = (next: 'expense' | 'income') => {
    setType(next);
    setCategory(CATEGORIES[next][0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!title.trim()) return;
    if (!(value > 0)) return toast('Bitte einen Betrag über 0 eingeben', 'error');

    // Today keeps the current time (so it sorts correctly), other days use noon.
    const chosen = fromDateInput(date);
    const transactionDate = date === toDateInput(new Date()) ? new Date() : new Date(chosen.setHours(12));

    setLoading(true);
    try {
      const tx = await api<Transaction>('/api/v1/transactions', {
        body: { title: title.trim(), amount: value, category, type, isRecurring, transactionDate: transactionDate.toISOString() },
      });
      onTransactionCreated(tx);
      onClose();
    } catch (error) {
      toast(`Buchung konnte nicht gespeichert werden: ${errorMessage(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title="Neue Buchung"
      icon={<CreditCard className="h-[18px] w-[18px]" />}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Abbrechen
          </button>
          <button type="submit" form="tx-form" disabled={loading || !title.trim() || !amount} className="btn-primary">
            {loading ? 'Speichert…' : 'Speichern'}
          </button>
        </>
      }
    >
      <form id="tx-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="segmented grid-cols-2" role="group" aria-label="Art">
          <button type="button" aria-pressed={type === 'expense'} onClick={() => switchType('expense')} className="segmented-item">
            Ausgabe
          </button>
          <button type="button" aria-pressed={type === 'income'} onClick={() => switchType('income')} className="segmented-item">
            Einnahme
          </button>
        </div>

        <div>
          <label htmlFor="tx-amount" className="field-label">
            Betrag
          </label>
          <div className="relative">
            <input
              id="tx-amount"
              autoFocus
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className={`field-input h-14 pr-10 font-mono text-[26px] ${type === 'income' ? 'text-leaf' : ''}`}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[20px] text-ink-3">€</span>
          </div>
        </div>

        <div>
          <label htmlFor="tx-title" className="field-label">
            Wofür?
          </label>
          <input
            id="tx-title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'expense' ? 'z. B. Mensa, Kino, Busticket' : 'z. B. Taschengeld'}
            className="field-input"
          />
        </div>

        <div>
          <span className="field-label">Kategorie</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kategorie">
            {CATEGORIES[type].map((c) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className="tab border-line/15">
                {categoryMeta(c).emoji} {c}
              </button>
            ))}
          </div>
          {type === 'expense' && category !== 'Fixkosten' && <p className="mt-2 text-[12px] text-ink-3">Zählt zu deinem Tagesbudget.</p>}
        </div>

        <div className="grid grid-cols-2 items-end gap-3">
          <div>
            <label htmlFor="tx-date" className="field-label">
              Datum
            </label>
            <input id="tx-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="field-input font-mono text-[14px]" />
          </div>
          <button type="button" aria-pressed={isRecurring} onClick={() => setIsRecurring((v) => !v)} className="tab h-[46px] justify-center border-line/15">
            {isRecurring ? 'Jeden Monat' : 'Einmalig'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
