import "server-only";
import { and, asc, count, desc, eq, gte, isNull, like, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  budgets,
  categories,
  goalContributions,
  recurringRules,
  savingsGoals,
  transactions,
} from "@/db/schema";
import type { Day } from "@/lib/dates";
import {
  type MonthKey,
  accountBalances,
  addMonths,
  monthRange,
  netEffect,
  occurrencesUntil,
} from "@/lib/money/math";

const DEFAULT_CATEGORIES = [
  ["Food & dining", "expense", "utensils"],
  ["Groceries", "expense", "shopping-cart"],
  ["Transport", "expense", "car"],
  ["Shopping", "expense", "shopping-bag"],
  ["Bills & utilities", "expense", "receipt"],
  ["Rent", "expense", "home"],
  ["Health", "expense", "heart-pulse"],
  ["Entertainment", "expense", "clapperboard"],
  ["Subscriptions", "expense", "repeat"],
  ["Education", "expense", "graduation-cap"],
  ["Travel", "expense", "plane"],
  ["Gifts", "expense", "gift"],
  ["Other", "expense", "circle-dashed"],
  ["Salary", "income", "briefcase"],
  ["Freelance", "income", "laptop"],
  ["Investments", "income", "trending-up"],
  ["Gifts received", "income", "gift"],
  ["Other income", "income", "circle-dashed"],
] as const;

/** First visit: default categories and a Cash account. Safe to call on every request. */
export async function ensureMoneySetup(userId: string) {
  const [{ n }] = await db.select({ n: count() }).from(categories).where(eq(categories.userId, userId));
  if (n > 0) return;
  await db.transaction(async (tx) => {
    const [{ again }] = await tx.select({ again: count() }).from(categories).where(eq(categories.userId, userId));
    if (again > 0) return;
    await tx.insert(categories).values(
      DEFAULT_CATEGORIES.map(([name, kind, icon], position) => ({ userId, name, kind, icon, position })),
    );
    const [{ a }] = await tx.select({ a: count() }).from(accounts).where(eq(accounts.userId, userId));
    if (a === 0) await tx.insert(accounts).values({ userId, name: "Cash", type: "cash" });
  });
}

/** Turns due recurring rules into real transactions (idempotent). */
export async function materializeRecurring(userId: string, today: Day) {
  const due = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.active, true), lte(recurringRules.nextDate, today)));
  if (!due.length) return;

  await db.transaction(async (tx) => {
    for (const rule of due) {
      const { dates, next } = occurrencesUntil(rule.startDate, rule.every, rule.nextDate, today);
      if (dates.length) {
        await tx
          .insert(transactions)
          .values(
            dates.map((date) => ({
              userId,
              type: rule.type,
              amount: rule.amount,
              accountId: rule.accountId,
              toAccountId: rule.toAccountId,
              categoryId: rule.categoryId,
              note: rule.note,
              date,
              recurringId: rule.id,
            })),
          )
          .onConflictDoNothing();
      }
      await tx.update(recurringRules).set({ nextDate: next }).where(eq(recurringRules.id, rule.id));
    }
  });
}

/** Setup + recurring catch-up; call at the top of every money page. */
export async function prepareMoney(userId: string, today: Day) {
  await ensureMoneySetup(userId);
  await materializeRecurring(userId, today);
}

export async function listCategories(userId: string) {
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), isNull(categories.archivedAt)))
    .orderBy(asc(categories.position));
}

/** Accounts with live balances. Archived accounts still count toward net worth. */
export async function listAccounts(userId: string) {
  const [rows, sums, incoming] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.position), asc(accounts.createdAt)),
    db
      .select({ accountId: transactions.accountId, type: transactions.type, total: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(transactions.accountId, transactions.type),
    db
      .select({ accountId: transactions.toAccountId, total: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "transfer")))
      .groupBy(transactions.toAccountId),
  ]);

  const balances = accountBalances(
    rows,
    sums.map((s) => ({ type: s.type, amount: Number(s.total), accountId: s.accountId, toAccountId: null })),
  );
  for (const i of incoming) {
    if (i.accountId && balances.has(i.accountId)) balances.set(i.accountId, balances.get(i.accountId)! + Number(i.total));
  }
  return rows.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 }));
}

/** Income and expense per month, oldest first, zero-filled. */
export async function monthlyTotals(userId: string, fromMonth: MonthKey, toMonth: MonthKey) {
  const rows = await db
    .select({
      month: sql<string>`substr(${transactions.date}, 1, 7)`,
      type: transactions.type,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, `${fromMonth}-01`),
        lte(transactions.date, monthRange(toMonth).last),
      ),
    )
    .groupBy(sql`1`, transactions.type);

  const out: { month: MonthKey; income: number; expense: number }[] = [];
  for (let m = fromMonth; m <= toMonth; m = addMonths(m, 1)) {
    const pick = (type: string) => Number(rows.find((r) => r.month === m && r.type === type)?.total ?? 0);
    out.push({ month: m, income: pick("income"), expense: pick("expense") });
  }
  return out;
}

