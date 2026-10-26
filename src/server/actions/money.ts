"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
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
import { getCurrentUser, verifySession } from "@/lib/auth/dal";
import { addDays, isDay } from "@/lib/dates";
import { LIABILITY_TYPES, occurrence, occurrencesUntil, parseAmount } from "@/lib/money/math";
import {
  type FormState,
  accountSchema,
  categorySchema,
  goalSchema,
  transactionSchema,
} from "@/lib/validators/money";
import { notifyBudgetCrossing } from "@/server/budget-alerts";
import { getToday } from "@/server/today";

const fail = (error: z.ZodError): FormState => ({
  errors: z.flattenError(error).fieldErrors as Record<string, string[]>,
});

async function assertOwnsAccounts(userId: string, ids: (string | null)[]) {
  const wanted = [...new Set(ids.filter((x): x is string => !!x))];
  if (!wanted.length) return;
  const found = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), inArray(accounts.id, wanted)));
  if (found.length !== wanted.length) throw new Error("Account not found");
}

async function assertOwnsCategory(userId: string, id: string | null) {
  if (!id) return;
  const found = await db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, userId)),
  });
  if (!found) throw new Error("Category not found");
}

// ---------- Transactions ----------

export async function saveTransaction(_s: FormState, formData: FormData): Promise<FormState> {
  const { userId } = await verifySession();
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const { repeat, ...t } = parsed.data;

  await assertOwnsAccounts(userId, [t.accountId, t.toAccountId]);
  await assertOwnsCategory(userId, t.categoryId);

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    const res = await db
      .update(transactions)
      .set(t)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id });
    if (!res.length) return { message: "Transaction not found" };
  } else if (repeat !== "none") {
    await db.transaction(async (tx) => {
      const [rule] = await tx
        .insert(recurringRules)
        .values({ ...t, userId, every: repeat, startDate: t.date, nextDate: occurrence(t.date, repeat, 1) })
        .returning({ id: recurringRules.id });
      await tx.insert(transactions).values({ ...t, userId, recurringId: rule.id });
    });
  } else {
    const rawClientId = formData.get("clientId");
    const clientId = typeof rawClientId === "string" && /^[\w-]{8,64}$/.test(rawClientId) ? rawClientId : null;
    const inserted = await db.insert(transactions).values({ ...t, userId, clientId }).onConflictDoNothing().returning({ id: transactions.id });
    // A replayed offline entry that already landed inserts nothing, and must not alert twice.
    if (inserted.length) await notifyBudgetCrossing(userId, t, (await getCurrentUser()).settings.currency ?? "INR");
  }

  refresh();
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const { userId } = await verifySession();
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  refresh();
}

// ---------- Recurring ----------

export async function setRecurringActive(id: string, active: boolean) {
  const { userId } = await verifySession();
  const rule = await db.query.recurringRules.findFirst({
    where: and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)),
  });
  if (!rule) return;
  // Resuming skips what was missed while paused instead of back-filling it.
  const today = await getToday();
  const nextDate = active
    ? occurrencesUntil(rule.startDate, rule.every, rule.nextDate, addDays(today, -1)).next
    : rule.nextDate;
  await db.update(recurringRules).set({ active, nextDate }).where(eq(recurringRules.id, id));
  refresh();
}

/** Stops a rule for good; past transactions stay. */
export async function deleteRecurring(id: string) {
  const { userId } = await verifySession();
  await db.transaction(async (tx) => {
    const rule = await tx.query.recurringRules.findFirst({
      where: and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)),
    });
    if (!rule) return;
    await tx.update(transactions).set({ recurringId: null }).where(eq(transactions.recurringId, id));
    await tx.delete(recurringRules).where(eq(recurringRules.id, id));
  });
  refresh();
}

// ---------- Accounts ----------

export async function saveAccount(_s: FormState, formData: FormData): Promise<FormState> {
  const { userId } = await verifySession();
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const { name, type, balance } = parsed.data;
  // Cards and loans are entered as "amount owed" and stored negative.
  const openingBalance = LIABILITY_TYPES.includes(type) ? -Math.abs(balance) : balance;

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    await db
      .update(accounts)
      .set({ name, type, openingBalance })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  } else {
    await db.insert(accounts).values({ userId, name, type, openingBalance });
  }
  refresh();
  return { ok: true };
}

export async function setAccountArchived(id: string, archived: boolean) {
  const { userId } = await verifySession();
  await db
    .update(accounts)
    .set({ archivedAt: archived ? new Date() : null })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  refresh();
}

// ---------- Categories ----------

export async function saveCategory(_s: FormState, formData: FormData): Promise<FormState> {
  const { userId } = await verifySession();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  await db.insert(categories).values({ ...parsed.data, userId, position: 1000 });
  refresh();
  return { ok: true };
}

export async function archiveCategory(id: string) {
  const { userId } = await verifySession();
  await db
    .update(categories)
    .set({ archivedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  refresh();
}

// ---------- Budgets ----------

/** Sets (or clears, with an empty amount) a category's monthly limit. */
export async function setBudget(categoryId: string, input: string) {
  const { userId } = await verifySession();
  await assertOwnsCategory(userId, categoryId);
  const amount = parseAmount(input);
  if (amount === null) {
    await db.delete(budgets).where(and(eq(budgets.categoryId, categoryId), eq(budgets.userId, userId)));
  } else {
    await db
      .insert(budgets)
      .values({ userId, categoryId, amount })
      .onConflictDoUpdate({ target: budgets.categoryId, set: { amount } });
  }
  refresh();
}

// ---------- Savings goals ----------

export async function saveGoal(_s: FormState, formData: FormData): Promise<FormState> {
  const { userId } = await verifySession();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    await db
      .update(savingsGoals)
      .set(parsed.data)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));
  } else {
    await db.insert(savingsGoals).values({ ...parsed.data, userId });
  }
  refresh();
  return { ok: true };
}

export async function contributeToGoal(goalId: string, input: string, direction: 1 | -1, date: string) {
  const { userId } = await verifySession();
  const amount = parseAmount(input);
  if (amount === null || !isDay(date)) throw new Error("Invalid contribution");
  const goal = await db.query.savingsGoals.findFirst({
    where: and(eq(savingsGoals.id, goalId), eq(savingsGoals.userId, userId)),
  });
  if (!goal) throw new Error("Goal not found");

  await db.transaction(async (tx) => {
    await tx.insert(goalContributions).values({ goalId, userId, amount: amount * direction, date });
    const all = await tx
      .select({ amount: goalContributions.amount })
      .from(goalContributions)
      .where(eq(goalContributions.goalId, goalId));
    const saved = all.reduce((s, c) => s + c.amount, 0);
    const reached = saved >= goal.target;
    if (reached !== !!goal.completedAt) {
      await tx
        .update(savingsGoals)
        .set({ completedAt: reached ? new Date() : null })
        .where(eq(savingsGoals.id, goalId));
    }
  });
  refresh();
}

export async function deleteGoal(id: string) {
  const { userId } = await verifySession();
  await db.transaction(async (tx) => {
    await tx.delete(goalContributions).where(and(eq(goalContributions.goalId, id), eq(goalContributions.userId, userId)));
    await tx.delete(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));
  });
  refresh();
}
