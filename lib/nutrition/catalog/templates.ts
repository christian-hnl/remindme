import type { PrepStrategy } from '../types';

/**
 * The four rotation weeks. Every day names both afternoon options – the pre-workout snack
 * for training days and a fat- and vegetable-heavy snack for rest days – so the plan follows
 * whatever training days are set, with the same daily total.
 *
 * Prep sessions: "sunday" is the Sunday before the week, "wednesday" the mini prep.
 * `start` and `duration` are minutes from the start of the session; `lane` is what the step
 * occupies, so the timeline shows what runs in parallel.
 */
export type MealRef = string | [recipe: string, sauce: string];

export interface DaySeed {
  breakfast: string;
  snack: string;
  lunch: MealRef;
  dinner: MealRef;
  training: string;
  rest: string;
}

export interface PrepStepSeed {
  id: string;
  session: 'sunday' | 'wednesday';
  title: string;
  detail?: string;
  start: number;
  duration: number;
  lane: 'Ofen' | 'Herd' | 'Herd 2' | 'Arbeitsfläche';
  /** Needs your hands the whole time (false = runs by itself). */
  active: boolean;
  /** Dishes the step is for – it disappears when none of them is cooked (e.g. "Einfach" days). */
  recipes?: string[];
}

export interface TemplateSeed {
  slug: string;
  number: number;
  name: string;
  theme: string;
  sauceBase: string;
  strategy: PrepStrategy;
  description: string;
  days: DaySeed[];
  prep: PrepStepSeed[];
}

