import "server-only";
import { and, count, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  achievementsUnlocked,
  budgets,
  goalMilestones,
  goals,
  savingsGoals,
  goalContributions,
  tils,
  transactions,
  xpEvents,
  skills as skillsTable,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { type Day, addDays, diffDays, eachDay, startOfWeek, todayIn } from "@/lib/dates";
import { toDisplayWeight } from "@/lib/fitness";
import { dayStreak } from "@/lib/growth";
import { computeStats, dayCompletion, effectiveStart, isDone } from "@/lib/habits/stats";
import { logMap } from "@/lib/habits/view";
import { monthOf, daysInMonth, addMonths, monthRange } from "@/lib/money/math";
import { ACHIEVEMENTS, type AchievementMetrics, TIER_XP, tiersReached } from "@/lib/progress/achievements";
import { type GoalMetric, goalProgress } from "@/lib/progress/goals";
import { levelFromXp } from "@/lib/progress/levels";
import { type LifeParts, budgetPart, fitnessPart, lifeScore } from "@/lib/progress/life-score";
import { MODULES, type ModuleKey, moduleOf } from "@/lib/progress/modules";
import { listBooks } from "@/server/queries/books";
import { listBodyMetrics, listDatedSets, listExercises, listWorkouts } from "@/server/queries/gym";
import { computePRs } from "@/server/queries/gym-stats";
import { listHabits } from "@/server/queries/habits";
import { listEntries } from "@/server/queries/journal";
import { listSessions } from "@/server/queries/learning";
import { listAccounts } from "@/server/queries/money";
import { getTimeZone } from "@/server/today";
import { grantXp, revokeXp } from "@/server/xp";

const PAGES_PER_DAY = 20;
const GOAL_XP = 200;
const BUDGET_DAY_XP = 10;
const BUDGET_MONTH_XP = 150;

const dayInTz = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);

