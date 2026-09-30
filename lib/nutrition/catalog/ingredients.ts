import type { Department, IngredientData } from '../types';

/**
 * Nutrition per 100 g (raw/dry unless noted) and Hofer/Lidl prices as estimated for Austria
 * in 2026. Prices are per kg so a recipe's cost follows from its grams; the pack decides how
 * much ends up on the shopping list.
 */
type Row = [
  slug: string,
  name: string,
  department: Department,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  pricePerKg: number,
  packGrams: number,
  packLabel: string,
  extra?: { piece?: [number, string]; pantry?: boolean },
];

const ROWS: Row[] = [
  // ---------------------------------------------------------------- Fleisch & Fisch
  ['huehnerbrust', 'Hühnerbrustfilet (Großpackung/TK)', 'Fleisch & Fisch', 110, 23.5, 0, 1.5, 9.49, 500, '500 g'],
  ['huehnerkeule', 'Hühneroberkeule ohne Knochen', 'Fleisch & Fisch', 150, 18.5, 0, 8.5, 10.9, 600, '600 g'],
  ['putenfaschiertes', 'Putenfaschiertes', 'Fleisch & Fisch', 140, 20, 0, 6.8, 10.98, 500, '500 g'],
  ['rinderfaschiertes', 'Rinderfaschiertes (mager)', 'Fleisch & Fisch', 172, 20.5, 0, 10, 11.98, 500, '500 g'],
  ['thunfisch', 'Thunfisch im eigenen Saft (abgetropft)', 'Konserven', 110, 25.5, 0, 1, 9.93, 150, 'Dose 185 g'],
  ['putenschinken', 'Putenbrust-Aufschnitt', 'Kühlregal', 105, 20, 1, 2, 11.93, 150, '150 g'],
  ['speck', 'Frühstücksspeck', 'Fleisch & Fisch', 400, 14, 1, 38, 14.9, 100, '100 g'],
  // Gönn-Essen: einmal pro Woche darf es teurer sein
  ['rinderhueftsteak', 'Rinderhüftsteak', 'Fleisch & Fisch', 120, 22, 0, 3.5, 29.9, 300, '2 Stk'],
  ['kalbsschnitzel', 'Kalbsschnitzel', 'Fleisch & Fisch', 110, 21, 0, 2.5, 37.9, 300, '2 Stk'],
  ['lammlachse', 'Lammlachse', 'Tiefkühl', 130, 21, 0, 5, 34.9, 300, '300 g'],
  ['lachs', 'Lachsfilet', 'Tiefkühl', 200, 20, 0, 13, 21.96, 250, '2 × 125 g'],
  ['garnelen', 'Garnelen, roh', 'Tiefkühl', 70, 16, 0, 0.8, 23.96, 250, '250 g'],

  // ---------------------------------------------------------------- Kühlregal
  ['eier', 'Eier (M)', 'Kühlregal', 145, 12.5, 0.7, 10, 5.32, 600, '10 Stk', { piece: [60, 'Stk'] }],
  ['magertopfen', 'Magertopfen', 'Kühlregal', 70, 12, 4, 0.2, 3.96, 250, '250 g'],
  ['skyr', 'Skyr natur', 'Kühlregal', 63, 11, 4, 0.2, 3.53, 450, '450 g'],
  ['huettenkaese', 'Hüttenkäse', 'Kühlregal', 98, 12, 2.6, 4.3, 4.95, 200, '200 g'],
  ['milch', 'Milch 1,5 %', 'Kühlregal', 47, 3.4, 4.9, 1.5, 1.25, 1000, '1 l'],
  ['mozzarella-light', 'Mozzarella light', 'Kühlregal', 160, 18, 1, 9, 8.72, 125, '125 g'],
  ['kaese-light', 'Gouda light (Scheiben)', 'Kühlregal', 270, 30, 0, 16.5, 9.93, 150, '150 g'],
  ['hirtenkaese', 'Hirtenkäse', 'Kühlregal', 260, 17, 1, 21, 7.95, 200, '200 g'],
  ['burrata', 'Burrata', 'Kühlregal', 230, 14, 1, 19, 19.92, 125, '125 g'],
  ['parmesan', 'Parmesan (gerieben)', 'Kühlregal', 390, 36, 0, 28, 24.9, 100, '100 g'],
  ['cheddar', 'Cheddar (Scheiben)', 'Kühlregal', 400, 25, 0.5, 33, 11.93, 150, '150 g'],
  ['butter', 'Butter', 'Kühlregal', 740, 0.7, 0.6, 82, 11.16, 250, '250 g'],
  ['kokosmilch-light', 'Kokosmilch light', 'Konserven', 72, 0.7, 2, 7, 3.73, 400, 'Dose 400 ml'],

  // ---------------------------------------------------------------- Brot & Gebäck
  ['vollkornbrot', 'Vollkornbrot (geschnitten)', 'Brot & Gebäck', 225, 7.5, 39, 3, 2.98, 500, '500 g', { piece: [50, 'Scheibe'] }],
  ['wraps', 'Vollkorn-Wraps', 'Brot & Gebäck', 300, 9.5, 45, 7.5, 4.3, 370, '6 Stk', { piece: [62, 'Stk'] }],
  ['burgerbroetchen', 'Vollkorn-Burgerbrötchen', 'Brot & Gebäck', 255, 9, 44, 4.5, 5.97, 300, '4 Stk', { piece: [75, 'Stk'] }],
  ['brioche', 'Brioche-Burgerbrötchen', 'Brot & Gebäck', 300, 9, 50, 7, 5.49, 300, '4 Stk', { piece: [75, 'Stk'] }],
  ['reiswaffeln', 'Reiswaffeln', 'Brot & Gebäck', 385, 8, 80, 3, 9.9, 100, '100 g', { piece: [7.5, 'Stk'] }],

  // ---------------------------------------------------------------- Nudeln, Reis & Getreide
  ['haferflocken', 'Haferflocken', 'Nudeln, Reis & Getreide', 370, 13.5, 59, 7, 1.78, 500, '500 g'],
  ['reis', 'Basmatireis', 'Nudeln, Reis & Getreide', 350, 8, 77, 0.8, 2.79, 1000, '1 kg'],
  ['sushireis', 'Sushireis', 'Nudeln, Reis & Getreide', 350, 7, 78, 0.6, 3.98, 500, '500 g'],
  ['vollkornnudeln', 'Vollkornnudeln / -spaghetti', 'Nudeln, Reis & Getreide', 350, 13, 64, 2.5, 2.38, 500, '500 g'],
  ['couscous', 'Couscous', 'Nudeln, Reis & Getreide', 355, 12.5, 70, 2, 2.98, 500, '500 g'],
  ['lasagneblaetter', 'Lasagneblätter', 'Nudeln, Reis & Getreide', 350, 12, 70, 1.5, 2.58, 500, '500 g'],
  ['rote-linsen', 'Rote Linsen', 'Nudeln, Reis & Getreide', 340, 24, 50, 1.5, 3.38, 500, '500 g'],
  ['milchreis', 'Milchreis', 'Nudeln, Reis & Getreide', 350, 7, 78, 0.6, 2.58, 500, '500 g'],
  ['cornflakes', 'Cornflakes (ungezuckert)', 'Nudeln, Reis & Getreide', 365, 7, 84, 0.9, 3.58, 500, '500 g'],

  // ---------------------------------------------------------------- Konserven
  ['kichererbsen', 'Kichererbsen (abgetropft)', 'Konserven', 120, 7, 15, 2.5, 3.71, 240, 'Dose 400 g'],
  ['kidneybohnen', 'Kidneybohnen (abgetropft)', 'Konserven', 100, 7, 13, 0.5, 3.16, 250, 'Dose 400 g'],
  ['mais', 'Mais (abgetropft)', 'Konserven', 85, 3, 15, 1.2, 3.47, 285, 'Dose 340 g'],
  ['passata', 'Passierte Tomaten', 'Konserven', 30, 1.3, 5, 0.2, 1.38, 500, '500 g'],
  ['tomaten-stueckig', 'Tomaten stückig', 'Konserven', 22, 1.2, 3.5, 0.2, 1.73, 400, 'Dose 400 g'],
  ['apfelmus', 'Apfelmus (ungezuckert)', 'Konserven', 50, 0.3, 11, 0.1, 2.49, 720, 'Glas 720 g'],
  ['preiselbeeren', 'Preiselbeeren (Kompott)', 'Konserven', 170, 0.3, 41, 0.3, 6.23, 400, 'Glas 400 g'],

  // ---------------------------------------------------------------- Obst & Gemüse
  ['banane', 'Bananen', 'Obst & Gemüse', 95, 1.1, 21, 0.2, 1.69, 1000, 'ca. 1 kg', { piece: [120, 'Stk'] }],
  ['apfel', 'Äpfel', 'Obst & Gemüse', 55, 0.3, 12, 0.2, 2.49, 1000, '1 kg', { piece: [150, 'Stk'] }],
  ['zitrone', 'Zitronen', 'Obst & Gemüse', 29, 1.1, 3.2, 0.3, 3.9, 500, '500 g', { piece: [100, 'Stk'] }],
  ['paprika', 'Paprika', 'Obst & Gemüse', 30, 1, 5, 0.3, 4.58, 500, '3 Stk', { piece: [160, 'Stk'] }],
  ['zwiebel', 'Zwiebeln', 'Obst & Gemüse', 40, 1.2, 8, 0.1, 1.19, 1000, '1 kg', { piece: [80, 'Stk'] }],
  ['karotten', 'Karotten', 'Obst & Gemüse', 36, 0.8, 7, 0.2, 1.19, 1000, '1 kg'],
  ['gurke', 'Gurke', 'Obst & Gemüse', 13, 0.6, 2, 0.1, 1.98, 400, '1 Stk', { piece: [400, 'Stk'] }],
  ['tomaten', 'Tomaten', 'Obst & Gemüse', 18, 1, 3, 0.2, 3.98, 500, '500 g', { piece: [100, 'Stk'] }],
  ['eisberg', 'Eisbergsalat', 'Obst & Gemüse', 13, 0.9, 2, 0.1, 2.38, 500, '1 Kopf'],
  ['zucchini', 'Zucchini', 'Obst & Gemüse', 20, 1.5, 2.5, 0.3, 2.99, 500, '2 Stk', { piece: [250, 'Stk'] }],
  ['champignons', 'Champignons', 'Obst & Gemüse', 22, 3, 0.5, 0.3, 4.98, 400, '400 g'],
  ['avocado', 'Avocado', 'Obst & Gemüse', 160, 2, 2, 15, 7.93, 150, '1 Stk', { piece: [150, 'Stk'] }],
  ['krautsalat', 'Weißkraut, fein geschnitten', 'Obst & Gemüse', 25, 1.3, 4, 0.2, 5.16, 250, '250 g'],
  ['rucola', 'Rucola', 'Obst & Gemüse', 25, 2.6, 2, 0.7, 10.32, 125, '125 g'],
  ['basilikum', 'Basilikum', 'Obst & Gemüse', 23, 3, 1, 0.6, 59.6, 25, '1 Topf'],
  ['suesskartoffel', 'Süßkartoffeln', 'Obst & Gemüse', 86, 1.6, 20, 0.1, 2.99, 1000, '1 kg'],
  ['kartoffeln', 'Kartoffeln (festkochend)', 'Obst & Gemüse', 75, 2, 16, 0.1, 1.25, 2000, '2 kg'],
  ['fruehlingszwiebel', 'Frühlingszwiebeln', 'Obst & Gemüse', 30, 1.8, 4.5, 0.3, 8.9, 100, '1 Bund'],
  ['knoblauch', 'Knoblauch', 'Vorrat & Gewürze', 140, 6, 28, 0.5, 5.96, 250, '250 g', { piece: [5, 'Zehe'], pantry: true }],
  ['ingwer', 'Ingwer', 'Vorrat & Gewürze', 80, 1.8, 16, 0.8, 5.9, 150, '1 Knolle', { pantry: true }],

  // ---------------------------------------------------------------- Tiefkühl
  ['tk-beeren', 'TK-Beerenmischung', 'Tiefkühl', 45, 1, 8, 0.3, 4.65, 750, '750 g'],
  ['tk-brokkoli', 'TK-Brokkoli', 'Tiefkühl', 30, 3, 3, 0.4, 3.05, 750, '750 g'],
  ['tk-wokgemuese', 'TK-Wokgemüse', 'Tiefkühl', 35, 2, 5, 0.3, 3.05, 750, '750 g'],
  ['tk-spinat', 'TK-Blattspinat', 'Tiefkühl', 23, 2.5, 1.2, 0.4, 2.87, 450, '450 g'],
  ['tk-erbsen', 'TK-Erbsen', 'Tiefkühl', 80, 5.5, 11, 0.5, 2.65, 750, '750 g'],
  ['tk-edamame', 'TK-Edamame (geschält)', 'Tiefkühl', 122, 11, 9, 5, 6.23, 400, '400 g'],
  ['tk-kraeuter', 'TK-Kräuter', 'Tiefkühl', 40, 3, 5, 0.5, 19.8, 50, '50 g', { pantry: true }],

  // ---------------------------------------------------------------- Vorrat & Gewürze
  ['erdnuesse', 'Erdnüsse (geröstet, ungesalzen)', 'Vorrat & Gewürze', 590, 25, 10, 49, 6.45, 200, '200 g'],
  ['mandeln', 'Mandeln', 'Vorrat & Gewürze', 600, 21, 6, 53, 12.45, 200, '200 g'],
  ['kuerbiskerne', 'Kürbiskerne (steirisch)', 'Vorrat & Gewürze', 560, 30, 5, 46, 14.95, 200, '200 g'],
  ['erdnussbutter','Erdnussbutter', 'Vorrat & Gewürze', 600, 25, 12, 50, 6.54, 350, '350 g', { pantry: true }],
  ['honig', 'Honig', 'Vorrat & Gewürze', 305, 0.4, 82, 0, 8.98, 500, '500 g', { pantry: true }],
  ['chiasamen', 'Chiasamen', 'Vorrat & Gewürze', 490, 17, 8, 31, 11.45, 200, '200 g', { pantry: true }],
  ['kakao', 'Backkakao', 'Vorrat & Gewürze', 360, 20, 11, 21, 9.96, 250, '250 g', { pantry: true }],
  ['sesam', 'Sesam', 'Vorrat & Gewürze', 580, 18, 12, 50, 5.96, 250, '250 g', { pantry: true }],
  ['olivenoel', 'Olivenöl', 'Vorrat & Gewürze', 884, 0, 0, 100, 10.13, 690, '0,75 l', { pantry: true }],
  ['rapsoel', 'Rapsöl', 'Vorrat & Gewürze', 884, 0, 0, 100, 2.71, 920, '1 l', { pantry: true }],
  ['sojasauce', 'Sojasauce', 'Vorrat & Gewürze', 60, 8, 6, 0, 4.2, 500, '500 ml', { pantry: true }],
  ['sriracha', 'Sriracha', 'Vorrat & Gewürze', 100, 1.5, 20, 1, 6.9, 435, '435 ml', { pantry: true }],
  ['senf', 'Senf (mittelscharf)', 'Vorrat & Gewürze', 90, 6, 5, 5, 2.95, 200, '200 g', { pantry: true }],
  ['mayonnaise', 'Mayonnaise', 'Vorrat & Gewürze', 680, 1, 1, 75, 3.1, 500, '500 ml', { pantry: true }],
  ['tomatenmark', 'Tomatenmark', 'Vorrat & Gewürze', 80, 4, 13, 0.5, 4.45, 200, '200 g', { pantry: true }],
  ['bbq-sauce', 'BBQ-Sauce', 'Vorrat & Gewürze', 150, 1, 35, 0.3, 2.98, 500, '500 ml', { pantry: true }],
  ['balsamico', 'Balsamico', 'Vorrat & Gewürze', 90, 0.5, 17, 0, 3.2, 500, '500 ml', { pantry: true }],
  ['essig', 'Apfelessig', 'Vorrat & Gewürze', 20, 0, 1, 0, 1.2, 1000, '1 l', { pantry: true }],
  ['maisstaerke', 'Maisstärke', 'Vorrat & Gewürze', 350, 0.3, 86, 0.1, 3.2, 400, '400 g', { pantry: true }],
  ['semmelbroesel', 'Semmelbrösel', 'Vorrat & Gewürze', 360, 11, 72, 2, 2.48, 400, '400 g', { pantry: true }],
  ['mehl', 'Mehl (glatt)', 'Vorrat & Gewürze', 345, 10, 72, 1, 0.79, 1000, '1 kg', { pantry: true }],
  ['gemuesebruehe', 'Gemüsebrühe (Pulver)', 'Vorrat & Gewürze', 200, 8, 30, 5, 6.5, 200, '200 g', { pantry: true }],
  ['paprikapulver', 'Paprikapulver (edelsüß/geräuchert)', 'Vorrat & Gewürze', 290, 14, 19, 13, 19.8, 50, '50 g', { pantry: true }],
  ['currypulver', 'Currypulver', 'Vorrat & Gewürze', 325, 14, 25, 14, 19.8, 50, '50 g', { pantry: true }],
  ['kreuzkuemmel', 'Kreuzkümmel', 'Vorrat & Gewürze', 375, 18, 34, 22, 19.8, 50, '50 g', { pantry: true }],
  ['oregano', 'Oregano', 'Vorrat & Gewürze', 265, 9, 26, 4, 24, 20, '20 g', { pantry: true }],
  ['chiliflocken', 'Chiliflocken', 'Vorrat & Gewürze', 320, 12, 30, 17, 24, 40, '40 g', { pantry: true }],
  ['zimt', 'Zimt', 'Vorrat & Gewürze', 250, 4, 27, 1.2, 19.8, 50, '50 g', { pantry: true }],
  ['kurkuma', 'Kurkuma', 'Vorrat & Gewürze', 350, 8, 65, 3, 19.8, 50, '50 g', { pantry: true }],
  ['gyrosgewuerz', 'Gyros-Gewürz', 'Vorrat & Gewürze', 280, 10, 30, 8, 19.8, 50, '50 g', { pantry: true }],
  ['salz-pfeffer', 'Salz & Pfeffer', 'Vorrat & Gewürze', 0, 0, 0, 0, 1.5, 500, '500 g', { pantry: true }],
];

export const INGREDIENTS: IngredientData[] = ROWS.map(
  ([slug, name, department, kcal, protein, carbs, fat, pricePerKg, packGrams, packLabel, extra]) => ({
    slug,
    name,
    department,
    kcal,
    protein,
    carbs,
    fat,
    pricePerKg,
    packGrams,
    packLabel,
    pieceGrams: extra?.piece?.[0] ?? null,
    pieceLabel: extra?.piece?.[1] ?? null,
    pantry: extra?.pantry ?? false,
  })
);
