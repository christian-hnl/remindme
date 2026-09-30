import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { isDayKey, parseDay, weekStartOf } from '@/lib/nutrition/dates';
import { PROFILE } from '@/lib/nutrition/profile';
import { loadIngredients } from '@/lib/nutrition/server/catalog';
import { recipeViews } from '@/lib/nutrition/server/summary';
import { buildWeekView, loadContext } from '@/lib/nutrition/server/week';
import { PrintButton } from '@/components/nutrition/PrintButton';
import { PrintPlan } from '@/components/nutrition/PrintPlan';

export const dynamic = 'force-dynamic';

/** Paper is white, whatever the app theme. */
const PRINT_CSS = `
  @page { size: A4; margin: 14mm 12mm; }
  @media print {
    :root, :root[data-theme=dark] {
      --paper: 255 255 255; --sheet: 255 255 255; --inset: 243 245 249; --ink: 21 29 51; --ink-2: 60 70 95; --ink-3: 110 120 145;
      --line: 21 29 51; --marker: 255 219 46; --marker-strength: 0.85; --grid-line: transparent;
    }
    body { background: #fff !important; font-size: 12px; }
    .print-hide { display: none !important; }
  }
`;

export const metadata: Metadata = { title: 'Meal-Prep-Plan · LifeTracker' };

/** Printable plan for one week – "Drucken → Als PDF speichern" gives the PDF. */
export default async function MealPrepPrintPage({ searchParams }: { searchParams: { week?: string; autoprint?: string } }) {
  const user = await getCurrentUser();
  const ctx = await loadContext(user.id);
  const weekStart = weekStartOf(isDayKey(searchParams.week) ? parseDay(searchParams.week) : new Date());
  const [week, recipes, ingredients, latest, untis] = await Promise.all([
    buildWeekView(ctx, weekStart),
    recipeViews(ctx),
    loadIngredients(),
    db.bodyMetric.findFirst({ where: { userId: user.id, weightKg: { not: null } }, orderBy: { day: 'desc' } }),
    db.webUntisConfig.findUnique({ where: { userId: user.id }, select: { lastSyncAt: true } }),
  ]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <PrintButton autoprint={searchParams.autoprint === '1'} />
      <PrintPlan
        week={week}
        recipes={recipes}
        ingredients={ingredients}
        settings={ctx.settings}
        weightKg={latest?.weightKg ?? PROFILE.weightKg}
        displayName={user.displayName}
        scheduleSynced={untis?.lastSyncAt ? untis.lastSyncAt.toLocaleDateString('de-AT') : null}
      />
    </>
  );
}
