'use client';

import React, { useEffect, useState } from 'react';
import { addMonths, differenceInCalendarMonths, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import type { SavingsPot } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatEuro, fromDateInput, parseAmount, toDateInput } from '@/lib/format';
import { PotAppearancePicker, PotIcon } from './potIcons';

interface PotDetailsModalProps {
  /** Pot to show; null closes the modal. */
  pot: SavingsPot | null;
  onClose: () => void;
  onMoveMoney: (potId: string, amount: number, direction: 'deposit' | 'withdraw') => Promise<void>;
  onUpdatePot: (potId: string, updates: Partial<SavingsPot>) => Promise<void>;
  onDeletePot: (potId: string) => Promise<void>;
}

type Tab = 'deposit' | 'withdraw' | 'edit';

const QUICK_AMOUNTS = [10, 25, 50, 100];

export const PotDetailsModal: React.FC<PotDetailsModalProps> = ({ pot, onClose, onMoveMoney, onUpdatePot, onDeletePot }) => {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('deposit');
  const [amount, setAmount] = useState('25');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState({ name: '', targetAmount: '', monthlyContribution: '', targetDate: '', colorHex: '', icon: '' });

  useEffect(() => {
    if (!pot) return;
    setTab('deposit');
    setAmount('25');
    setEdit({
      name: pot.name,
      targetAmount: String(pot.targetAmount),
      monthlyContribution: String(pot.monthlyContribution),
      targetDate: pot.targetDate ? toDateInput(new Date(pot.targetDate)) : '',
      colorHex: pot.colorHex,
      icon: pot.icon,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pot?.id]);

  if (!pot) return null;

  const remaining = Math.max(0, pot.targetAmount - pot.currentAmount);
  const percentage = pot.targetAmount > 0 ? Math.min(100, Math.round((pot.currentAmount / pot.targetAmount) * 100)) : 0;

  let projection: string | null = null;
  if (remaining > 0 && pot.monthlyContribution > 0) {
    const months = Math.ceil(remaining / pot.monthlyContribution);
    projection = `Mit ${formatEuro(pot.monthlyContribution, 0)} im Monat bist du ca. im ${format(addMonths(new Date(), months), 'MMMM yyyy', { locale: de })} am Ziel.`;
  }
  if (remaining > 0 && pot.targetDate) {
    const monthsLeft = Math.max(1, differenceInCalendarMonths(new Date(pot.targetDate), new Date()));
    const needed = remaining / monthsLeft;
    if (needed > pot.monthlyContribution + 0.5) {
      projection = `${projection ? `${projection} ` : ''}Für dein Zieldatum brauchst du ${formatEuro(needed, 0)} im Monat.`;
    }
  }

  const submitMove = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!(value > 0)) return toast('Bitte einen Betrag über 0 eingeben', 'error');
    if (tab === 'withdraw' && value > pot.currentAmount + 0.001) return toast(`Im Topf sind nur ${formatEuro(pot.currentAmount)}`, 'error');
    setBusy(true);
    try {
      await onMoveMoney(pot.id, value, tab === 'withdraw' ? 'withdraw' : 'deposit');
      onClose();
    } catch {
      // Container shows the error; keep the modal open.
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseAmount(edit.targetAmount);
    const monthly = edit.monthlyContribution ? parseAmount(edit.monthlyContribution) : 0;
    if (!edit.name.trim()) return toast('Bitte einen Namen eingeben', 'error');
    if (!(target > 0)) return toast('Das Ziel muss größer als 0 sein', 'error');
    if (!(monthly >= 0)) return toast('Ungültige Sparrate', 'error');

    setBusy(true);
    try {
      await onUpdatePot(pot.id, {
        name: edit.name.trim(),
        targetAmount: target,
        monthlyContribution: monthly,
        targetDate: edit.targetDate ? fromDateInput(edit.targetDate).toISOString() : null,
        colorHex: edit.colorHex,
        icon: edit.icon,
      });
      onClose();
    } catch {
      // handled by container
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const refundNote = pot.currentAmount > 0 ? `\n\n${formatEuro(pot.currentAmount)} werden aufs Konto zurückgebucht.` : '';
    if (!window.confirm(`Spartopf „${pot.name}“ löschen?${refundNote}`)) return;
    setBusy(true);
    try {
      await onDeletePot(pot.id);
    } catch {
      // handled by container
    } finally {
      setBusy(false);
    }
  };

  const submitLabel = busy ? 'Speichert…' : tab === 'deposit' ? 'Einzahlen' : tab === 'withdraw' ? 'Entnehmen' : 'Speichern';

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title={pot.name}
      subtitle={`${formatEuro(pot.currentAmount)} von ${formatEuro(pot.targetAmount, 0)}`}
      icon={
        <span style={{ color: pot.colorHex }}>
          <PotIcon icon={pot.icon} className="h-[18px] w-[18px]" />
        </span>
      }
      footer={
        <>
          {tab === 'edit' && (
            <button type="button" onClick={handleDelete} disabled={busy} className="btn-danger mr-auto">
              <Trash2 className="h-4 w-4" /> Löschen
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">
            Abbrechen
          </button>
          <button type="submit" form={tab === 'edit' ? 'pot-edit-form' : 'pot-move-form'} disabled={busy} className="btn-primary">
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-[34px] font-bold leading-none text-ink tabular">{percentage}%</span>
            <span className="text-[13px] text-ink-3">{remaining > 0 ? `noch ${formatEuro(remaining, 0)}` : 'Ziel erreicht'}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-inset">
            <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: pot.colorHex }} />
          </div>
          {projection && <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{projection}</p>}
        </div>

        <div className="segmented grid-cols-3" role="group" aria-label="Aktion">
          {(
            [
              ['deposit', 'Einzahlen'],
              ['withdraw', 'Entnehmen'],
              ['edit', 'Bearbeiten'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className="segmented-item">
              {label}
            </button>
          ))}
        </div>

        {tab !== 'edit' ? (
          <form id="pot-move-form" onSubmit={submitMove} className="space-y-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Schnellbeträge">
              {(tab === 'deposit' ? QUICK_AMOUNTS : QUICK_AMOUNTS.filter((q) => q <= pot.currentAmount)).map((q) => (
                <button
                  key={q}
                  type="button"
                  aria-pressed={parseAmount(amount) === q}
                  onClick={() => setAmount(String(q))}
                  className="tab border-line/15 font-mono"
                >
                  {q} €
                </button>
              ))}
              {tab === 'withdraw' && pot.currentAmount > 0 && (
                <button type="button" onClick={() => setAmount(String(pot.currentAmount))} className="tab border-line/15">
                  Alles
                </button>
              )}
            </div>
            <div>
              <label htmlFor="pot-amount" className="field-label">
                Betrag
              </label>
              <div className="relative">
                <input
                  id="pot-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="field-input pr-9 font-mono text-[18px]"
                  autoFocus
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3">€</span>
              </div>
            </div>
          </form>
        ) : (
          <form id="pot-edit-form" onSubmit={submitEdit} className="space-y-4">
            <div>
              <label htmlFor="pot-name" className="field-label">
                Name
              </label>
              <input id="pot-name" value={edit.name} maxLength={80} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="field-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pot-target" className="field-label">
                  Ziel (€)
                </label>
                <input id="pot-target" inputMode="decimal" value={edit.targetAmount} onChange={(e) => setEdit({ ...edit, targetAmount: e.target.value })} className="field-input font-mono" />
              </div>
              <div>
                <label htmlFor="pot-monthly" className="field-label">
                  Pro Monat (€)
                </label>
                <input
                  id="pot-monthly"
                  inputMode="decimal"
                  value={edit.monthlyContribution}
                  onChange={(e) => setEdit({ ...edit, monthlyContribution: e.target.value })}
                  className="field-input font-mono"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pot-date" className="field-label">
                Zieldatum
              </label>
              <input id="pot-date" type="date" value={edit.targetDate} onChange={(e) => setEdit({ ...edit, targetDate: e.target.value })} className="field-input font-mono" />
            </div>
            <PotAppearancePicker
              icon={edit.icon}
              colorHex={edit.colorHex}
              onIconChange={(icon) => setEdit({ ...edit, icon })}
              onColorChange={(colorHex) => setEdit({ ...edit, colorHex })}
            />
          </form>
        )}
      </div>
    </Modal>
  );
};
