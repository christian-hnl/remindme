import React from 'react';
import { formatEuro } from '@/lib/format';
import { formatGrams } from '@/lib/nutrition/plan';
import { STORAGE_TIPS, targetReasons } from '@/lib/nutrition/profile';
import { EQUIPMENT, MEAL_TYPE_LABELS, STORES, STRATEGY_LABELS, TRAINING_LABELS, type IngredientData, type NutritionSettingsData } from '@/lib/nutrition/types';
import { WEEKDAY_LONG } from '@/lib/nutrition/dates';
import type { RecipeView, WeekView } from '@/lib/nutrition/views';

interface PrintPlanProps {
  week: WeekView;
  recipes: RecipeView[];
  ingredients: IngredientData[];
  settings: NutritionSettingsData;
  weightKg: number;
  displayName: string;
  scheduleSynced: string | null;
}

const n0 = (n: number) => Math.round(n).toLocaleString('de-DE');

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 border-b-2 border-ink pb-1 font-display text-[24px] font-bold text-ink print:mt-6">{children}</h2>;
}

/** The whole week on paper: targets, plan, shopping list, prep, recipes, storage tips, assumptions. */
export function PrintPlan({ week, recipes, ingredients, settings, weightKg, displayName, scheduleSynced }: PrintPlanProps) {
  const ing = new Map(ingredients.map((i) => [i.slug, i]));
  const byId = new Map(recipes.map((r) => [r.id, r]));

  // Every dish of the week (and its sauces) with how many portions the week needs.
  const portions = new Map<string, number>();
  for (const d of week.days) {
    for (const m of d.meals) {
      portions.set(m.recipeId, (portions.get(m.recipeId) ?? 0) + m.servings);
      if (m.sauceId) portions.set(m.sauceId, (portions.get(m.sauceId) ?? 0) + 1);
    }
  }
  const order = ['main', 'breakfast', 'snack', 'preworkout', 'sauce'];
  const weekRecipes = [...portions.keys()]
    .map((id) => byId.get(id))
    .filter((r): r is RecipeView => !!r)
    .sort((a, b) => order.indexOf(a.mealType) - order.indexOf(b.mealType) || a.name.localeCompare(b.name, 'de'));

  const t = week.template;
  const training = Object.entries(settings.trainingDays)
    .filter(([, type]) => type !== 'rest')
    .map(([day, type]) => `${WEEKDAY_LONG[Number(day)]} ${TRAINING_LABELS[type]}`)
    .join(', ');

  return (
    <article className="print-doc mx-auto max-w-[900px] px-5 py-8 text-ink print:max-w-none print:px-0 print:py-0">
      <header>
        <p className="eyebrow">Meal-Prep-Plan{displayName ? ` für ${displayName}` : ''}</p>
        <h1 className="mt-1 font-display text-[40px] font-bold leading-none">
          {t ? `Woche ${t.number} – ${t.name}` : 'Wochenplan'} <span className="text-ink-3">· {week.label}</span>
        </h1>
        {t && (
          <p className="mt-2 text-[15px] text-ink-2">
            {week.simple
              ? `Einfach-Woche: schnelle Gerichte wie Huhn mit Reis statt der Rezepte von „${t.theme}“ – gleiche Makros, die Saucen und das Gönn-Essen bleiben. ${STRATEGY_LABELS[t.strategy]}.`
              : `${t.theme}. Saucen-Basis: ${t.sauceBase}. ${STRATEGY_LABELS[t.strategy]}. ${t.description}`}
          </p>
        )}
        <p className="mt-2 font-mono text-[13px] text-ink-2">
          Ø {n0(week.average.kcal)} kcal · {n0(week.average.protein)} g Protein · {n0(week.average.carbs)} g KH · {n0(week.average.fat)} g Fett pro Tag · Einkauf{' '}
          {formatEuro(week.budget.used)} (Budget {formatEuro(settings.weeklyBudget, 0)})
        </p>
      </header>

      <H2>Ziele – und warum</H2>
      <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        {targetReasons(settings, weightKg).map((r) => (
          <div key={r.title} className="break-inside-avoid rounded-[10px] border border-line/15 p-3">
            <p className="font-display text-[18px] font-semibold">{r.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{r.text}</p>
          </div>
        ))}
      </div>

      <H2>Wochenplan</H2>
      <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        {week.days.map((d) => (
          <div key={d.date} className="break-inside-avoid rounded-[10px] border border-line/15 p-3">
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-display text-[18px] font-semibold">
                {d.long} <span className="text-ink-3">{d.date.slice(8)}.{d.date.slice(5, 7)}.</span>
              </span>
              <span className="text-[12px] font-bold text-ink-2">
                {d.timing.training ? `${TRAINING_LABELS[d.training]} ${d.timing.training.start}` : 'Ruhetag'}
                {!d.shopped && ' · zuhause'}
              </span>
            </p>
            {d.timing.schoolEnd && <p className="text-[11px] text-ink-3">Schule {d.timing.schoolStart}–{d.timing.schoolEnd}</p>}
            <table className="mt-1 w-full text-[12px]">
              <tbody>
                {d.meals.map((m) => (
                  <tr key={m.entryId} className="border-t border-line/10 align-top">
                    <td className="w-11 py-1 font-mono text-ink-3">{m.time}</td>
                    <td className="py-1">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">{m.label}</span>
                      <span className="font-bold">{m.name}</span>
                      {m.isTreat && <span className="ml-1 rounded bg-marker/40 px-1 text-[10px] font-bold uppercase">Gönn-Essen</span>}
                      {m.servings !== 1 && <span className="font-mono"> ×{m.servings.toLocaleString('de-DE')}</span>}
                      {m.sauceName && <span className="text-ink-2"> + {m.sauceName}</span>}
                    </td>
                    <td className="w-20 py-1 text-right font-mono text-ink-2">
                      {n0(m.nutrition.kcal)} kcal
                      <br />
                      {n0(m.nutrition.protein)} g P
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 border-t border-line/20 pt-1 text-right font-mono text-[12px] font-bold">
              {n0(d.planned.kcal)} kcal · {n0(d.planned.protein)} g P · {n0(d.planned.carbs)} g KH · {n0(d.planned.fat)} g F · {n0(d.produce.planned)} g Obst & Gemüse
            </p>
          </div>
        ))}
      </div>

      <H2>Einkaufsliste – {week.shopping.days.length === 7 ? 'ganze Woche' : 'Montag bis Freitag'}</H2>
      <div className="columns-1 gap-6 sm:columns-2 print:columns-2">
        {week.shopping.departments.map((dep) => (
          <div key={dep.name} className="mb-3 break-inside-avoid">
            <p className="flex justify-between border-b border-line/20 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-2">
              <span>{dep.name}</span>
              <span className="font-mono">{dep.lines.some((l) => !l.pantry) ? formatEuro(dep.cost) : 'Vorrat'}</span>
            </p>
            <ul className="text-[12px]">
              {dep.lines.map((l) => (
                <li key={l.slug} className="flex justify-between gap-2 py-0.5">
                  <span>
                    <span className="mr-1.5 inline-block h-3 w-3 border border-ink/60 align-[-2px]" aria-hidden />
                    {l.name}
                    {l.pantry && <span className="text-ink-3"> (Vorrat prüfen)</span>}
                  </span>
                  <span className="whitespace-nowrap font-mono text-ink-2">
                    {l.pantry ? formatGrams(l.grams) : `${l.quantity} · ${formatEuro(l.packCost)}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-2 rounded-[10px] bg-inset p-3 text-[13px]">
        <strong>Gesamtkosten:</strong> Verbrauch dieser Woche <strong className="font-mono">{formatEuro(week.shopping.usedCost)}</strong> · an der Kassa ca.{' '}
        <strong className="font-mono">{formatEuro(week.shopping.packCost)}</strong> für ganze Packungen (Reis, Haferflocken, Öl usw. reichen länger) · Vorrat im Verbrauch{' '}
        {formatEuro(week.shopping.pantryCost)}. Preise: {STORES[settings.store].label}, Österreich 2026, geschätzt.
      </p>

      <H2>Prep-Ablauf</H2>
      {week.prep.sessions.map((s) => (
        <section key={s.id} className="mb-5 break-inside-avoid">
          <p className="font-display text-[20px] font-semibold">
            {s.label} · {WEEKDAY_LONG[s.id === 'sunday' ? 7 : 3]} {s.date.slice(8)}.{s.date.slice(5, 7)}. · {s.start}–{s.end} ({s.minutes} min)
          </p>
          <p className="mt-1 text-[13px] text-ink-2">
            <strong>Kochen:</strong> {s.cook.map((c) => `${c.name} ×${c.boxes}${c.portions !== c.boxes ? ` (${c.portions.toLocaleString('de-DE')} Port.)` : ''}${c.freezer ? `, ${c.freezer} ins TK` : ''}`).join(' · ')}
          </p>
          <table className="mt-2 w-full text-[12px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-ink-3">
                <th className="w-6" />
                <th className="w-24">Zeit</th>
                <th>Schritt</th>
                <th className="w-28">Wo</th>
              </tr>
            </thead>
            <tbody>
              {s.steps.map((st) => (
                <tr key={st.id} className="border-t border-line/10 align-top">
                  <td className="py-1">
                    <span className="inline-block h-3 w-3 border border-ink/60" aria-hidden />
                  </td>
                  <td className="py-1 font-mono">
                    {st.at}–{st.until}
                  </td>
                  <td className="py-1">
                    <span className="font-bold">{st.title}</span>
                    {st.detail && <span className="text-ink-2"> – {st.detail}</span>}
                  </td>
                  <td className="py-1 text-ink-2">
                    {st.lane}
                    {!st.active && ' (läuft)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="font-display text-[18px] font-semibold">Box-Übersicht</p>
      <table className="mt-1 w-full text-[12px]">
        <tbody>
          {week.prep.boxes.map((b) => (
            <tr key={b.day} className="border-t border-line/10 align-top">
              <td className="w-10 py-1 font-bold">{b.short}</td>
              <td className="py-1">
                {b.items
                  .filter((i) => i.storage !== 'fresh')
                  .map((i) => `${i.label}: ${i.name} (${i.storage === 'freezer' ? 'TK – am Vorabend in den Kühlschrank' : `Kühlschrank, gekocht ${i.session === 'wednesday' ? 'Mi' : 'So'}`})`)
                  .join(' · ') || 'alles frisch'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <H2>Rezepte der Woche</H2>
      <div className="space-y-4">
        {weekRecipes.map((r) => {
          const count = portions.get(r.id) ?? 1;
          return (
            <section key={r.id} className="break-inside-avoid rounded-[10px] border border-line/15 p-3">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display text-[20px] font-semibold">{r.name}</span>
                <span className="text-[12px] font-bold text-ink-2">
                  {MEAL_TYPE_LABELS[r.mealType]} · diese Woche {count.toLocaleString('de-DE')} Portion{count === 1 ? '' : 'en'}
                </span>
              </p>
              <p className="font-mono text-[12px] text-ink-2">
                Pro Portion: {n0(r.nutrition.kcal)} kcal · {r.nutrition.protein.toLocaleString('de-DE')} g P · {r.nutrition.carbs.toLocaleString('de-DE')} g KH · {r.nutrition.fat.toLocaleString('de-DE')} g F ·{' '}
                {formatEuro(r.nutrition.cost)} · {r.prepMinutes + r.cookMinutes} min · Kühlschrank {r.fridgeDays} T. · {r.freezerDays ? `TK ${Math.round(r.freezerDays / 30) || 1} Mon.` : 'nicht einfrieren'} ·{' '}
                {r.eatCold ? 'kalt essbar' : 'warm'}
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-5 print:grid-cols-5">
                <ul className="text-[12px] sm:col-span-2 print:col-span-2">
                  {r.ingredients.map((i) => {
                    const grams = (i.grams / r.servings) * count;
                    return (
                      <li key={i.slug} className="flex justify-between gap-2 border-b border-line/10 py-0.5">
                        <span>{ing.get(i.slug)?.name ?? i.slug}</span>
                        <span className="whitespace-nowrap font-mono text-ink-2">{formatGrams(grams)}</span>
                      </li>
                    );
                  })}
                  <li className="pt-1 text-[11px] text-ink-3">Mengen für alle {count.toLocaleString('de-DE')} Portionen der Woche</li>
                </ul>
                <ol className="list-decimal space-y-1 pl-4 text-[12px] leading-relaxed sm:col-span-3 print:col-span-3">
                  {r.steps.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ol>
              </div>
              {r.flavorHack && (
                <p className="mt-2 rounded-[8px] bg-marker/20 px-2 py-1.5 text-[12px]">
                  <strong>Flavor-Hack:</strong> {r.flavorHack}
                </p>
              )}
            </section>
          );
        })}
      </div>

      <H2>Aufbewahren & Aufwärmen</H2>
      <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
        {STORAGE_TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      <H2>Annahmen</H2>
      <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
        <li>Person: 18 Jahre, männlich, 170 cm, {weightKg.toLocaleString('de-DE')} kg, Ziel Body Recomposition, Krafttraining 3–4× pro Woche.</li>
        <li>Training: {training || 'keins eingetragen'}; Wunschzeit {settings.trainingTime}, {settings.trainingMinutes} min, Heimweg {settings.commuteMinutes} min.</li>
        <li>
          Mahlzeitenzeiten aus dem WebUntis-Stundenplan{scheduleSynced ? ` (Stand ${scheduleSynced})` : ''}: Frühstück vor dem Schulweg, Jause in der großen Pause, Mittag in der Mittagspause
          oder zu Hause, Pre-Workout 1 h vor dem Training (frühestens Schulschluss + Heimweg).
        </li>
        <li>
          Budget {formatEuro(settings.weeklyBudget, 0)} pro Woche für {settings.shopWeekend ? 'die ganze Woche' : 'Montag bis Freitag – am Wochenende isst du zu Hause mit, die Rezepte sind Vorschläge'}.
          Einkauf bei {STORES[settings.store].label}; Preise 2026 geschätzt, Nährwerte gerundet aus Standard-Nährwerttabellen.
        </li>
        <li>
          Küche: {EQUIPMENT.filter((e) => settings.equipment.includes(e)).join(', ') || 'Herd'}; {settings.hasMicrowave ? 'Mikrowelle in der Schule' : 'keine Mikrowelle in der Schule – Schul-Mittagessen sind kalt essbar'}.
        </li>
        <li>Mag ich nicht: {settings.dislikes.length ? settings.dislikes.join(', ') : 'nichts angegeben'}.</li>
        <li>Alle Werte sind in Einstellungen → Ernährung änderbar; der Plan passt sich an.</li>
      </ul>
    </article>
  );
}
