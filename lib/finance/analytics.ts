import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, getDaysInMonth, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { db } from '@/lib/db';
import type { CurrentUser } from '@/lib/user';
import type { AnalyticsRange, CategoryAnalysis, FinanceAnalytics, FinanceInsight, RecurringPayment } from '@/types';
import { categoryMeta } from './categories';
import { merchantKey, merchantLabel } from './merchant';

export const ANALYTICS_RANGES: AnalyticsRange[] = ['month', 'last-month', '3m', '6m', '12m'];

const DAY = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const eur = (n: number) => `${Math.round(n).toLocaleString('de-DE')} €`;
const pct = (n: number) => `${Math.round(n * 100)} %`;

interface Tx {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: string;
  isRecurring: boolean;
  transactionDate: Date;
  counterparty: string | null;
  bankAccount: { name: string } | null;
}

interface Period {
  from: Date;
  /** Exclusive */
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  label: string;
  months: number;
}

function periodFor(range: AnalyticsRange, now: Date): Period {
  const tomorrow = addDays(startOfDay(now), 1);
  const thisMonth = startOfMonth(now);
  if (range === 'month') {
    const prevFrom = subMonths(thisMonth, 1);
    return {
      from: thisMonth,
      to: tomorrow,
      prevFrom,
      // Same number of days in the previous month, so "so far" compares fairly.
      prevTo: addDays(startOfDay(subMonths(now, 1)), 1),
      label: format(now, 'LLLL yyyy', { locale: de }),
      months: now.getDate() / getDaysInMonth(now),
    };
  }
  if (range === 'last-month') {
    const from = subMonths(thisMonth, 1);
    return { from, to: thisMonth, prevFrom: subMonths(thisMonth, 2), prevTo: from, label: format(from, 'LLLL yyyy', { locale: de }), months: 1 };
  }
  const n = range === '3m' ? 3 : range === '6m' ? 6 : 12;
  const from = subMonths(thisMonth, n);
  return {
    from,
    to: thisMonth,
    prevFrom: subMonths(thisMonth, 2 * n),
    prevTo: from,
    label: `${format(from, 'MMM yy', { locale: de })} – ${format(subMonths(thisMonth, 1), 'MMM yy', { locale: de })}`,
    months: n,
  };
}

const inRange = (t: Tx, from: Date, to: Date) => t.transactionDate >= from && t.transactionDate < to;
const isExpense = (t: Tx) => t.type === 'expense';
const isIncome = (t: Tx) => t.type === 'income';
/** Expenses are stored negative; refunds booked as positive expenses reduce the total. */
const spend = (t: Tx) => -t.amount;

