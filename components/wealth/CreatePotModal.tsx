'use client';

import React, { useState } from 'react';
import { X, PiggyBank, Laptop, Palmtree, ShieldCheck, Heart, Car, Sparkles } from 'lucide-react';

interface CreatePotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPotCreated: (pot: any) => void;
}

export const CreatePotModal: React.FC<CreatePotModalProps> = ({
  isOpen,
  onClose,
  onPotCreated,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('piggy-bank');
  const [colorHex, setColorHex] = useState('#10B981');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const iconOptions = [
    { id: 'piggy-bank', label: 'Sparen' },
    { id: 'laptop', label: 'Tech' },
    { id: 'palmtree', label: 'Urlaub' },
    { id: 'shield-check', label: 'Notgroschen' },
  ];

  const colorOptions = ['#10B981', '#6366F1', '#8B5CF6', '#F59E0B', '#EC4899'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/savings-pots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          targetAmount: parseFloat(targetAmount),
          currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
          monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : 0,
          targetDate: targetDate || null,
          icon,
          colorHex,
        }),
      });

      if (res.ok) {
        const newPot = await res.json();
        onPotCreated(newPot);
        setName('');
        setTargetAmount('');
        onClose();
      } else {
        alert('Fehler beim Anlegen des Spartopfs');
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
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <PiggyBank className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Neuen Spartopf anlegen</h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Name des Sparziels *
            </label>
            <input
              autoFocus
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Neues iPad Pro, Japan-Reise, Notgroschen..."
              className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Zielbetrag (€) *
              </label>
              <input
                type="number"
                step="1"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="1000"
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Startguthaben (€)
              </label>
              <input
                type="number"
                step="1"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Monatliche Sparrate (€)
              </label>
              <input
                type="number"
                step="1"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="100"
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Zieldatum (Optional)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Color selector */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Akzentfarbe
            </label>
            <div className="flex items-center gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorHex(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    colorHex === c ? 'scale-110 border-white' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
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
              disabled={loading || !name.trim() || !targetAmount}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
            >
              {loading ? 'Erstelle...' : 'Spartopf erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
