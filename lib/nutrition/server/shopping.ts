import { db } from '@/lib/db';
import { buildWeekView, type NutritionContext } from './week';

export interface ShoppingSync {
  created: number;
  updated: number;
  removed: number;
}

/**
 * Puts a week's shopping list into the regular Einkaufsliste (ShoppingItem) – there is no
 * second list. Items already open on the list get the new quantity instead of a duplicate;
 * open items from an earlier export of the same week that the plan no longer needs go away.
 * Ticked-off items are never touched.
 */
export async function exportWeekShopping(
  ctx: NutritionContext,
  weekStart: string,
  opts: { includePantry?: boolean; slugs?: string[] | null } = {}
): Promise<ShoppingSync | null> {
  const view = await buildWeekView(ctx, weekStart);
  const only = opts.slugs ? new Set(opts.slugs) : null;
  const lines = view.shopping.lines.filter((l) => (only ? only.has(l.slug) : opts.includePantry || !l.pantry));
  if (lines.length === 0) return null;

  const sourceKey = `nutrition:${weekStart}`;
  const open = await db.shoppingItem.findMany({ where: { userId: ctx.userId, isDone: false } });
  const byName = new Map(open.map((i) => [i.name.trim().toLowerCase(), i]));
  // Everything the plan still needs, pantry included – only what's in none of it is stale.
  const needed = new Set(view.shopping.lines.map((l) => l.name.toLowerCase()));
  let created = 0;
  let updated = 0;
  for (const line of lines) {
    const quantity = line.quantity.slice(0, 40);
    const existing = byName.get(line.name.toLowerCase());
    if (existing) {
      if (existing.quantity !== quantity || existing.sourceKey !== sourceKey) {
        await db.shoppingItem.update({ where: { id: existing.id }, data: { quantity, sourceKey } });
        updated++;
      }
      continue;
    }
    await db.shoppingItem.create({ data: { userId: ctx.userId, name: line.name.slice(0, 120), quantity, sourceKey } });
    created++;
  }
  // Only a full export may remove things – a partial one (slugs) just adds.
  const stale = only ? [] : open.filter((i) => i.sourceKey === sourceKey && !needed.has(i.name.trim().toLowerCase()));
  if (stale.length) await db.shoppingItem.deleteMany({ where: { id: { in: stale.map((i) => i.id) } } });
  await db.mealWeek.updateMany({ where: { userId: ctx.userId, weekStart }, data: { exportedAt: new Date() } });
  return { created, updated, removed: stale.length };
}

/**
 * After a plan change (swap, other rotation week, "Einfach"-Woche): if the week's list was
 * already in the Einkaufsliste, bring it up to date so the shopping still fits the plan.
 */
export async function resyncShoppingIfExported(ctx: NutritionContext, weekStart: string): Promise<ShoppingSync | null> {
  const week = await db.mealWeek.findUnique({ where: { userId_weekStart: { userId: ctx.userId, weekStart } }, select: { exportedAt: true } });
  if (!week?.exportedAt) return null;
  return exportWeekShopping(ctx, weekStart);
}