function sumBy<T>(items: T[], value: (item: T) => number) {
  return items.reduce((sum, item) => sum + value(item), 0);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function groupMerchants(txs: Tx[], limit: number) {
  const groups = new Map<string, { name: string; amount: number; count: number; categories: Map<string, number> }>();
  for (const t of txs) {
    const key = merchantKey(t.counterparty, t.title);
    const group = groups.get(key) ?? { name: merchantLabel(t.counterparty, t.title), amount: 0, count: 0, categories: new Map() };
    group.amount += spend(t);
    group.count += 1;
    group.categories.set(t.category, (group.categories.get(t.category) ?? 0) + 1);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((g) => g.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((g) => ({
      name: g.name,
      amount: round2(g.amount),
      count: g.count,
      category: [...g.categories.entries()].sort((a, b) => b[1] - a[1])[0][0],
    }));
}

const INTERVALS = {
  weekly: { days: 7, min: 5, max: 9 },
  monthly: { days: 30.44, min: 25, max: 36 },
  quarterly: { days: 91, min: 80, max: 100 },
  yearly: { days: 365, min: 340, max: 390 },
} as const;

/** Finds subscriptions, rent, pocket money etc.: same merchant, similar amount, regular rhythm. */
function detectRecurring(txs: Tx[], now: Date): RecurringPayment[] {
  const groups = new Map<string, Tx[]>();
  for (const t of txs) {
    if (!isExpense(t) && !isIncome(t)) continue;
    const key = `${t.type}:${merchantKey(t.counterparty, t.title)}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  const result: RecurringPayment[] = [];
  for (const [key, items] of groups) {
    items.sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());
    const flagged = items.some((t) => t.isRecurring);
    if (items.length < 3 && !flagged) continue;

    const amounts = items.map((t) => Math.abs(t.amount));
    const typical = median(amounts.slice(-3));
    // Subscriptions cost (almost) the same each time – a price change now and then is fine,
    // varying amounts (supermarket, canteen) are not.
    const pairs = amounts.slice(1).map((a, i) => Math.abs(a - amounts[i]) <= Math.max(0.1, amounts[i] * 0.07));
    const consistent = pairs.length ? pairs.filter(Boolean).length / pairs.length : 1;
    if (consistent < 0.7 && !flagged) continue;

    let interval: RecurringPayment['interval'] = 'monthly';
    if (items.length >= 2) {
      const gaps = items.slice(1).map((t, i) => (t.transactionDate.getTime() - items[i].transactionDate.getTime()) / DAY);
      const med = median(gaps);
      const found = (Object.keys(INTERVALS) as RecurringPayment['interval'][]).find((k) => med >= INTERVALS[k].min && med <= INTERVALS[k].max);
      if (!found) {
        if (!flagged) continue;
      } else {
        const regular = gaps.filter((g) => Math.abs(g - med) <= med * 0.35).length / gaps.length;
        if (regular < 0.7 && !flagged) continue;
        if (found === 'weekly' && items.length < 4 && !flagged) continue;
        interval = found;
      }
    }

    const last = items[items.length - 1];
    const days = INTERVALS[interval].days;
    // Payments that stopped (cancelled subscription) are not recurring anymore.
    if ((now.getTime() - last.transactionDate.getTime()) / DAY > days * 1.6 + 5) continue;

    const nextDate =
      interval === 'weekly'
        ? addDays(last.transactionDate, 7)
        : addMonths(last.transactionDate, interval === 'monthly' ? 1 : interval === 'quarterly' ? 3 : 12);
    const prev = items.length >= 2 ? Math.abs(items[items.length - 2].amount) : null;
    const lastAmount = Math.abs(last.amount);
    const monthlyAmount = (typical * 30.44) / days;

    result.push({
      key,
      name: merchantLabel(last.counterparty, last.title),
      category: last.category,
      type: last.type as 'expense' | 'income',
      amount: round2(typical),
      interval,
      monthlyAmount: round2(monthlyAmount),
      yearlyAmount: round2(monthlyAmount * 12),
      lastDate: last.transactionDate.toISOString(),
      nextDate: nextDate.toISOString(),
      count: items.length,
      priceChange: prev !== null && prev > 0 && Math.abs(lastAmount - prev) / prev > 0.05 ? { from: round2(prev), to: round2(lastAmount) } : null,
    });
  }
  return result.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

/** Same balance logic as the dashboard: starting balance + manual bookings + included accounts. */
async function currentBalance(user: CurrentUser) {
  const [manual, accounts, sums] = await Promise.all([
    db.transaction.aggregate({ where: { userId: user.id, bankAccountId: null }, _sum: { amount: true } }),
    db.bankAccount.findMany({ where: { userId: user.id, includeInBalance: true }, select: { id: true, balance: true } }),
    db.transaction.groupBy({ by: ['bankAccountId'], where: { userId: user.id, bankAccountId: { not: null } }, _sum: { amount: true } }),
  ]);
  const sumMap = new Map(sums.map((s) => [s.bankAccountId, s._sum.amount ?? 0]));
  const bank = sumBy(accounts, (a) => a.balance ?? sumMap.get(a.id) ?? 0);
  return user.startingBalance + (manual._sum.amount ?? 0) + bank;
}

export async function getFinanceAnalytics(user: CurrentUser, range: AnalyticsRange, now = new Date()): Promise<FinanceAnalytics> {
  const period = periodFor(range, now);
  const thisMonth = startOfMonth(now);
  const tomorrow = addDays(startOfDay(now), 1);
  const historyStart = subMonths(thisMonth, 13);
  const loadFrom = period.prevFrom < historyStart ? period.prevFrom : historyStart;

  const [rows, budgets, balance] = await Promise.all([
    db.transaction.findMany({
      where: { userId: user.id, type: { in: ['income', 'expense', 'investment'] }, transactionDate: { gte: loadFrom, lt: tomorrow } },
      select: {
        id: true,
        title: true,
        amount: true,
        category: true,
        type: true,
        isRecurring: true,
        transactionDate: true,
        counterparty: true,
        bankAccount: { select: { name: true } },
      },
      orderBy: { transactionDate: 'asc' },
    }),
    db.categoryBudget.findMany({ where: { userId: user.id }, orderBy: { category: 'asc' } }),
    currentBalance(user),
  ]);
  const txs: Tx[] = rows;
  const budgetMap = new Map(budgets.map((b) => [b.category, b.limit]));
  const firstDate = txs[0]?.transactionDate ?? now;

  // ------------------------------------------------------------ period totals
  const current = txs.filter((t) => inRange(t, period.from, period.to));
  const previous = txs.filter((t) => inRange(t, period.prevFrom, period.prevTo));
  const hasPrevious = previous.length > 0 && firstDate <= period.prevFrom;

  const expensesOf = (list: Tx[]) => sumBy(list.filter(isExpense), spend);
  const incomeOf = (list: Tx[]) => sumBy(list.filter(isIncome), (t) => t.amount);

  const income = incomeOf(current);
  const expenses = expensesOf(current);
  const invested = sumBy(current.filter((t) => t.type === 'investment'), (t) => -t.amount);
  const periodEnd = period.to < tomorrow ? period.to : tomorrow;
  const days = Math.max(1, differenceInCalendarDays(periodEnd, period.from));

  // ------------------------------------------------------------ monthly history
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const start = subMonths(thisMonth, 11 - i);
    const end = addMonths(start, 1);
    const list = txs.filter((t) => inRange(t, start, end));
    const inc = incomeOf(list);
    const exp = expensesOf(list);
    return {
      key: format(start, 'yyyy-MM'),
      label: format(start, 'MMM', { locale: de }).replace('.', ''),
      income: round2(inc),
      expenses: round2(exp),
      net: round2(inc - exp),
      isCurrent: i === 11,
    };
  });

  // Averages use complete months that actually have data.
  const completeMonthsWithData = (count: number) => {
    const start = subMonths(thisMonth, count);
    const effectiveStart = firstDate > start ? startOfMonth(firstDate) : start;
    const months = Math.max(0, (thisMonth.getFullYear() - effectiveStart.getFullYear()) * 12 + thisMonth.getMonth() - effectiveStart.getMonth());
    return { start, months };
  };
  const six = completeMonthsWithData(6);
  const sixMonthTxs = txs.filter((t) => inRange(t, six.start, thisMonth));

  // ------------------------------------------------------------ categories
  const categoryNames = new Set(current.filter(isExpense).map((t) => t.category));
  for (const b of budgets) categoryNames.add(b.category);
  const categories: CategoryAnalysis[] = [...categoryNames]
    .map((category) => {
      const inCat = (t: Tx) => isExpense(t) && t.category === category;
      const list = current.filter(inCat);
      const amount = sumBy(list, spend);
      const prev = sumBy(previous.filter(inCat), spend);
      const trend = Array.from({ length: 7 }, (_, i) => {
        const start = subMonths(thisMonth, 6 - i);
        return round2(sumBy(txs.filter((t) => inCat(t) && inRange(t, start, addMonths(start, 1))), spend));
      });
      return {
        category,
        amount: round2(amount),
        share: expenses > 0 ? amount / expenses : 0,
        count: list.length,
        previous: round2(prev),
        change: hasPrevious && prev > 0 ? (amount - prev) / prev : null,
        avgMonthly: six.months > 0 ? round2(sumBy(sixMonthTxs.filter(inCat), spend) / six.months) : 0,
        perMonth: round2(range === 'month' || range === 'last-month' ? amount : amount / period.months),
        trend,
        budget: budgetMap.get(category) ?? null,
        merchants: groupMerchants(list, 5).map(({ category: _c, ...m }) => m),
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const incomeByCategory = new Map<string, number>();
  for (const t of current.filter(isIncome)) incomeByCategory.set(t.category, (incomeByCategory.get(t.category) ?? 0) + t.amount);
  const incomeCategories = [...incomeByCategory.entries()]
    .map(([category, amount]) => ({ category, amount: round2(amount), share: income > 0 ? amount / income : 0 }))
    .sort((a, b) => b.amount - a.amount);

  // ------------------------------------------------------------ details
  const topExpenses = current
    .filter((t) => isExpense(t) && spend(t) > 0)
    .sort((a, b) => spend(b) - spend(a))
    .slice(0, 10)
    .map((t) => ({ id: t.id, title: t.title, amount: round2(spend(t)), category: t.category, date: t.transactionDate.toISOString(), account: t.bankAccount?.name ?? null, type: 'expense' as const, isRecurring: t.isRecurring, counterparty: t.counterparty }));

  const merchants = groupMerchants(current.filter(isExpense), 10);

  const weekdayTotals = Array(7).fill(0) as number[];
  const weekdayCounts = Array(7).fill(0) as number[];
  for (let d = new Date(period.from); d < periodEnd; d = addDays(d, 1)) weekdayCounts[(d.getDay() + 6) % 7]++;
  for (const t of current.filter(isExpense)) weekdayTotals[(t.transactionDate.getDay() + 6) % 7] += spend(t);
  const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((label, i) => ({
    label,
    amount: round2(weekdayTotals[i]),
    avgPerDay: round2(weekdayCounts[i] ? weekdayTotals[i] / weekdayCounts[i] : 0),
  }));

  const isFood = (t: Tx) => isExpense(t) && !!categoryMeta(t.category).food;
  const foodList = current.filter(isFood);
  const foodTotal = sumBy(foodList, spend);
  const food = {
    total: round2(foodTotal),
    groceries: round2(sumBy(foodList.filter((t) => t.category === 'Lebensmittel'), spend)),
    eatingOut: round2(sumBy(foodList.filter((t) => t.category === 'Essen gehen'), spend)),
    perDay: round2(foodTotal / days),
    share: expenses > 0 ? foodTotal / expenses : 0,
    previous: round2(sumBy(previous.filter(isFood), spend)),
    topPlaces: groupMerchants(foodList, 5).map(({ category: _c, ...m }) => m),
  };

  // ------------------------------------------------------------ recurring & forecast
  const recurring = detectRecurring(
    txs.filter((t) => t.transactionDate >= historyStart),
    now
  );
  const recurringExpenses = recurring.filter((r) => r.type === 'expense');
  const recurringKeys = new Set(recurringExpenses.map((r) => r.key));
  const isRecurringTx = (t: Tx) => recurringKeys.has(`${t.type}:${merchantKey(t.counterparty, t.title)}`);

  const monthTxs = txs.filter((t) => inRange(t, thisMonth, tomorrow));
  const spentSoFar = expensesOf(monthTxs);
  const incomeSoFar = incomeOf(monthTxs);
  const variableSoFar = sumBy(monthTxs.filter((t) => isExpense(t) && !isRecurringTx(t)), spend);

  const daysInMonth = getDaysInMonth(now);
  const elapsed = now.getDate();
  const daysLeft = daysInMonth - elapsed;

  const three = completeMonthsWithData(3);
  const threeTxs = txs.filter((t) => inRange(t, three.start, thisMonth));
  const baselineDays = three.months > 0 ? differenceInCalendarDays(thisMonth, subMonths(thisMonth, three.months)) : 0;
  const baselineDaily = baselineDays > 0 ? sumBy(threeTxs.filter((t) => isExpense(t) && !isRecurringTx(t)), spend) / baselineDays : null;
  const pace = variableSoFar / elapsed;
  // Early in the month the history counts more, later the actual pace.
  const weight = elapsed / daysInMonth;
  const dailyPace = baselineDaily === null ? pace : pace * weight + baselineDaily * (1 - weight);

  const monthEnd = endOfMonth(now);
  const windowStart = addDays(startOfDay(now), -2);
  const pending: FinanceAnalytics['forecast']['pending'] = [];
  for (const r of recurring) {
    let next = new Date(r.nextDate);
    while (next <= monthEnd) {
      if (next >= windowStart) pending.push({ name: r.name, amount: r.amount, date: next.toISOString(), type: r.type });
      if (r.interval !== 'weekly') break;
      next = addDays(next, 7);
    }
  }
  pending.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pendingExpenses = sumBy(pending.filter((p) => p.type === 'expense'), (p) => p.amount);
  const pendingIncome = sumBy(pending.filter((p) => p.type === 'income'), (p) => p.amount);
  const pendingFixed = sumBy(
    pending.filter((p) => p.type === 'expense' && recurringExpenses.find((r) => r.name === p.name)?.category === 'Fixkosten'),
    (p) => p.amount
  );

  const projectedExpenses = spentSoFar + dailyPace * daysLeft + pendingExpenses;
  const projectedIncome = incomeSoFar + pendingIncome;
  const endOfMonthBalance = balance + pendingIncome - dailyPace * daysLeft - pendingExpenses;
  const fixedSoFar = sumBy(monthTxs.filter((t) => isExpense(t) && t.category === 'Fixkosten'), spend);
  const projectedDiscretionary = projectedExpenses - fixedSoFar - pendingFixed;

  const netMonths = monthly.slice(0, 11).slice(-Math.max(1, three.months));
  const avgMonthlyNet = three.months > 0 ? sumBy(netMonths, (m) => m.net) / netMonths.length : projectedIncome - projectedExpenses;
  const points = [
    { label: 'Heute', balance: round2(balance) },
    { label: format(monthEnd, 'MMM', { locale: de }).replace('.', ''), balance: round2(endOfMonthBalance) },
    ...Array.from({ length: 6 }, (_, i) => ({
      label: format(addMonths(monthEnd, i + 1), 'MMM', { locale: de }).replace('.', ''),
      balance: round2(endOfMonthBalance + avgMonthlyNet * (i + 1)),
    })),
  ];

  // ------------------------------------------------------------ insights
  const insights: FinanceInsight[] = [];
  const net = income - expenses;

  if (range === 'month' && user.monthlyBudget > 0 && spentSoFar > 0) {
    const diff = projectedDiscretionary - user.monthlyBudget;
    insights.push(
      diff > 0
        ? { tone: 'warn', title: 'Budget wird knapp', text: `Bei deinem Tempo landest du bei ${eur(projectedDiscretionary)} – ${eur(diff)} über deinem Monatsbudget.` }
        : { tone: 'good', title: 'Auf Kurs', text: `Voraussichtlich bleiben dir ${eur(-diff)} von deinem Monatsbudget übrig.` }
    );
  }

  for (const c of categories) {
    if (c.budget === null || c.budget <= 0) continue;
    const used = c.perMonth / c.budget;
    if (used > 1) insights.push({ tone: 'warn', title: `${c.category}: Budget überschritten`, text: `${eur(c.perMonth)} von ${eur(c.budget)} – ${eur(c.perMonth - c.budget)} zu viel.` });
    else if (used >= 0.8 && range === 'month') insights.push({ tone: 'info', title: `${c.category}: fast am Limit`, text: `${pct(used)} deines Budgets von ${eur(c.budget)} sind schon weg.` });
  }

  let spikes = 0;
  for (const c of categories) {
    // Fixed costs are booked early in the month, so a "so far" comparison would always alarm.
    if (spikes >= 2 || c.budget !== null || c.category === 'Fixkosten') continue;
    if (range === 'month') {
      const expected = c.avgMonthly * weight;
      if (c.avgMonthly >= 20 && c.amount > expected * 1.3 && c.amount - expected >= 15) {
        insights.push({ tone: 'warn', title: `Mehr für ${c.category}`, text: `Schon ${eur(c.amount)} – sonst sind es um diese Zeit etwa ${eur(expected)}.` });
        spikes++;
      }
    } else if (c.change !== null && c.change > 0.3 && c.amount - c.previous >= 20) {
      insights.push({ tone: 'warn', title: `Mehr für ${c.category}`, text: `${eur(c.amount)} statt ${eur(c.previous)} im Zeitraum davor (+${pct(c.change)}).` });
      spikes++;
    }
  }
  const saved = categories.find((c) => range !== 'month' && c.change !== null && c.change < -0.25 && c.previous - c.amount >= 20);
  if (saved) insights.push({ tone: 'good', title: `Weniger für ${saved.category}`, text: `${eur(saved.previous - saved.amount)} gespart im Vergleich zum Zeitraum davor.` });

  if (food.total > 0 && food.eatingOut > 0 && food.total >= 20) {
    const outShare = food.eatingOut / food.total;
    insights.push({
      tone: outShare > 0.5 ? 'warn' : 'info',
      title: 'Essen',
      text: `${eur(food.total)} für Essen (${eur(food.perDay)} pro Tag), davon ${pct(outShare)} unterwegs oder bestellt.`,
    });
  }

  for (const r of recurringExpenses.filter((r) => r.priceChange && r.priceChange.to > r.priceChange.from).slice(0, 2)) {
    insights.push({ tone: 'warn', title: `${r.name} wurde teurer`, text: `Jetzt ${eur(r.priceChange!.to)} statt ${eur(r.priceChange!.from)} – ${eur((r.priceChange!.to - r.priceChange!.from) * (12 * 30.44 / INTERVALS[r.interval].days))} mehr im Jahr.` });
  }

  const recurringMonthly = sumBy(recurringExpenses, (r) => r.monthlyAmount);
  if (recurringExpenses.length > 0) {
    insights.push({
      tone: 'info',
      title: 'Abos & Fixkosten',
      text: `${recurringExpenses.length} regelmäßige Zahlungen kosten dich ${eur(recurringMonthly)} im Monat – ${eur(recurringMonthly * 12)} im Jahr.`,
    });
  }

  const weekdayAvg = sumBy(weekdays.slice(0, 5), (w) => w.avgPerDay) / 5;
  const weekendAvg = sumBy(weekdays.slice(5), (w) => w.avgPerDay) / 2;
  if (weekendAvg >= 5 && weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.5) {
    insights.push({ tone: 'info', title: 'Wochenende', text: `Am Wochenende gibst du ${(weekendAvg / weekdayAvg).toLocaleString('de-DE', { maximumFractionDigits: 1 })}× so viel aus wie unter der Woche.` });
  }

  if (income > 0 && range !== 'month') {
    const rate = net / income;
    if (rate >= 0.2) insights.push({ tone: 'good', title: 'Starke Sparquote', text: `Du hast ${pct(rate)} deiner Einnahmen behalten (${eur(net)}).` });
    else if (rate < 0) insights.push({ tone: 'warn', title: 'Mehr ausgegeben als eingenommen', text: `${eur(-net)} Minus in diesem Zeitraum.` });
  }

  if (topExpenses[0] && expenses > 0 && topExpenses[0].amount / expenses >= 0.15) {
    insights.push({ tone: 'info', title: 'Größte Ausgabe', text: `${topExpenses[0].title}: ${eur(topExpenses[0].amount)} (${pct(topExpenses[0].amount / expenses)} aller Ausgaben).` });
  }

  const toneOrder = { warn: 0, good: 1, info: 2 };
  insights.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);

  return {
    range,
    label: period.label,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
    days,
    hasData: txs.some((t) => isExpense(t) || isIncome(t)),
    totals: {
      income: round2(income),
      expenses: round2(expenses),
      invested: round2(invested),
      net: round2(net),
      savingsRate: income > 0 ? net / income : null,
      avgPerDay: round2(expenses / days),
      avgPerMonth: round2(range === 'month' ? (expenses / elapsed) * daysInMonth : expenses / period.months),
      count: current.length,
    },
    previous: hasPrevious
      ? { income: round2(incomeOf(previous)), expenses: round2(expensesOf(previous)), net: round2(incomeOf(previous) - expensesOf(previous)) }
      : { income: 0, expenses: 0, net: 0 },
    categories,
    incomeCategories,
    topExpenses,
    merchants,
    weekdays,
    monthly,
    food,
    recurring,
    recurringMonthly: round2(recurringMonthly),
    forecast: {
      balance: round2(balance),
      spentSoFar: round2(spentSoFar),
      incomeSoFar: round2(incomeSoFar),
      projectedExpenses: round2(projectedExpenses),
      projectedIncome: round2(projectedIncome),
      projectedNet: round2(projectedIncome - projectedExpenses),
      endOfMonthBalance: round2(endOfMonthBalance),
      dailyPace: round2(dailyPace),
      budget: user.monthlyBudget,
      projectedDiscretionary: round2(projectedDiscretionary),
      pending,
      avgMonthlyNet: round2(avgMonthlyNet),
      points,
      daysLeft,
    },
    budgets: budgets.map((b) => ({ category: b.category, limit: b.limit })),
    insights: insights.slice(0, 8),
  };
}
