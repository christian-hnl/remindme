/** Display data for booking categories – shared by server and client. */
export interface CategoryMeta {
  emoji: string;
  color: string;
  /** Food categories are summed up for the "Essen" analysis. */
  food?: boolean;
}

export const EXPENSE_CATEGORIES = [
  'Lebensmittel',
  'Essen gehen',
  'Freizeit',
  'Transport',
  'Shopping',
  'Kleidung',
  'Drogerie',
  'Schule',
  'Gesundheit',
  'Geschenke',
  'Fixkosten',
  'Sonstiges',
] as const;

export const INCOME_CATEGORIES = ['Taschengeld', 'Nebenjob', 'Einkommen', 'Geschenk', 'Verkauf', 'Kapitalerträge', 'Sonstiges'] as const;

const META: Record<string, CategoryMeta> = {
  Lebensmittel: { emoji: '🛒', color: '#16A34A', food: true },
  'Essen gehen': { emoji: '🍔', color: '#F59E0B', food: true },
  // Older bookings used one combined food category.
  Essen: { emoji: '🍽️', color: '#84CC16', food: true },
  Freizeit: { emoji: '🎮', color: '#EC4899' },
  Transport: { emoji: '🚆', color: '#0EA5E9' },
  Shopping: { emoji: '🛍️', color: '#A855F7' },
  Kleidung: { emoji: '👕', color: '#D946EF' },
  Drogerie: { emoji: '🧴', color: '#14B8A6' },
  Schule: { emoji: '📚', color: '#3B82F6' },
  Gesundheit: { emoji: '💊', color: '#EF4444' },
  Geschenke: { emoji: '🎁', color: '#F97316' },
  Fixkosten: { emoji: '🔁', color: '#6366F1' },
  Taschengeld: { emoji: '💶', color: '#22C55E' },
  Nebenjob: { emoji: '💼', color: '#10B981' },
  Einkommen: { emoji: '🏦', color: '#059669' },
  Geschenk: { emoji: '🎁', color: '#F97316' },
  Verkauf: { emoji: '🏷️', color: '#06B6D4' },
  Kapitalerträge: { emoji: '📈', color: '#8B5CF6' },
  Umbuchung: { emoji: '↔️', color: '#94A3B8' },
  'Sparen & Anlegen': { emoji: '📈', color: '#8B5CF6' },
  Sparen: { emoji: '🐷', color: '#8B5CF6' },
  Sonstiges: { emoji: '📦', color: '#94A3B8' },
};

export const categoryMeta = (category: string): CategoryMeta => META[category] ?? META.Sonstiges;
