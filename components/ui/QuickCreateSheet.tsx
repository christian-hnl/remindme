'use client';

import React from 'react';
import { Award, Bell, BookOpen, Cake, CreditCard, GraduationCap, Repeat, ShoppingCart, type LucideIcon } from 'lucide-react';
import { Modal } from './Modal';

export type QuickKind = 'task' | 'reminder' | 'exam' | 'grade' | 'shopping' | 'transaction' | 'habit' | 'birthday';

const OPTIONS: { kind: QuickKind; label: string; hint: string; Icon: LucideIcon }[] = [
  { kind: 'task', label: 'Aufgabe', hint: 'Hausübung, To-do', Icon: BookOpen },
  { kind: 'reminder', label: 'Erinnerung', hint: 'mit oder ohne Termin', Icon: Bell },
  { kind: 'exam', label: 'Prüfung', hint: 'Schularbeit, Test', Icon: GraduationCap },
  { kind: 'grade', label: 'Note', hint: 'für den Schnitt', Icon: Award },
  { kind: 'shopping', label: 'Einkauf', hint: 'auf die Liste', Icon: ShoppingCart },
  { kind: 'transaction', label: 'Buchung', hint: 'Ausgabe, Einnahme', Icon: CreditCard },
  { kind: 'habit', label: 'Routine', hint: 'täglich abhaken', Icon: Repeat },
  { kind: 'birthday', label: 'Geburtstag', hint: 'nie mehr vergessen', Icon: Cake },
];

interface QuickCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (kind: QuickKind) => void;
}

/** "What do you want to add?" – one place for every kind of entry. */
export function QuickCreateSheet({ isOpen, onClose, onSelect }: QuickCreateSheetProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Neu anlegen">
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(({ kind, label, hint, Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => {
              onClose();
              onSelect(kind);
            }}
            className="flex min-h-[80px] flex-col items-start justify-center gap-1 rounded-[12px] border border-line/10 bg-inset px-3.5 py-3 text-left transition-colors hover:border-accent/50 hover:bg-sheet"
          >
            <Icon className="h-5 w-5 text-accent" />
            <span className="text-[15px] font-bold text-ink">{label}</span>
            <span className="text-[12px] text-ink-3">{hint}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