async function build() {
  const user = await getCurrentUser();
  const tz = await getTimeZone();
  const today = todayIn(tz);
  const units = user.settings.units ?? "kg";
  const weekStartsOn = user.settings.weekStartsOn ?? 1;
  const learningTarget = user.settings.learningTarget ?? 30;
  const WEEKLY_WORKOUT_TARGET = user.settings.workoutTarget ?? 3;
  const since = addDays(today, -60);

  const [habits, xpRows, workouts, history, library, sessions, skillRows, [{ tilCount }], bookData, entries, budgetRows, accounts, body, goalRows, milestones, savings] =
    await Promise.all([
      listHabits(user.id),
      db.select({ source: xpEvents.source, amount: xpEvents.amount, createdAt: xpEvents.createdAt }).from(xpEvents).where(eq(xpEvents.userId, user.id)),
      listWorkouts(user.id),
      listDatedSets(user.id),
      listExercises(user.id),
      listSessions(user.id),
      db.select({ id: skillsTable.id, name: skillsTable.name, createdAt: skillsTable.createdAt }).from(skillsTable).where(and(eq(skillsTable.userId, user.id), isNull(skillsTable.archivedAt))),
      db.select({ tilCount: count() }).from(tils).where(eq(tils.userId, user.id)),
      listBooks(user.id),
      listEntries(user.id),
      db.select({ categoryId: budgets.categoryId, amount: budgets.amount }).from(budgets).where(eq(budgets.userId, user.id)),
      listAccounts(user.id),
      listBodyMetrics(user.id),
      db.select().from(goals).where(and(eq(goals.userId, user.id), isNull(goals.archivedAt))),
      db.select().from(goalMilestones).where(eq(goalMilestones.userId, user.id)),
      db
        .select({ id: savingsGoals.id, name: savingsGoals.name, target: savingsGoals.target, saved: sql<number>`coalesce((select sum(${goalContributions.amount}) from ${goalContributions} where ${goalContributions.goalId} = ${savingsGoals.id}), 0)` })
        .from(savingsGoals)
        .where(eq(savingsGoals.userId, user.id)),
    ]);

  // ---------- Money aggregates ----------
  const budgetCats = budgetRows.map((b) => b.categoryId);
  const totalLimit = budgetRows.reduce((s, b) => s + b.amount, 0);
  const [dailyBudgeted, monthlyBudgeted, monthlyTotals, firstTxn] = await Promise.all([
    budgetCats.length
      ? db
          .select({ date: transactions.date, total: sql<number>`sum(${transactions.amount})` })
          .from(transactions)
          .where(and(eq(transactions.userId, user.id), eq(transactions.type, "expense"), inArray(transactions.categoryId, budgetCats), gte(transactions.date, since)))
          .groupBy(transactions.date)
      : Promise.resolve([]),
    budgetCats.length
      ? db
          .select({ month: sql<string>`substr(${transactions.date}, 1, 7)`, total: sql<number>`sum(${transactions.amount})` })
          .from(transactions)
          .where(and(eq(transactions.userId, user.id), eq(transactions.type, "expense"), inArray(transactions.categoryId, budgetCats)))
          .groupBy(sql`1`)
      : Promise.resolve([]),
    db
      .select({ month: sql<string>`substr(${transactions.date}, 1, 7)`, type: transactions.type, total: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .groupBy(sql`1`, transactions.type),
    db.select({ date: sql<string | null>`min(${transactions.date})` }).from(transactions).where(eq(transactions.userId, user.id)),
  ]);
  const budgetSpend = new Map(dailyBudgeted.map((r) => [r.date, Number(r.total)]));
  const thisMonth = monthOf(today);
  const months = [...new Set(monthlyTotals.map((r) => r.month))].filter((m) => m < thisMonth);
  const total = (m: string, t: string) => Number(monthlyTotals.find((r) => r.month === m && r.type === t)?.total ?? 0);
  const monthsSaved = months.filter((m) => total(m, "income") > total(m, "expense")).length;
  const budgetMonths = totalLimit
    ? months.filter((m) => Number(monthlyBudgeted.find((r) => r.month === m)?.total ?? 0) <= totalLimit).length
    : 0;
  const netWorth = accounts.reduce((s, a) => s + a.balance, 0);
  const prevMonth = addMonths(thisMonth, -1);
  const prevMonthBudgeted = Number(monthlyBudgeted.find((r) => r.month === prevMonth)?.total ?? 0);
  const prevMonthActive = monthlyTotals.some((r) => r.month === prevMonth);

  // ---------- Per-day inputs ----------
  const items = habits.map((h) => ({ habit: h, logs: logMap(h) }));
  const finished = workouts.filter((w) => w.finishedAt);
  const workoutDays = new Map<Day, number>();
  for (const w of finished) workoutDays.set(w.date, (workoutDays.get(w.date) ?? 0) + 1);
  const studyByDay = new Map<Day, number>();
  for (const s of sessions) studyByDay.set(s.date, (studyByDay.get(s.date) ?? 0) + s.minutes);
  const pagesByDay = new Map<Day, number>();
  for (const l of bookData.logs) pagesByDay.set(l.date, (pagesByDay.get(l.date) ?? 0) + l.pages);
  const entryDays = new Set(entries.map((e) => e.date));

  const minDay = (xs: (Day | null | undefined)[]) => xs.filter((x): x is Day => !!x).sort()[0] ?? null;
  const starts: Record<ModuleKey, Day | null> = {
    habits: minDay(items.map((i) => effectiveStart(i.habit, i.logs))),
    money: totalLimit ? (firstTxn[0]?.date ?? null) : null,
    fitness: minDay(finished.map((w) => w.date)),
    learning: skillRows.length ? minDay([...sessions.map((s) => s.date), ...skillRows.map((s) => dayInTz(s.createdAt, tz))]) : null,
    reading: minDay([...bookData.logs.map((l) => l.date), ...bookData.books.filter((b) => b.status === "reading").map((b) => b.startedAt)]),
    mind: minDay(entries.map((e) => e.date)),
  };

  const partsFor = (d: Day): LifeParts => {
    const on = (k: ModuleKey) => starts[k] !== null && d >= starts[k]!;
    const weekStart = startOfWeek(d, weekStartsOn);
    let soFar = 0;
    for (const day of eachDay(weekStart, d)) soFar += workoutDays.get(day) ?? 0;
    return {
      habits: on("habits") ? dayCompletion(items, d).ratio : null,
      money: on("money") ? budgetPart(budgetSpend.get(d) ?? 0, totalLimit / daysInMonth(monthOf(d))) : null,
      fitness: on("fitness") ? fitnessPart(workoutDays.has(d), soFar, diffDays(weekStart, d), WEEKLY_WORKOUT_TARGET) : null,
      learning: on("learning") ? Math.min(1, (studyByDay.get(d) ?? 0) / learningTarget) : null,
      reading: on("reading") ? Math.min(1, (pagesByDay.get(d) ?? 0) / PAGES_PER_DAY) : null,
      mind: on("mind") ? (entryDays.has(d) ? 1 : 0) : null,
    };
  };
  const todayParts = partsFor(today);
  const lifeSeries = eachDay(addDays(today, -29), today).map((d) => ({ date: d, score: lifeScore(partsFor(d)) }));

  // ---------- XP & levels ----------
  const xpByModule = Object.fromEntries(MODULES.map((m) => [m.key, 0])) as Record<ModuleKey, number>;
  const xpByDay = new Map<Day, number>();
  for (const r of xpRows) {
    const m = moduleOf(r.source);
    if (m) xpByModule[m] += r.amount;
    const d = dayInTz(r.createdAt, tz);
    xpByDay.set(d, (xpByDay.get(d) ?? 0) + r.amount);
  }
  const overall = levelFromXp(user.xp);

  // ---------- Achievement metrics ----------
  const habitStats = items.map((i) => ({ habit: i.habit, stats: computeStats(i.habit, i.logs, today, weekStartsOn) }));
  const earliestHabit = starts.habits;
  let perfectDays = 0;
  if (earliestHabit) for (const d of eachDay(earliestHabit, today)) if (dayCompletion(items, d).ratio === 1) perfectDays++;
  const { prIds, records } = computePRs(library, history);
  const bench = library.find((e) => e.name.toLowerCase() === "bench press");
  const minutesBySkill = new Map<string, number>();
  for (const s of sessions) minutesBySkill.set(s.skillId, (minutesBySkill.get(s.skillId) ?? 0) + s.minutes);
  const activeDays = new Set<Day>([
    ...items.flatMap((i) => [...i.logs.keys()]),
    ...finished.map((w) => w.date),
    ...sessions.map((s) => s.date),
    ...bookData.logs.map((l) => l.date),
    ...entries.map((e) => e.date),
  ]);

  const metrics: AchievementMetrics = {
    habitChecks: items.reduce((s, i) => s + (i.habit.type === "quit" ? 0 : [...i.logs.values()].filter((v) => isDone(i.habit, v)).length), 0),
    bestHabitStreak: Math.max(0, ...habitStats.filter((h) => h.stats.unit === "days" && h.habit.type !== "quit").map((h) => h.stats.best)),
    perfectDays,
    workouts: finished.length,
    prs: prIds.size,
    benchE1rmKg: bench ? Math.round(records.get(bench.id)?.bestE1rm ?? 0) : 0,
    studyHours: Math.floor(sessions.reduce((s, x) => s + x.minutes, 0) / 60),
    skillsOver10h: [...minutesBySkill.values()].filter((m) => m >= 600).length,
    tils: tilCount,
    booksFinished: bookData.books.filter((b) => b.status === "finished").length,
    pagesRead: bookData.logs.reduce((s, l) => s + l.pages, 0),
    monthsSaved,
    budgetMonths,
    journalEntries: entries.length,
    journalStreak: dayStreak(entryDays, today),
    level: overall.level,
    daysActive: activeDays.size,
  };

  // ---------- Goals ----------
  const latestWeight = [...body].reverse().find((m) => m.weight !== null)?.weight ?? null;
  const goalValue = (metric: GoalMetric, goalId: string): number | null => {
    switch (metric.type) {
      case "manual": {
        const ms = milestones.filter((m) => m.goalId === goalId);
        return ms.filter((m) => m.doneAt).length;
      }
      case "habit_streak":
        return habitStats.find((h) => h.habit.id === metric.habitId)?.stats.current ?? null;
      // Weight metrics compare in kg (targets are stored in kg); converted for display below.
      case "exercise_1rm":
        return records.get(metric.exerciseId)?.bestE1rm ?? 0;
      case "body_weight":
        return latestWeight;
      case "study_hours":
        return Math.round(((minutesBySkill.get(metric.skillId) ?? 0) / 60) * 10) / 10;
      case "books_year":
        return bookData.books.filter((b) => b.status === "finished" && b.finishedAt?.startsWith(today.slice(0, 4))).length;
      case "savings_goal": {
        const g = savings.find((s) => s.id === metric.goalId);
        return g ? Number(g.saved) / 100 : null;
      }
      case "net_worth":
        return netWorth / 100;
    }
  };
  const goalViews = goalRows.map((g) => {
    const current = goalValue(g.metric, g.id);
    const ms = milestones.filter((m) => m.goalId === g.id).sort((a, b) => a.position - b.position);
    const target = g.metric.type === "manual" ? Math.max(1, ms.length) : g.target;
    const weight = g.metric.type === "exercise_1rm" || g.metric.type === "body_weight";
    const show = (v: number | null) => (v === null || !weight ? v : Math.round(toDisplayWeight(v, units) * 10) / 10);
    return {
      id: g.id,
      title: g.title,
      metric: g.metric,
      target: show(target)!,
      baseline: show(g.baseline),
      deadline: g.deadline,
      completedAt: g.completedAt?.getTime() ?? null,
      current: show(current),
      progress: g.metric.type === "manual" && !ms.length ? 0 : goalProgress(current, target, g.baseline),
      milestones: ms.map((m) => ({ id: m.id, title: m.title, done: m.doneAt !== null })),
    };
  });

  return {
    user,
    today,
    tz,
    units,
    currency: user.settings.currency ?? "INR",
    life: { today: lifeScore(todayParts), parts: todayParts, series: lifeSeries },
    xp: { total: user.xp, overall, byModule: xpByModule, byDay: xpByDay },
    metrics,
    goals: goalViews,
    lookups: {
      habits: habits.map((h) => ({ id: h.id, name: h.name })),
      exercises: library.filter((e) => e.kind === "strength").map((e) => ({ id: e.id, name: e.name })),
      skills: skillRows.map((s) => ({ id: s.id, name: s.name })),
      savings: savings.map((s) => ({ id: s.id, name: s.name, target: s.target })),
      latestWeight: latestWeight === null ? null : toDisplayWeight(latestWeight, units),
      netWorth: netWorth / 100,
    },
    money: { totalLimit, budgetSpend, hasBudgetActivity: !!firstTxn[0]?.date, prevMonth, prevMonthBudgeted, prevMonthActive },
  };
}

export type ProgressSnapshot = Awaited<ReturnType<typeof build>>;

/** Writes derived state: budget XP, achievement unlocks, completed goals. Idempotent. */
async function sync(s: ProgressSnapshot) {
  const userId = s.user.id;
  const month = monthOf(s.today);

  await db.transaction(async (tx) => {
    // Budget: each finished day this month within the daily share, and last month overall.
    if (s.money.totalLimit > 0 && s.money.hasBudgetActivity) {
      const daily = s.money.totalLimit / daysInMonth(month);
      for (const d of eachDay(monthRange(month).first, addDays(s.today, -1))) {
        if ((s.money.budgetSpend.get(d) ?? 0) <= daily) await grantXp(tx, userId, "budget-day", d, BUDGET_DAY_XP);
        else await revokeXp(tx, userId, "budget-day", d);
      }
      if (s.money.prevMonthActive) {
        if (s.money.prevMonthBudgeted <= s.money.totalLimit) await grantXp(tx, userId, "budget-month", s.money.prevMonth, BUDGET_MONTH_XP);
        else await revokeXp(tx, userId, "budget-month", s.money.prevMonth);
      }
    }

    // Achievements: every tier reached gets a row (and XP) once.
    for (const a of ACHIEVEMENTS) {
      const reached = tiersReached(a, s.metrics);
      for (let tier = 0; tier < reached; tier++) {
        const inserted = await tx
          .insert(achievementsUnlocked)
          .values({ userId, key: a.key, tier })
          .onConflictDoNothing()
          .returning({ id: achievementsUnlocked.id });
        if (inserted.length) await grantXp(tx, userId, "achievement", `${a.key}:${tier}`, TIER_XP[tier]);
      }
    }

    // Goals that reached their target.
    for (const g of s.goals) {
      if (g.completedAt === null && g.progress >= 1 && !(g.metric.type === "manual" && !g.milestones.length)) {
        await tx.update(goals).set({ completedAt: new Date() }).where(eq(goals.id, g.id));
        await grantXp(tx, userId, "goal", g.id, GOAL_XP);
        g.completedAt = Date.now();
      }
    }
  });
}

/** Snapshot of every module's progress for this request (synced once, shared by layout and pages). */
export const getProgress = cache(async () => {
  const snapshot = await build();
  await sync(snapshot);
  return snapshot;
});

export async function listUnlocked(userId: string) {
  return db
    .select({ id: achievementsUnlocked.id, key: achievementsUnlocked.key, tier: achievementsUnlocked.tier, unlockedAt: achievementsUnlocked.unlockedAt, seenAt: achievementsUnlocked.seenAt })
    .from(achievementsUnlocked)
    .where(eq(achievementsUnlocked.userId, userId));
}