/** Net worth at the end of each month, derived backwards from today's balance. */
export async function netWorthSeries(userId: string, currentNetWorth: number, fromMonth: MonthKey, toMonth: MonthKey) {
  const rows = await db
    .select({ month: sql<string>`substr(${transactions.date}, 1, 7)`, type: transactions.type, total: sql<number>`sum(${transactions.amount})` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, `${addMonths(fromMonth, 1)}-01`)))
    .groupBy(sql`1`, transactions.type);

  const effectAfter = (m: MonthKey) =>
    rows
      .filter((r) => r.month > m)
      .reduce((s, r) => s + netEffect({ type: r.type, amount: Number(r.total) }), 0);

  const out: { month: MonthKey; value: number }[] = [];
  for (let m = fromMonth; m <= toMonth; m = addMonths(m, 1)) {
    out.push({ month: m, value: currentNetWorth - effectAfter(m) });
  }
  return out;
}

export async function categorySpend(userId: string, month: MonthKey, kind: "expense" | "income" = "expense") {
  const { first, last } = monthRange(month);
  const rows = await db
    .select({ categoryId: transactions.categoryId, total: sql<number>`sum(${transactions.amount})` })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.type, kind), gte(transactions.date, first), lte(transactions.date, last)),
    )
    .groupBy(transactions.categoryId);
  return rows.map((r) => ({ categoryId: r.categoryId, total: Number(r.total) }));
}

/** Expense per day of a month (for cumulative pace charts). */
export async function dailyExpenses(userId: string, month: MonthKey) {
  const { first, last } = monthRange(month);
  const rows = await db
    .select({ date: transactions.date, total: sql<number>`sum(${transactions.amount})` })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.type, "expense"), gte(transactions.date, first), lte(transactions.date, last)),
    )
    .groupBy(transactions.date);
  return new Map(rows.map((r) => [r.date, Number(r.total)]));
}

export async function spentOn(userId: string, day: Day) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), eq(transactions.date, day)));
  return Number(row.total);
}

export type TxnFilter = {
  month?: MonthKey;
  type?: "income" | "expense" | "transfer";
  accountId?: string;
  categoryId?: string;
  q?: string;
  limit?: number;
  oldestFirst?: boolean;
};

export async function listTransactions(userId: string, f: TxnFilter = {}) {
  const conds = [eq(transactions.userId, userId)];
  if (f.month) {
    const { first, last } = monthRange(f.month);
    conds.push(gte(transactions.date, first), lte(transactions.date, last));
  }
  if (f.type) conds.push(eq(transactions.type, f.type));
  if (f.accountId) conds.push(or(eq(transactions.accountId, f.accountId), eq(transactions.toAccountId, f.accountId))!);
  if (f.categoryId) conds.push(eq(transactions.categoryId, f.categoryId));
  if (f.q) conds.push(like(transactions.note, `%${f.q.replace(/[%_]/g, "")}%`));

  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      note: transactions.note,
      accountId: transactions.accountId,
      toAccountId: transactions.toAccountId,
      categoryId: transactions.categoryId,
      recurringId: transactions.recurringId,
    })
    .from(transactions)
    .where(and(...conds))
    .orderBy(
      f.oldestFirst ? asc(transactions.date) : desc(transactions.date),
      f.oldestFirst ? asc(transactions.createdAt) : desc(transactions.createdAt),
    )
    .limit(f.limit ?? 500);
}

export async function listRecurring(userId: string) {
  return db
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.userId, userId))
    .orderBy(desc(recurringRules.active), asc(recurringRules.nextDate));
}

export async function listBudgets(userId: string) {
  return db.select().from(budgets).where(eq(budgets.userId, userId));
}

export async function listGoals(userId: string) {
  const [goals, contributions] = await Promise.all([
    db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId)).orderBy(asc(savingsGoals.createdAt)),
    db
      .select({ goalId: goalContributions.goalId, amount: goalContributions.amount, date: goalContributions.date })
      .from(goalContributions)
      .where(eq(goalContributions.userId, userId)),
  ]);
  return goals.map((g) => {
    const mine = contributions.filter((c) => c.goalId === g.id);
    return { ...g, saved: mine.reduce((s, c) => s + c.amount, 0), contributions: mine };
  });
}
