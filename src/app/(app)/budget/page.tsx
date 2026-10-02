import type { Metadata } from "next";
import { BudgetView } from "@/components/money/budget-view";
import { MoneyProvider } from "@/components/money/money-context";
import { addMonths, isMonthKey, monthOf } from "@/lib/money/math";
import { categorySpend, dailyExpenses, listBudgets, listGoals } from "@/server/queries/money";
import { loadMoneyBase } from "@/server/queries/money-page";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage({ searchParams }: PageProps<"/budget">) {
  const [{ user, today, providerProps }, params] = await Promise.all([loadMoneyBase(), searchParams]);
  const month = isMonthKey(params.month) && params.month <= monthOf(today) ? params.month : monthOf(today);

  const [budgets, spend, daily, prevDaily, goals] = await Promise.all([
    listBudgets(user.id),
    categorySpend(user.id, month),
    dailyExpenses(user.id, month),
    dailyExpenses(user.id, addMonths(month, -1)),
    listGoals(user.id),
  ]);

  return (
    <MoneyProvider {...providerProps}>
      <BudgetView
        month={month}
        budgets={budgets.map((b) => ({ categoryId: b.categoryId, amount: b.amount }))}
        spend={spend}
        daily={Object.fromEntries(daily)}
        prevDaily={Object.fromEntries(prevDaily)}
        goals={goals.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          target: g.target,
          deadline: g.deadline,
          saved: g.saved,
          contributions: g.contributions.map((c) => ({ amount: c.amount, date: c.date })),
        }))}
      />
    </MoneyProvider>
  );
}
