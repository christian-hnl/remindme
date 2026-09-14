'use client';

import React, { useState } from 'react';
import { SavingsPot } from '@/types';
import { X, Plus, Sparkles, CheckCircle } from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  pot: SavingsPot | null;
  onDepositSuccess: (potId: string, amount: number) => Promise<void>;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  pot,
  onDepositSuccess,
}) => {
  const [amount, setAmount] = useState<number>(25);
  const [customVal, setCustomVal] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !pot) return null;

  const quickAmounts = [10, 25, 50, 100];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customVal ? parseFloat(customVal) : amount;
    if (isNaN(finalAmount) || finalAmount <= 0) return;

    setLoading(true);
    try {
      await onDepositSuccess(pot.id, finalAmount);
      fireMilestoneGlow();
      onClose();
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
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              Einzahlen in „{pot.name}“
            </h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleDeposit} className="p-6 space-y-4">
          <div className="text-center py-2">
            <div className="text-xs text-muted mb-1">Aktueller Stand</div>
            <div className="font-mono text-2xl font-bold text-white">
              {pot.currentAmount.toLocaleString('de-DE')} / {pot.targetAmount.toLocaleString('de-DE')} €
            </div>
          </div>

          {/* Quick Amounts */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Betrag auswählen
            </label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setAmount(q);
                    setCustomVal('');
                  }}
                  className={`py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                    amount === q && !customVal
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-[#161B26] text-muted hover:text-white border border-white/5'
                  }`}
                >
                  +{q} €
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Oder individueller Betrag
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                placeholder="z. B. 75.50"
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="absolute right-3.5 top-2.5 text-sm text-muted">€</span>
            </div>
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
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
            >
              {loading ? 'Buche...' : 'Betrag einzahlen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
