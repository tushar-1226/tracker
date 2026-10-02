import type { Metadata } from "next";
import { MoneyProvider } from "@/components/money/money-context";
import { MoneyOverview } from "@/components/money/money-overview";
import { addMonths, monthOf } from "@/lib/money/math";
import { categorySpend, listRecurring, listTransactions, monthlyTotals, netWorthSeries } from "@/server/queries/money";
import { draftFromParam, loadMoneyBase } from "@/server/queries/money-page";

export const metadata: Metadata = { title: "Money" };

export default async function MoneyPage({ searchParams }: PageProps<"/money">) {
  const [{ user, today, accounts, providerProps }, params] = await Promise.all([loadMoneyBase(), searchParams]);
  const month = monthOf(today);
  const netWorth = accounts.reduce((s, a) => s + a.balance, 0);

  // Chart from when tracking began (first account or earliest transaction), up to 12 months.
  const [oldest] = await listTransactions(user.id, { oldestFirst: true, limit: 1 });
  const firstAccount = accounts.reduce<string>((min, a) => {
    const m = a.createdAt.toISOString().slice(0, 7);
    return m < min ? m : min;
  }, month);
  const began = oldest && monthOf(oldest.date) < firstAccount ? monthOf(oldest.date) : firstAccount;
  const from = [addMonths(month, -11), began, addMonths(month, -1)].sort()[1];

  const [series, monthly, spend, recent, recurring] = await Promise.all([
    netWorthSeries(user.id, netWorth, from, month),
    monthlyTotals(user.id, addMonths(month, -5), month),
    categorySpend(user.id, month),
    listTransactions(user.id, { limit: 8 }),
    listRecurring(user.id),
  ]);

  return (
    <MoneyProvider {...providerProps} initialTransaction={draftFromParam(params.add)}>
      <MoneyOverview
        netWorth={netWorth}
        netWorthSeries={series}
        monthly={monthly}
        categorySpend={spend}
        recent={recent}
        recurring={recurring}
      />
    </MoneyProvider>
  );
}
