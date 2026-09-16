'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ShoppingItem } from '@/types';
import { CheckButton } from '@/components/ui/CheckButton';

interface ShoppingListProps {
  items: ShoppingItem[];
  focusRequest: boolean;
  onFocusHandled: () => void;
  onAdd: (name: string, quantity: string | null) => Promise<void>;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
  onClearDone: () => void;
}

/** "2 Milch", "500g Mehl", "3x Joghurt" → quantity + name. */
function splitQuantity(input: string): [string, string | null] {
  const match = input.match(/^(\d+(?:[.,]\d+)?\s*(?:x|stk\.?|g|kg|l|ml|pkg\.?|packungen?|flaschen?)?)\s+(.+)$/i);
  return match ? [match[2].trim(), match[1].trim()] : [input.trim(), null];
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ items, focusRequest, onFocusHandled, onAdd, onToggle, onDelete, onClearDone }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusRequest) return;
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    onFocusHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const [name, quantity] = splitQuantity(input);
    try {
      await onAdd(name, quantity);
      setInput('');
    } catch {
      // toast from container
    }
  };

  const open = items.filter((i) => !i.isDone);
  const done = items.filter((i) => i.isDone);

  return (
    <section className="card" aria-label="Einkaufsliste">
      <div className="p-4 pb-2 sm:p-5 sm:pb-2">
        <p className="eyebrow">Alltag</p>
        <h2 className="card-title mt-1">Einkaufsliste</h2>
        <p className="mt-1 text-[13px] text-ink-3">{open.length === 0 ? 'Alles besorgt' : `${open.length} offen`}</p>
      </div>

      <form onSubmit={submit} className="mx-4 mt-2 flex gap-2 sm:mx-5">
        <label htmlFor="shopping-input" className="sr-only">
          Artikel hinzufügen
        </label>
        <input
          id="shopping-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="z. B. 2 Milch, Brot"
          maxLength={120}
          className="field-input h-10 py-0"
          autoComplete="off"
        />
        <button type="submit" disabled={!input.trim()} className="btn-primary h-10 w-10 flex-shrink-0 px-0" aria-label="Hinzufügen">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </form>

      <div className="px-4 pb-3 pt-1 sm:px-5">
        {open.length === 0 && done.length === 0 && <p className="py-6 text-center text-[14px] text-ink-3">Die Liste ist leer.</p>}
        <ul className="divide-y divide-line/10">
          {open.map((item) => (
            <li key={item.id} className="group flex items-center gap-3 py-2.5">
              <CheckButton checked={false} onChange={() => onToggle(item)} label={`${item.name} abhaken`} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
                {item.quantity && <span className="mr-1.5 font-mono text-[13px] font-medium text-ink-2">{item.quantity}</span>}
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="icon-btn h-9 w-9 hover:text-pen sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                aria-label={`${item.name} entfernen`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        {done.length > 0 && (
          <div className="mt-1 border-t border-line/10 pt-2">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-[11px]">Im Wagen ({done.length})</span>
              <button type="button" onClick={onClearDone} className="btn-ghost h-8 px-2 text-[13px]">
                Leeren
              </button>
            </div>
            <ul>
              {done.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-1.5">
                  <CheckButton checked onChange={() => onToggle(item)} label={`${item.name} wieder offen`} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink-3 line-through">
                    {item.quantity ? `${item.quantity} ` : ''}
                    {item.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
