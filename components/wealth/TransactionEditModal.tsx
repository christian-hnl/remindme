'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Tags, Trash2 } from 'lucide-react';
import type { TransactionType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/client';
import { formatEuro } from '@/lib/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryMeta } from '@/lib/finance/categories';
import { merchantLabel } from '@/lib/finance/merchant';

/** The fields the modal needs – works with full transactions and analysis rows. */
export interface EditableTransaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: TransactionType;
  isRecurring: boolean;
  date: string;
  counterparty?: string | null;
  description?: string | null;
  account?: string | null;
}

interface TransactionEditModalProps {
  transaction: EditableTransaction | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (id: string) => void;
}

const TYPE_LABELS: Partial<Record<TransactionType, string>> = {
  expense: 'Ausgabe',
  income: 'Einnahme',
  transfer: 'Umbuchung',
  investment: 'Investment',
};

export function TransactionEditModal({ transaction, onClose, onSaved, onDelete }: TransactionEditModalProps) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [isRecurring, setIsRecurring] = useState(false);
  const [applyToSimilar, setApplyToSimilar] = useState(true);
  const [remember, setRemember] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    setTitle(transaction.title);
    setCategory(transaction.category);
    setType(transaction.type);
    setIsRecurring(transaction.isRecurring);
    setApplyToSimilar(true);
    setRemember(true);
  }, [transaction]);

  if (!transaction) return null;

  const isPot = transaction.type === 'transfer_to_pot' || transaction.type === 'transfer_from_pot';
  const allowedTypes: TransactionType[] = transaction.amount < 0 ? ['expense', 'transfer', 'investment'] : ['income', 'transfer', 'investment'];
  const baseCategories: readonly string[] = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categories = baseCategories.includes(category) || !category ? baseCategories : [...baseCategories, category];
  const merchant = merchantLabel(transaction.counterparty, transaction.title);
  const categoryChanged = category !== transaction.category;
  const categorizable = type === 'expense' || type === 'income';

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { title: title.trim(), isRecurring, type };
      if (categorizable) body.category = category;
      else body.category = type === 'transfer' ? 'Umbuchung' : 'Sparen & Anlegen';
      if (categorizable && categoryChanged) {
        body.applyToSimilar = applyToSimilar;
        body.remember = remember;
      }
      const res = await api<{ similarUpdated: number }>(`/api/v1/transactions/${transaction.id}`, { method: 'PATCH', body });
      toast(res.similarUpdated > 0 ? `Gespeichert – ${res.similarUpdated} weitere Buchungen angepasst` : 'Buchung gespeichert');
      onSaved();
      onClose();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!transaction}
      onClose={onClose}
      size="sm"
      title="Buchung bearbeiten"
      icon={<Tags className="h-[18px] w-[18px]" />}
      footer={
        <>
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Buchung „${transaction.title}“ löschen?`)) {
                  onDelete(transaction.id);
                  onClose();
                }
              }}
              className="btn-danger mr-auto"
            >
              <Trash2 className="h-4 w-4" /> Löschen
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">
            Abbrechen
          </button>
          {!isPot && (
            <button type="button" onClick={save} disabled={saving || !title.trim()} className="btn-primary">
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-[12px] bg-inset px-4 py-3">
          <p className={`font-mono text-[28px] font-medium tabular ${transaction.amount > 0 ? 'text-leaf' : 'text-ink'}`}>
            {transaction.amount > 0 ? '+' : '−'}
            {formatEuro(Math.abs(transaction.amount))}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {format(new Date(transaction.date), 'EEEE, d. MMMM yyyy', { locale: de })}
            {transaction.account ? ` · ${transaction.account}` : ''}
          </p>
          {transaction.description && <p className="mt-1 line-clamp-3 text-[12px] text-ink-3">{transaction.description}</p>}
        </div>

        {isPot ? (
          <p className="text-[14px] text-ink-2">Spartopf-Buchungen entstehen beim Ein- und Auszahlen und können nur gelöscht werden.</p>
        ) : (
          <>
            <div>
              <label htmlFor="tx-edit-title" className="field-label">
                Bezeichnung
              </label>
              <input id="tx-edit-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className="field-input" />
            </div>

            <div>
              <span className="field-label">Art</span>
              <div className="segmented grid-cols-3" role="group" aria-label="Art">
                {allowedTypes.map((t) => (
                  <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className="segmented-item">
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              {!categorizable && <p className="mt-2 text-[12px] text-ink-3">Zählt nicht als Ausgabe oder Einnahme in der Analyse.</p>}
            </div>

            {categorizable && (
              <div>
                <span className="field-label">Kategorie</span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kategorie">
                  {categories.map((c) => (
                    <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className="tab border-line/15">
                      {categoryMeta(c).emoji} {c}
                    </button>
                  ))}
                </div>
                {categoryChanged && (
                  <div className="mt-3 space-y-2 rounded-[10px] border border-line/10 p-3">
                    <label className="flex items-start gap-2.5 text-[14px] text-ink">
                      <input type="checkbox" checked={applyToSimilar} onChange={(e) => setApplyToSimilar(e.target.checked)} className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" />
                      <span>
                        Alle Buchungen von <b>{merchant}</b> ändern
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 text-[14px] text-ink">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" />
                      <span>Für künftige Importe merken</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            <button type="button" aria-pressed={isRecurring} onClick={() => setIsRecurring((v) => !v)} className="tab h-11 w-full justify-center border-line/15">
              {isRecurring ? '🔁 Regelmäßige Zahlung (Abo)' : 'Einmalige Zahlung'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
