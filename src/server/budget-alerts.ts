import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { formatMoney, budgetCrossing } from "@/lib/money/math";
import { sendToUser } from "@/server/push";

/** After a new expense: push once when its category's monthly budget passes 80% and again at 100%. */
export async function notifyBudgetCrossing(userId: string, t: { type: string; categoryId: string | null; amount: number; date: string }, currency: string) {
  if (t.type !== "expense" || !t.categoryId) return;
  try {
    const budget = await db.query.budgets.findFirst({ where: and(eq(budgets.userId, userId), eq(budgets.categoryId, t.categoryId)) });
    if (!budget) return;
    const month = t.date.slice(0, 7);
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          eq(transactions.categoryId, t.categoryId),
          gte(transactions.date, `${month}-01`),
          lte(transactions.date, `${month}-31`),
        ),
      );
    const after = Number(row?.total ?? 0);
    const crossing = budgetCrossing(after - t.amount, after, budget.amount);
    if (!crossing) return;
    const cat = await db.query.categories.findFirst({ where: eq(categories.id, t.categoryId), columns: { name: true } });
    const name = cat?.name ?? "this category";
    await sendToUser(userId, {
      title: crossing === "over" ? `Over budget: ${name}` : `${name} budget at ${Math.round((after / budget.amount) * 100)}%`,
      body: `${formatMoney(after, currency)} of ${formatMoney(budget.amount, currency)} spent this month.`,
      url: "/budget",
      tag: `budget-${t.categoryId}-${crossing}`,
    });
  } catch (e) {
    console.error("budget alert failed", e);
  }
}
