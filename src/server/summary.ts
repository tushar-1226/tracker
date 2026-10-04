import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions, users, xpEvents } from "@/db/schema";
import { type Day, eachDay } from "@/lib/dates";
import { isComplete, setVolume, toDisplayWeight } from "@/lib/fitness";
import { computeStats, dayCompletion, isDone } from "@/lib/habits/stats";
import { logMap } from "@/lib/habits/view";
import { listBooks } from "@/server/queries/books";
import { listDatedSets, listExercises, listWorkouts } from "@/server/queries/gym";
import { computePRs } from "@/server/queries/gym-stats";
import { listHabits } from "@/server/queries/habits";
import { listEntries } from "@/server/queries/journal";
import { listSessions } from "@/server/queries/learning";

const dayInTz = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
const within = (d: string | null | undefined, from: Day, to: Day) => !!d && d >= from && d <= to;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Everything that happened between two days (inclusive), across all modules. */
export async function getPeriodSummary(userId: string, from: Day, to: Day) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { settings: true } });
  const tz = user?.settings.timeZone || "UTC";
  const units = user?.settings.units ?? "kg";
  const weekStartsOn = user?.settings.weekStartsOn ?? 1;

  const [habits, workouts, history, library, sessions, bookData, entries, money, spendByCategory, xpRows] = await Promise.all([
    listHabits(userId),
    listWorkouts(userId),
    listDatedSets(userId),
    listExercises(userId),
    listSessions(userId),
    listBooks(userId),
    listEntries(userId),
    db
      .select({ type: transactions.type, total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, from), lte(transactions.date, to)))
      .groupBy(transactions.type),
    db
      .select({ name: categories.name, total: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), gte(transactions.date, from), lte(transactions.date, to)))
      .groupBy(transactions.categoryId)
      .orderBy(sql`2 desc`)
      .limit(3),
    db.select({ amount: xpEvents.amount, createdAt: xpEvents.createdAt }).from(xpEvents).where(eq(xpEvents.userId, userId)),
  ]);

  const days = eachDay(from, to);

  // Habits
  const items = habits.map((h) => ({ habit: h, logs: logMap(h) }));
  let due = 0;
  let done = 0;
  let perfect = 0;
  for (const d of days) {
    const c = dayCompletion(items, d);
    due += c.due;
    done += c.done;
    if (c.due && c.done === c.due) perfect++;
  }
  const habitCounts = items
    .filter((i) => i.habit.type !== "quit")
    .map((i) => ({ name: i.habit.name, count: [...i.logs.entries()].filter(([d, v]) => within(d, from, to) && isDone(i.habit, v)).length }))
    .sort((a, b) => b.count - a.count);
  const bestStreak = items
    .map((i) => ({ name: i.habit.name, best: computeStats(i.habit, i.logs, to, weekStartsOn).best }))
    .sort((a, b) => b.best - a.best)[0];

  // Fitness
  const finished = workouts.filter((w) => w.finishedAt && within(w.date, from, to));
  const kindOf = new Map(library.map((e) => [e.id, e.kind]));
  const nameOf = new Map(library.map((e) => [e.id, e.name]));
  const { prIds } = computePRs(library, history);
  let volume = 0;
  let prs = 0;
  const sessionsByExercise = new Map<string, Set<string>>();
  for (const [exerciseId, sets] of history) {
    for (const s of sets) {
      if (!within(s.date, from, to) || !isComplete(kindOf.get(exerciseId) ?? "strength", s)) continue;
      volume += setVolume(s);
      if (prIds.has(s.id)) prs++;
      sessionsByExercise.set(exerciseId, (sessionsByExercise.get(exerciseId) ?? new Set()).add(s.workoutId));
    }
  }
  const topExercise = [...sessionsByExercise.entries()].sort((a, b) => b[1].size - a[1].size)[0];

  // Learning, reading, journal
  const studyMin = sessions.filter((s) => within(s.date, from, to)).reduce((a, s) => a + s.minutes, 0);
  const pages = bookData.logs.filter((l) => within(l.date, from, to)).reduce((a, l) => a + l.pages, 0);
  const booksFinished = bookData.books.filter((b) => b.status === "finished" && within(b.finishedAt, from, to));
  const periodEntries = entries.filter((e) => within(e.date, from, to));

  // XP by day
  const xpByDay = new Map<Day, number>();
  for (const r of xpRows) {
    const d = dayInTz(r.createdAt, tz);
    if (within(d, from, to)) xpByDay.set(d, (xpByDay.get(d) ?? 0) + r.amount);
  }
  const bestDay = [...xpByDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const total = (t: string) => Number(money.find((m) => m.type === t)?.total ?? 0);

  return {
    from,
    to,
    habits: { rate: due ? done / due : null, done, perfectDays: perfect, top: habitCounts[0] ?? null, bestStreak: bestStreak?.best ? bestStreak : null },
    fitness: {
      workouts: finished.length,
      minutes: finished.reduce((a, w) => a + (w.durationMin ?? 0), 0),
      volume: Math.round(toDisplayWeight(volume, units)),
      units,
      prs,
      topExercise: topExercise ? { name: nameOf.get(topExercise[0]) ?? "", sessions: topExercise[1].size } : null,
    },
    money: { income: total("income"), spent: total("expense"), topCategories: spendByCategory.map((c) => ({ name: c.name ?? "Uncategorised", total: Number(c.total) })) },
    learning: { minutes: studyMin },
    reading: { pages, finished: booksFinished.map((b) => ({ title: b.title, author: b.author, coverUrl: b.coverUrl, rating: b.rating })) },
    journal: {
      entries: periodEntries.length,
      mood: mean(periodEntries.map((e) => e.mood).filter((m): m is number => m !== null)),
      sleep: mean(periodEntries.map((e) => e.sleepHours).filter((s): s is number => s !== null)),
    },
    xp: { total: [...xpByDay.values()].reduce((a, b) => a + b, 0), byDay: Object.fromEntries(xpByDay), bestDay: bestDay ? { day: bestDay[0], xp: bestDay[1] } : null },
  };
}

export type PeriodSummary = Awaited<ReturnType<typeof getPeriodSummary>>;

/** One line for a notification: only the parts that actually happened. */
export function summaryLine(s: PeriodSummary, formatMoney: (minor: number) => string) {
  const parts = [
    s.habits.rate !== null && `Habits ${Math.round(s.habits.rate * 100)}%`,
    s.fitness.workouts > 0 && `${s.fitness.workouts} workout${s.fitness.workouts === 1 ? "" : "s"}`,
    s.money.spent > 0 && `${formatMoney(s.money.spent)} spent`,
    s.learning.minutes > 0 && `${Math.round((s.learning.minutes / 60) * 10) / 10}h learning`,
    s.reading.pages > 0 && `${s.reading.pages} pages`,
    s.journal.entries > 0 && `${s.journal.entries} journal entr${s.journal.entries === 1 ? "y" : "ies"}`,
  ].filter(Boolean);
  return parts.length ? `${parts.join(" · ")} · +${s.xp.total} XP` : "A quiet week. A fresh one starts today.";
}