export const TEMPLATES: TemplateSeed[] = [
  // ------------------------------------------------------------------ Woche 1
  {
    slug: 'rotation-1',
    number: 1,
    name: 'Griechisch',
    theme: 'Gyros, Ofenhuhn, Feta-Nudelsalat & Köfte',
    sauceBase: 'Skyr-Joghurt',
    strategy: 'midweek',
    description:
      'Sonntag: Gyros-Bowls und Ofen-Keulen für Mo–Mi, dazu Ei-Muffins und Riegel. Mittwoch 40 Minuten Mini-Prep für Feta-Nudelsalat und Köfte. Jeden Tag eine andere Sauce aus der Skyr-Basis: Tzatziki, scharfe Mayo, Tirokafteri. Samstag: Lamm vom Feinsten.',
    days: [
      { breakfast: 'overnight-oats-apfelstrudel', snack: 'thunfisch-mais-wrap', lunch: ['gyros-huehner-bowl', 'knoblauch-skyr-tzatziki'], dinner: ['paprika-huehnerkeulen-wedges', 'scharfe-paprika-skyr-mayo'], training: 'reiswaffeln-banane-honig', rest: 'skyr-apfel-erdnuss' },
      { breakfast: 'topfen-beeren-crunch', snack: 'gemuese-eier-muffins', lunch: ['gyros-huehner-bowl', 'scharfe-paprika-skyr-mayo'], dinner: ['paprika-huehnerkeulen-wedges', 'knoblauch-skyr-tzatziki'], training: 'bananen-hafer-riegel', rest: 'apfel-erdnussbutter-kaese' },
      { breakfast: 'bircher-muesli', snack: 'kraeuter-topfen-dip', lunch: ['gyros-huehner-bowl', 'tirokafteri-light'], dinner: ['paprika-huehnerkeulen-wedges', 'tirokafteri-light'], training: 'reiswaffeln-banane-honig', rest: 'hummus-gemuesesticks' },
      { breakfast: 'topfen-beeren-crunch', snack: 'gemuese-eier-muffins', lunch: 'griechischer-nudelsalat', dinner: ['puten-kofta-couscous', 'tirokafteri-light'], training: 'bananen-hafer-riegel', rest: 'low-carb-snackbox' },
      { breakfast: 'overnight-oats-apfelstrudel', snack: 'thunfisch-mais-wrap', lunch: 'griechischer-nudelsalat', dinner: ['puten-kofta-couscous', 'knoblauch-skyr-tzatziki'], training: 'beeren-skyr-honig', rest: 'skyr-apfel-erdnuss' },
      { breakfast: 'protein-pancakes', snack: 'apfel-erdnussbutter-kaese', lunch: 'huehner-duerum', dinner: 'lammlachse-zitronenkartoffeln', training: 'honig-topfen-brot', rest: 'hummus-gemuesesticks' },
      { breakfast: 'ruehrei-toast', snack: 'huehner-club-sandwich', lunch: 'cornflakes-schnitzel', dinner: 'shakshuka-kichererbsen', training: 'reiswaffeln-banane-honig', rest: 'skyr-apfel-erdnuss' },
    ],
    prep: [
      { id: 'w1-ofen', session: 'sunday', title: 'Ofen auf 220 °C, Wasser für Reis und Wedges aufsetzen', start: 0, duration: 5, lane: 'Arbeitsfläche', active: true },
      { id: 'w1-marinade', session: 'sunday', title: 'Huhn für Gyros schneiden und marinieren', detail: 'Gyros-Gewürz, Öl, Salz – 15 Minuten ziehen lassen', start: 5, duration: 10, lane: 'Arbeitsfläche', active: true, recipes: ['gyros-huehner-bowl'] },
      { id: 'w1-wedges', session: 'sunday', title: 'Kartoffeln in Spalten schneiden und 5 Minuten vorkochen', start: 5, duration: 15, lane: 'Herd', active: false, recipes: ['paprika-huehnerkeulen-wedges'] },
      { id: 'w1-reis', session: 'sunday', title: 'Reis kochen', detail: '12 Minuten zugedeckt, 5 Minuten ziehen lassen', start: 20, duration: 20, lane: 'Herd 2', active: false, recipes: ['gyros-huehner-bowl'] },
      { id: 'w1-keulen', session: 'sunday', title: 'Keulen würzen, mit Wedges aufs Blech – 35 Minuten', detail: 'Brokkoli die letzten 10 Minuten dazu', start: 20, duration: 40, lane: 'Ofen', active: false, recipes: ['paprika-huehnerkeulen-wedges'] },
      { id: 'w1-gyros', session: 'sunday', title: 'Gyros-Huhn in zwei Runden scharf anbraten', start: 25, duration: 15, lane: 'Herd', active: true, recipes: ['gyros-huehner-bowl'] },
      { id: 'w1-muffins-masse', session: 'sunday', title: 'Ei-Muffin-Masse rühren, Riegel-Teig mischen', start: 40, duration: 12, lane: 'Arbeitsfläche', active: true, recipes: ['gemuese-eier-muffins', 'bananen-hafer-riegel'] },
      { id: 'w1-saucen', session: 'sunday', title: 'Tzatziki, scharfe Skyr-Mayo und Tirokafteri anrühren', detail: 'Gurke salzen und ausdrücken', start: 52, duration: 12, lane: 'Arbeitsfläche', active: true, recipes: ['knoblauch-skyr-tzatziki', 'scharfe-paprika-skyr-mayo', 'tirokafteri-light'] },
      { id: 'w1-backen', session: 'sunday', title: 'Muffins (20 min) und Riegel (22 min) backen', start: 62, duration: 25, lane: 'Ofen', active: false, recipes: ['gemuese-eier-muffins', 'bananen-hafer-riegel'] },
      { id: 'w1-gemuese', session: 'sunday', title: 'Paprika, Gurke, Tomate, Zwiebel schneiden', start: 64, duration: 15, lane: 'Arbeitsfläche', active: true, recipes: ['gyros-huehner-bowl'] },
      { id: 'w1-boxen', session: 'sunday', title: 'Auskühlen lassen und Boxen füllen (Mo–Mi)', detail: 'Maximal 1 Stunde bei Raumtemperatur, dann in den Kühlschrank', start: 90, duration: 20, lane: 'Arbeitsfläche', active: true },
      { id: 'w1-riegel', session: 'sunday', title: 'Riegel schneiden – was über Donnerstag hinausgeht einfrieren', start: 110, duration: 8, lane: 'Arbeitsfläche', active: true, recipes: ['bananen-hafer-riegel'] },
      { id: 'w1-kueche', session: 'sunday', title: 'Aufräumen, Abwasch', start: 118, duration: 15, lane: 'Arbeitsfläche', active: true },
      { id: 'w1-mi-nudeln', session: 'wednesday', title: 'Nudeln kochen', start: 0, duration: 14, lane: 'Herd', active: false, recipes: ['griechischer-nudelsalat'] },
      { id: 'w1-mi-kofta', session: 'wednesday', title: 'Köfte formen und braten', start: 0, duration: 18, lane: 'Herd 2', active: true, recipes: ['puten-kofta-couscous'] },
      { id: 'w1-mi-couscous', session: 'wednesday', title: 'Couscous quellen lassen, Zucchini in der Köfte-Pfanne braten', start: 18, duration: 8, lane: 'Herd 2', active: true, recipes: ['puten-kofta-couscous'] },
      { id: 'w1-mi-salat', session: 'wednesday', title: 'Nudelsalat mischen, Tirokafteri und Tzatziki frisch anrühren', start: 14, duration: 15, lane: 'Arbeitsfläche', active: true, recipes: ['griechischer-nudelsalat', 'tirokafteri-light', 'knoblauch-skyr-tzatziki'] },
      { id: 'w1-mi-boxen', session: 'wednesday', title: 'Boxen für Do/Fr füllen', start: 29, duration: 10, lane: 'Arbeitsfläche', active: true },
    ],
  },

  // ------------------------------------------------------------------ Woche 2
  {
    slug: 'rotation-2',
    number: 2,
    name: 'Italien & Spanien',
    theme: 'Pesto-Nudelsalat, Albóndigas, Paella & Lasagne',
    sauceBase: 'Knoblauch & Kräuter',
    strategy: 'freeze',
    description:
      'Ein Sonntag, zwei Länder: Pesto-Nudelsalat und Albóndigas mit Patatas für Mo–Mi, Paella und Protein-Lasagne für Do/Fr direkt ins Tiefkühlfach. Pesto, Aioli und Romesco wechseln sich ab. Samstag: Garnelen-Pasta mit Burrata.',
    days: [
      { breakfast: 'schoko-bananen-porridge', snack: 'huehner-club-sandwich', lunch: ['pesto-haehnchen-nudelsalat', 'pesto-skyr'], dinner: ['albondigas-patatas', 'skyr-aioli'], training: 'zimt-milchreis', rest: 'low-carb-snackbox' },
      { breakfast: 'skyr-becher-to-go', snack: 'huehner-couscous-salat', lunch: ['pesto-haehnchen-nudelsalat', 'pesto-skyr'], dinner: ['albondigas-patatas', 'romesco-light'], training: 'reiswaffeln-banane-honig', rest: 'apfel-erdnussbutter-kaese' },
      { breakfast: 'schinken-kaese-wrap', snack: 'kraeuter-topfen-dip', lunch: ['pesto-haehnchen-nudelsalat', 'pesto-skyr'], dinner: ['albondigas-patatas', 'skyr-aioli'], training: 'zimt-milchreis', rest: 'hummus-gemuesesticks' },
      { breakfast: 'skyr-becher-to-go', snack: 'thunfisch-mais-wrap', lunch: ['haehnchen-paella', 'skyr-aioli'], dinner: 'protein-lasagne', training: 'zimt-milchreis', rest: 'skyr-apfel-erdnuss' },
      { breakfast: 'schoko-bananen-porridge', snack: 'kichererbsen-thunfisch-salat', lunch: ['haehnchen-paella', 'romesco-light'], dinner: 'protein-lasagne', training: 'reiswaffeln-banane-honig', rest: 'low-carb-snackbox' },
      { breakfast: 'protein-french-toast', snack: 'skyr-apfel-erdnuss', lunch: 'tortilla-pizza', dinner: 'garnelen-burrata-pasta', training: 'beeren-skyr-honig', rest: 'hummus-gemuesesticks' },
      { breakfast: 'huettenkaese-brot-ei', snack: 'kraeuter-topfen-dip', lunch: 'haehnchen-saltimbocca', dinner: 'tortilla-espanola', training: 'reiswaffeln-banane-honig', rest: 'skyr-apfel-erdnuss' },
    ],
    prep: [
      { id: 'w2-start', session: 'sunday', title: 'Ofen auf 220 °C, Wasser für Nudeln aufsetzen, Zwiebel, Knoblauch und Paprika für alles schneiden', start: 0, duration: 12, lane: 'Arbeitsfläche', active: true },
      { id: 'w2-ofen', session: 'sunday', title: 'Patatas und Romesco-Paprika aufs Blech – 30 Minuten', start: 10, duration: 30, lane: 'Ofen', active: false, recipes: ['albondigas-patatas', 'romesco-light'] },
      { id: 'w2-nudeln', session: 'sunday', title: 'Nudeln für den Nudelsalat kochen, kalt abspülen', start: 12, duration: 12, lane: 'Herd 2', active: false, recipes: ['pesto-haehnchen-nudelsalat'] },
      { id: 'w2-albondigas', session: 'sunday', title: 'Albóndigas-Masse kneten und Bällchen formen', start: 12, duration: 15, lane: 'Arbeitsfläche', active: true, recipes: ['albondigas-patatas'] },
      { id: 'w2-paella', session: 'sunday', title: 'Paella: Huhn anbraten, Gemüse und Gewürze, Reis und Brühe – 20 Minuten köcheln', start: 20, duration: 35, lane: 'Herd', active: false, recipes: ['haehnchen-paella'] },
      { id: 'w2-huhn', session: 'sunday', title: 'Zitronen-Huhn für den Nudelsalat braten', start: 24, duration: 12, lane: 'Herd 2', active: true, recipes: ['pesto-haehnchen-nudelsalat'] },
      { id: 'w2-sauce', session: 'sunday', title: 'Albóndigas anbraten und in der Paprika-Tomatensauce ziehen lassen', start: 36, duration: 22, lane: 'Herd 2', active: true, recipes: ['albondigas-patatas'] },
      { id: 'w2-saucen', session: 'sunday', title: 'Romesco pürieren, Pesto-Skyr und Aioli anrühren', start: 42, duration: 15, lane: 'Arbeitsfläche', active: true, recipes: ['romesco-light', 'pesto-skyr', 'skyr-aioli'] },
      { id: 'w2-salat', session: 'sunday', title: 'Nudelsalat mischen (Rucola erst vor dem Essen)', start: 57, duration: 8, lane: 'Arbeitsfläche', active: true, recipes: ['pesto-haehnchen-nudelsalat'] },
      { id: 'w2-ragu', session: 'sunday', title: 'Lasagne-Ragù mit Linsen und Spinat köcheln', start: 58, duration: 22, lane: 'Herd', active: false, recipes: ['protein-lasagne'] },
      { id: 'w2-schichten', session: 'sunday', title: 'Hüttenkäse-Creme pürieren, Lasagne schichten', start: 80, duration: 10, lane: 'Arbeitsfläche', active: true, recipes: ['protein-lasagne'] },
      { id: 'w2-lasagne', session: 'sunday', title: 'Lasagne backen – 30 Minuten', start: 90, duration: 30, lane: 'Ofen', active: false, recipes: ['protein-lasagne'] },
      { id: 'w2-boxen', session: 'sunday', title: 'Boxen füllen: Mo–Mi in den Kühlschrank, Do/Fr ins Tiefkühlfach', start: 90, duration: 15, lane: 'Arbeitsfläche', active: true },
      { id: 'w2-einfrieren', session: 'sunday', title: 'Lasagne kurz auskühlen lassen, portionieren und einfrieren', start: 120, duration: 12, lane: 'Arbeitsfläche', active: true, recipes: ['protein-lasagne'] },
      { id: 'w2-kueche', session: 'sunday', title: 'Aufräumen, Abwasch', start: 105, duration: 15, lane: 'Arbeitsfläche', active: true },
    ],
  },

  // ------------------------------------------------------------------ Woche 3
  {
    slug: 'rotation-3',
    number: 3,
    name: 'Mexikanisch',
    theme: 'Burrito-Bowl, Bolognese, Fajitas & Chili',
    sauceBase: 'Tomate',
    strategy: 'freeze',
    description:
      'Ein großer Sonntag mit zwei Töpfen: Bolognese und Burrito-Bowls für Mo–Mi, Chili und Fajita-Füllung für Do/Fr direkt einfrieren. Die Wraps werden erst am Vorabend gerollt.',
    days: [
      { breakfast: 'chia-skyr-pudding', snack: 'chicken-caesar-wrap', lunch: ['burrito-bowl', 'pico-salsa'], dinner: 'linsen-bolognese', training: 'honig-topfen-brot', rest: 'hummus-gemuesesticks' },
      { breakfast: 'topfen-beeren-crunch', snack: 'gemuese-eier-muffins', lunch: ['burrito-bowl', 'chili-zitronen-skyr'], dinner: 'linsen-bolognese', training: 'bananen-hafer-riegel', rest: 'skyr-apfel-erdnuss' },
      { breakfast: 'skyr-becher-to-go', snack: 'kraeuter-topfen-dip', lunch: ['burrito-bowl', 'smoky-bbq-sauce'], dinner: 'linsen-bolognese', training: 'honig-topfen-brot', rest: 'low-carb-snackbox' },
      { breakfast: 'topfen-beeren-crunch', snack: 'gemuese-eier-muffins', lunch: ['huehner-fajita-wraps', 'smoky-bbq-sauce'], dinner: ['puten-chili-con-carne', 'chili-zitronen-skyr'], training: 'bananen-hafer-riegel', rest: 'apfel-erdnussbutter-kaese' },
      { breakfast: 'chia-skyr-pudding', snack: 'kichererbsen-thunfisch-salat', lunch: ['huehner-fajita-wraps', 'pico-salsa'], dinner: ['puten-chili-con-carne', 'chili-zitronen-skyr'], training: 'reiswaffeln-banane-honig', rest: 'hummus-gemuesesticks' },
      { breakfast: 'fruehstuecks-burrito', snack: 'skyr-apfel-erdnuss', lunch: ['crispy-chicken-nuggets', 'smoky-bbq-sauce'], dinner: 'steak-rosmarin-kartoffeln', training: 'beeren-skyr-honig', rest: 'hummus-gemuesesticks' },
      { breakfast: 'protein-pancakes', snack: 'thunfisch-mais-wrap', lunch: 'big-mac-bowl', dinner: 'shakshuka-kichererbsen', training: 'reiswaffeln-banane-honig', rest: 'skyr-apfel-erdnuss' },
    ],
    prep: [
      { id: 'w3-start', session: 'sunday', title: 'Ofen auf 180 °C, Wasser für Reis aufsetzen, Zwiebeln und Paprika für alles würfeln', start: 0, duration: 15, lane: 'Arbeitsfläche', active: true },
      { id: 'w3-reis', session: 'sunday', title: 'Reis für Bowls und Chili kochen', start: 10, duration: 20, lane: 'Herd 2', active: false, recipes: ['burrito-bowl', 'puten-chili-con-carne'] },
      { id: 'w3-chili', session: 'sunday', title: 'Chili ansetzen und 20 Minuten köcheln', start: 15, duration: 35, lane: 'Herd', active: false, recipes: ['puten-chili-con-carne'] },
      { id: 'w3-muffins', session: 'sunday', title: 'Ei-Muffins und Riegel vorbereiten und backen', start: 15, duration: 35, lane: 'Ofen', active: false, recipes: ['gemuese-eier-muffins', 'bananen-hafer-riegel'] },
      { id: 'w3-teig', session: 'sunday', title: 'Muffin-Masse und Riegel-Teig rühren', start: 15, duration: 12, lane: 'Arbeitsfläche', active: true, recipes: ['gemuese-eier-muffins', 'bananen-hafer-riegel'] },
      { id: 'w3-bolo', session: 'sunday', title: 'One-Pot-Bolognese kochen', detail: 'Die Nudeln garen im selben Topf', start: 30, duration: 30, lane: 'Herd 2', active: false, recipes: ['linsen-bolognese'] },
      { id: 'w3-huhn', session: 'sunday', title: 'Hühnerbrust für Caesar-Wraps gar ziehen lassen', start: 27, duration: 15, lane: 'Arbeitsfläche', active: false },
      { id: 'w3-burrito', session: 'sunday', title: 'Burrito-Faschiertes braten', start: 50, duration: 12, lane: 'Herd', active: true, recipes: ['burrito-bowl'] },
      { id: 'w3-fajita', session: 'sunday', title: 'Fajita-Huhn und Gemüse scharf anbraten', start: 62, duration: 15, lane: 'Herd', active: true, recipes: ['huehner-fajita-wraps'] },
      { id: 'w3-saucen', session: 'sunday', title: 'Salsa, BBQ-Sauce und Chili-Skyr machen', start: 45, duration: 15, lane: 'Arbeitsfläche', active: true, recipes: ['pico-salsa', 'smoky-bbq-sauce', 'chili-zitronen-skyr'] },
      { id: 'w3-einfrieren', session: 'sunday', title: 'Chili + Reis und Fajita-Füllung für Do/Fr einfrieren', start: 80, duration: 15, lane: 'Arbeitsfläche', active: true, recipes: ['puten-chili-con-carne', 'huehner-fajita-wraps'] },
      { id: 'w3-boxen', session: 'sunday', title: 'Boxen für Mo–Mi füllen', start: 95, duration: 15, lane: 'Arbeitsfläche', active: true },
      { id: 'w3-kueche', session: 'sunday', title: 'Aufräumen, Abwasch', start: 110, duration: 20, lane: 'Arbeitsfläche', active: true },
    ],
  },

  // ------------------------------------------------------------------ Woche 4
  {
    slug: 'rotation-4',
    number: 4,
    name: 'Österreichisch',
    theme: 'Süßkartoffel-Bowl, Auflauf, Kartoffelsalat & Paprikahendl',
    sauceBase: 'Senf-Zitrone',
    strategy: 'midweek',
    description:
      'Sonntag: Süßkartoffel-Bowls und Nudelauflauf für Mo–Mi. Mittwoch in 45 Minuten Kartoffelsalat mit Zitronen-Huhn und Paprikahendl für Do/Fr – beides schmeckt frisch am besten.',
    days: [
      { breakfast: 'overnight-oats-apfelstrudel', snack: 'huehner-couscous-salat', lunch: ['suesskartoffel-huehner-bowl', 'honig-senf-dressing'], dinner: ['huehner-brokkoli-auflauf', 'kraeuter-knoblauch-dip'], training: 'reiswaffeln-banane-honig', rest: 'low-carb-snackbox' },
      { breakfast: 'huettenkaese-brot-ei', snack: 'kraeuter-topfen-dip', lunch: ['suesskartoffel-huehner-bowl', 'kraeuter-knoblauch-dip'], dinner: ['huehner-brokkoli-auflauf', 'zitronen-kraeuter-marinade'], training: 'beeren-skyr-honig', rest: 'skyr-apfel-erdnuss' },
      { breakfast: 'bircher-muesli', snack: 'huehner-couscous-salat', lunch: ['suesskartoffel-huehner-bowl', 'honig-senf-dressing'], dinner: ['huehner-brokkoli-auflauf', 'kraeuter-knoblauch-dip'], training: 'reiswaffeln-banane-honig', rest: 'hummus-gemuesesticks' },
      { breakfast: 'huettenkaese-brot-ei', snack: 'thunfisch-mais-wrap', lunch: ['zitronen-huhn-kartoffelsalat', 'zitronen-kraeuter-marinade'], dinner: 'paprikahendl-light', training: 'beeren-skyr-honig', rest: 'apfel-erdnussbutter-kaese' },
      { breakfast: 'overnight-oats-apfelstrudel', snack: 'kichererbsen-thunfisch-salat', lunch: ['zitronen-huhn-kartoffelsalat', 'kraeuter-knoblauch-dip'], dinner: 'paprikahendl-light', training: 'honig-topfen-brot', rest: 'low-carb-snackbox' },
      { breakfast: 'kaiserschmarrn-light', snack: 'apfel-erdnussbutter-kaese', lunch: 'rahm-geschnetzeltes', dinner: 'wiener-schnitzel-kalb', training: 'beeren-skyr-honig', rest: 'skyr-apfel-erdnuss' },
      { breakfast: 'ruehrei-toast', snack: 'kraeuter-topfen-dip', lunch: 'huehner-duerum', dinner: 'tortilla-pizza', training: 'reiswaffeln-banane-honig', rest: 'apfel-erdnussbutter-kaese' },
    ],
    prep: [
      { id: 'w4-ofen', session: 'sunday', title: 'Ofen auf 210 °C, Eier (9 min) und Nudelwasser aufsetzen', start: 0, duration: 5, lane: 'Arbeitsfläche', active: true },
      { id: 'w4-suesskartoffel', session: 'sunday', title: 'Süßkartoffel würfeln, mit Kichererbsen aufs Blech', start: 5, duration: 12, lane: 'Arbeitsfläche', active: true, recipes: ['suesskartoffel-huehner-bowl'] },
      { id: 'w4-eier', session: 'sunday', title: 'Eier für die Woche kochen und abschrecken', start: 5, duration: 12, lane: 'Herd 2', active: false },
      { id: 'w4-blech', session: 'sunday', title: 'Süßkartoffel-Blech rösten, Huhn die letzten 18 Minuten dazu', start: 17, duration: 30, lane: 'Ofen', active: false, recipes: ['suesskartoffel-huehner-bowl'] },
      { id: 'w4-nudeln', session: 'sunday', title: 'Nudeln + Brokkoli für den Auflauf kochen', start: 17, duration: 12, lane: 'Herd', active: false, recipes: ['huehner-brokkoli-auflauf'] },
      { id: 'w4-bechamel', session: 'sunday', title: 'Béchamel rühren, Huhn für Auflauf und Couscous anbraten', start: 29, duration: 15, lane: 'Herd', active: true, recipes: ['huehner-brokkoli-auflauf', 'huehner-couscous-salat'] },
      { id: 'w4-couscous', session: 'sunday', title: 'Couscous quellen lassen, Couscous-Salat schichten', start: 44, duration: 12, lane: 'Arbeitsfläche', active: true, recipes: ['huehner-couscous-salat'] },
      { id: 'w4-auflauf', session: 'sunday', title: 'Auflauf überbacken', start: 50, duration: 15, lane: 'Ofen', active: false, recipes: ['huehner-brokkoli-auflauf'] },
      { id: 'w4-saucen', session: 'sunday', title: 'Honig-Senf-Dressing und Kräuter-Dip anrühren', start: 56, duration: 10, lane: 'Arbeitsfläche', active: true, recipes: ['honig-senf-dressing', 'kraeuter-knoblauch-dip'] },
      { id: 'w4-boxen', session: 'sunday', title: 'Boxen Mo–Mi füllen, Salat extra', start: 70, duration: 15, lane: 'Arbeitsfläche', active: true },
      { id: 'w4-kueche', session: 'sunday', title: 'Aufräumen, Abwasch', start: 85, duration: 15, lane: 'Arbeitsfläche', active: true },
      { id: 'w4-mi-kartoffeln', session: 'wednesday', title: 'Kartoffeln kochen (20 min)', start: 0, duration: 22, lane: 'Herd', active: false, recipes: ['zitronen-huhn-kartoffelsalat'] },
      { id: 'w4-mi-hendl', session: 'wednesday', title: 'Paprikahendl: Zwiebel rösten, Sauce ansetzen, Huhn köcheln', start: 0, duration: 25, lane: 'Herd 2', active: true, recipes: ['paprikahendl-light'] },
      { id: 'w4-mi-reis', session: 'wednesday', title: 'Reis nach dem Kartoffelwasser im selben Topf kochen', start: 22, duration: 17, lane: 'Herd', active: false, recipes: ['paprikahendl-light'] },
      { id: 'w4-mi-marinade', session: 'wednesday', title: 'Zitronen-Marinade, Huhn braten, Kartoffelsalat marinieren', start: 25, duration: 12, lane: 'Herd 2', active: true, recipes: ['zitronen-huhn-kartoffelsalat', 'zitronen-kraeuter-marinade'] },
      { id: 'w4-mi-boxen', session: 'wednesday', title: 'Boxen für Do/Fr füllen', start: 37, duration: 8, lane: 'Arbeitsfläche', active: true },
    ],
  },
];
