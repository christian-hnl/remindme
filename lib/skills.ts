import type { SkillResourceKind, SkillStatus } from '@/types';

export const SKILL_STATUSES: SkillStatus[] = ['idea', 'active', 'paused', 'done'];
export const SKILL_STATUS_LABELS: Record<SkillStatus, string> = {
  idea: 'Wunschliste',
  active: 'Lerne ich gerade',
  paused: 'Pausiert',
  done: 'Geschafft',
};

export const SKILL_CATEGORIES = ['Sprache', 'Musik', 'Technik', 'Sport', 'Kreativ', 'Alltag', 'Wissen', 'Geld', 'Sonstiges'];

export const RESOURCE_KINDS: SkillResourceKind[] = ['video', 'course', 'book', 'app', 'article', 'other'];
export const RESOURCE_KIND_LABELS: Record<SkillResourceKind, string> = {
  video: 'Video',
  course: 'Kurs',
  book: 'Buch',
  app: 'App',
  article: 'Artikel',
  other: 'Sonstiges',
};

export const WEEKLY_GOALS = [0, 30, 60, 90, 120, 180, 300];

const GUESSES: [RegExp, string, string][] = [
  [/gitarre|guitar|bass|ukulele/i, '🎸', 'Musik'],
  [/klavier|piano|keyboard/i, '🎹', 'Musik'],
  [/singen|gesang|schlagzeug|drums|musik|dj|produzier|beat/i, '🎵', 'Musik'],
  [/englisch|spanisch|französisch|italienisch|japanisch|chinesisch|koreanisch|russisch|türkisch|sprache|vokabel|gebärden/i, '🗣️', 'Sprache'],
  [/programm|coden|code|python|javascript|react|java|c\+\+|web|app entwick|linux|excel|machine learning|hacking|netzwerk|elektronik|arduino|raspberry|löten/i, '💻', 'Technik'],
  [/koch|backen|rezept|gerichte/i, '🍳', 'Alltag'],
  [/führerschein|autofahren|moped|motorrad/i, '🚗', 'Alltag'],
  [/erste hilfe|nähen|stricken|heimwerk|reparier|garten|pflanzen|haushalt|10.?finger|tippen|bügeln/i, '🛠️', 'Alltag'],
  [/schwimm|laufen|joggen|klettern|boxen|kampfsport|yoga|fitness|kraft|skate|surf|ski|snowboard|tennis|fußball|basketball|volleyball|tanz/i, '🏃', 'Sport'],
  [/zeichnen|malen|design|photoshop|illustr|3d|blender|video|schneiden|filmen/i, '🎨', 'Kreativ'],
  [/foto|kamera/i, '📷', 'Kreativ'],
  [/schreiben|gedicht|blog/i, '✍️', 'Kreativ'],
  [/schach|chess|zauber|rubik|jonglier/i, '♟️', 'Wissen'],
  [/investier|aktien|etf|börse|finanz|steuer|budget|geld/i, '📈', 'Geld'],
  [/geschichte|psycholog|philosoph|astronom|physik|chemie|biologie|wirtschaft|politik|rhetorik|präsentier|reden|lesen|gedächtnis/i, '🧠', 'Wissen'],
];

/** Suggests an emoji and a category from the title ("Gitarre lernen" → 🎸 Musik). */
export function guessSkillMeta(title: string) {
  const hit = GUESSES.find(([rule]) => rule.test(title));
  return hit ? { emoji: hit[1], category: hit[2] } : { emoji: '🎯', category: 'Sonstiges' };
}

export const SKILL_IDEAS = [
  'Gitarre spielen',
  'Programmieren mit Python',
  'Spanisch',
  'Kochen: 10 Gerichte',
  '10-Finger-Schreiben',
  'Erste Hilfe',
  'Investieren & ETFs',
  'Schach',
  'Zeichnen',
  'Führerschein-Theorie',
  'Präsentieren & Rhetorik',
  'Zauberwürfel lösen',
];

export function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};
