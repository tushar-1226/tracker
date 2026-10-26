import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AccountType, RepeatEvery, TxnType } from "@/lib/money/math";
import { users } from "./users";

// All amounts are integers in minor units (paise) to avoid float rounding.

export type CategoryKind = "income" | "expense";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const owner = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });
const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const accounts = sqliteTable("accounts", {
  id: id(),
  userId: owner(),
  name: text("name").notNull(),
  type: text("type").$type<AccountType>().notNull().default("bank"),
  /** Signed: negative for money owed (cards, loans). */
  openingBalance: integer("opening_balance").notNull().default(0),
  position: integer("position").notNull().default(0),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  createdAt: createdAt(),
});

export const categories = sqliteTable("categories", {
  id: id(),
  userId: owner(),
  name: text("name").notNull(),
  kind: text("kind").$type<CategoryKind>().notNull(),
  icon: text("icon").notNull().default("circle"),
  position: integer("position").notNull().default(0),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
});

export const recurringRules = sqliteTable("recurring_rules", {
  id: id(),
  userId: owner(),
  type: text("type").$type<TxnType>().notNull(),
  amount: integer("amount").notNull(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  toAccountId: text("to_account_id").references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  note: text("note"),
  every: text("every").$type<RepeatEvery>().notNull(),
  /** Day-of-month / weekday anchor comes from this first date. */
  startDate: text("start_date").notNull(),
  /** Next occurrence not yet turned into a transaction. */
  nextDate: text("next_date").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    userId: owner(),
    type: text("type").$type<TxnType>().notNull(),
    /** Always positive; `type` gives the direction. */
    amount: integer("amount").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    toAccountId: text("to_account_id").references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    date: text("date").notNull(),
    note: text("note"),
    recurringId: text("recurring_id").references(() => recurringRules.id, { onDelete: "set null" }),
    /** Set for entries made on the device, so an offline retry can't create a duplicate. */
    clientId: text("client_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.date),
    uniqueIndex("transactions_client_uq").on(t.userId, t.clientId),
    // One generated transaction per rule occurrence.
    uniqueIndex("transactions_recurring_uq").on(t.recurringId, t.date),
  ],
);

/** A standing monthly limit for an expense category. */
export const budgets = sqliteTable(
  "budgets",
  {
    id: id(),
    userId: owner(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
  },
  (t) => [uniqueIndex("budgets_category_uq").on(t.categoryId)],
);

export const savingsGoals = sqliteTable("savings_goals", {
  id: id(),
  userId: owner(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("piggy-bank"),
  target: integer("target").notNull(),
  deadline: text("deadline"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: createdAt(),
});

export const goalContributions = sqliteTable(
  "goal_contributions",
  {
    id: id(),
    goalId: text("goal_id")
      .notNull()
      .references(() => savingsGoals.id, { onDelete: "cascade" }),
    userId: owner(),
    /** Negative to withdraw. */
    amount: integer("amount").notNull(),
    date: text("date").notNull(),
  },
  (t) => [index("goal_contributions_goal_idx").on(t.goalId)],
);

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type RecurringRule = typeof recurringRules.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
