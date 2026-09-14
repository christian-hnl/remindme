'use client';

import React, { useState } from 'react';
import { X, CreditCard, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated: (tx: any) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Lebensmittel');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          amount: parseFloat(amount),
          category,
          type,
          isRecurring,
        }),
      });

      if (res.ok) {
        const tx = await res.json();
        onTransactionCreated(tx);
        setTitle('');
        setAmount('');
        onClose();
      } else {
        alert('Fehler beim Erfassen der Transaktion');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-md rounded-3xl bg-[#11141D] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#141824]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <CreditCard className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Transaktion erfassen</h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Toggle: Ausgabe vs Einnahme */}
          <div className="grid grid-cols-2 gap-2 bg-[#161B26] p-1 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-muted hover:text-white'
              }`}
            >
              <ArrowDownRight className="h-3.5 w-3.5" />
              <span>Ausgabe</span>
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-muted hover:text-white'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Einnahme</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Beschreibung / Zweck *
            </label>
            <input
              autoFocus
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Bäcker, Supermarkt REWE, Gehalt..."
              className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Betrag (€) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="12.50"
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Kategorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Lebensmittel">Lebensmittel</option>
                <option value="Fixkosten">Fixkosten / Verträge</option>
                <option value="Transport">Transport / Bahn</option>
                <option value="Freizeit">Freizeit & Ausgehen</option>
                <option value="Bildung">Bildung & Uni</option>
                <option value="Einkommen">Einkommen</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded bg-[#161B26] border-white/20 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <label htmlFor="isRecurring" className="text-xs text-muted cursor-pointer">
              Wiederkehrende Ausgabe (Abo / Dauerauftrag)
            </label>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-white"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !amount}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
            >
              {loading ? 'Buche...' : 'Transaktion speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
