import { GraduationCap, House, ListChecks, NotebookPen, Wallet, type LucideIcon } from 'lucide-react';
import type { WorkspaceMode } from '@/types';

export interface ModeMeta {
  label: string;
  description: string;
  Icon: LucideIcon;
  /** Keyboard shortcut, matches the order of the navigation. */
  shortcut: string;
}

export const MODE_ORDER: WorkspaceMode[] = ['all', 'study', 'life', 'wealth', 'notes'];

export const MODE_META: Record<WorkspaceMode, ModeMeta> = {
  all: {
    label: 'Heute',
    description: 'Stundenplan, Hausübungen, Termine und Geld auf einen Blick',
    Icon: House,
    shortcut: '1',
  },
  study: {
    label: 'Schule',
    description: 'Hausübungen, Prüfungen, Noten, Stundenplan und Lern-Timer',
    Icon: GraduationCap,
    shortcut: '2',
  },
  life: {
    label: 'Alltag',
    description: 'Erinnerungen, Einkaufsliste, Routinen und Geburtstage',
    Icon: ListChecks,
    shortcut: '3',
  },
  wealth: {
    label: 'Geld',
    description: 'Tagesbudget, Konten, Spartöpfe und Buchungen',
    Icon: Wallet,
    shortcut: '4',
  },
  notes: {
    label: 'Notizen',
    description: 'Gedanken, Mitschriften und Ideen – speichert automatisch',
    Icon: NotebookPen,
    shortcut: '5',
  },
};
