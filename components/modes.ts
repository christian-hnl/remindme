import { BookOpenText, GraduationCap, House, ListChecks, NotebookPen, Rocket, Salad, Wallet, type LucideIcon } from 'lucide-react';
import type { WorkspaceMode } from '@/types';

export interface ModeMeta {
  label: string;
  /** For the phone dock, where a long label would crowd its neighbours. */
  shortLabel?: string;
  description: string;
  Icon: LucideIcon;
  /** Keyboard shortcut, matches the order of the navigation. */
  shortcut: string;
}

export const MODE_ORDER: WorkspaceMode[] = ['all', 'study', 'life', 'nutrition', 'wealth', 'skills', 'bible', 'notes'];

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
  nutrition: {
    label: 'Ernährung',
    shortLabel: 'Essen',
    description: 'Meal Prep, Wochenplan, Rezepte, Einkauf und dein Proteinziel',
    Icon: Salad,
    shortcut: '4',
  },
  wealth: {
    label: 'Geld',
    description: 'Tagesbudget, Analyse, Prognose, Abos und Buchungen',
    Icon: Wallet,
    shortcut: '5',
  },
  skills: {
    label: 'Skills',
    description: 'Was du lernen willst – Schritte, Material und Lernzeit',
    Icon: Rocket,
    shortcut: '6',
  },
  bible: {
    label: 'Bibel',
    description: 'Tagesvers, lesen und Verse zum Merken',
    Icon: BookOpenText,
    shortcut: '7',
  },
  notes: {
    label: 'Notizen',
    description: 'Gedanken, Mitschriften und Ideen – speichert automatisch',
    Icon: NotebookPen,
    shortcut: '8',
  },
};
