import {
  Award,
  Bell,
  BookOpenText,
  CakeSlice,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  ListChecks,
  Repeat,
  ShoppingCart,
  Sparkles,
  Timer,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { WorkspaceMode } from '@/types';

/** One card of a mode – the dock fans these out so a mode stays readable as it grows. */
export interface SectionMeta {
  id: string;
  label: string;
  Icon: LucideIcon;
}

/**
 * Modes that hold several cards get a section list; the single-purpose modes
 * (Skills, Bibel, Notizen) are one view already and stay without one.
 */
export const MODE_SECTIONS: Partial<Record<WorkspaceMode, SectionMeta[]>> = {
  all: [
    { id: 'timetable', label: 'Stundenplan', Icon: CalendarRange },
    { id: 'tasks', label: 'Aufgaben', Icon: ListChecks },
    { id: 'reminders', label: 'Erinnerungen', Icon: Bell },
    { id: 'upcoming', label: 'Demnächst', Icon: Sparkles },
    { id: 'verse', label: 'Tagesvers', Icon: BookOpenText },
    { id: 'wallet', label: 'Geld', Icon: Wallet },
    { id: 'calendar', label: 'Kalender', Icon: CalendarDays },
  ],
  study: [
    { id: 'tasks', label: 'Hausübungen', Icon: ClipboardList },
    { id: 'timetable', label: 'Stundenplan', Icon: CalendarRange },
    { id: 'grades', label: 'Noten', Icon: Award },
    { id: 'exams', label: 'Prüfungen', Icon: GraduationCap },
    { id: 'timer', label: 'Timer', Icon: Timer },
    { id: 'calendar', label: 'Kalender', Icon: CalendarDays },
  ],
  life: [
    { id: 'reminders', label: 'Erinnerungen', Icon: Bell },
    { id: 'shopping', label: 'Einkauf', Icon: ShoppingCart },
    { id: 'habits', label: 'Routinen', Icon: Repeat },
    { id: 'birthdays', label: 'Geburtstage', Icon: CakeSlice },
  ],
};

export const sectionsFor = (mode: WorkspaceMode): SectionMeta[] => MODE_SECTIONS[mode] ?? [];

export const sectionMeta = (mode: WorkspaceMode, id: string): SectionMeta | null =>
  sectionsFor(mode).find((s) => s.id === id) ?? null;
