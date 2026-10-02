import type { Metadata } from "next";
import { MoneyProvider } from "@/components/money/money-context";
import { TransactionsView } from "@/components/money/transactions-view";
import { isMonthKey, monthOf } from "@/lib/money/math";
import { listTransactions } from "@/server/queries/money";
import { draftFromParam, loadMoneyBase } from "@/server/queries/money-page";

export const metadata: Metadata = { title: "Transactions" };

const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function TransactionsPage({ searchParams }: PageProps<"/money/transactions">) {
  const [{ user, today, providerProps }, params] = await Promise.all([loadMoneyBase(), searchParams]);
  const month = isMonthKey(params.month) && params.month <= monthOf(today) ? params.month : monthOf(today);
  const type = str(params.type);

  const txns = await listTransactions(user.id, {
    month,
    type: type === "income" || type === "expense" || type === "transfer" ? type : undefined,
    accountId: str(params.account),
    categoryId: str(params.category),
    q: str(params.q)?.slice(0, 60),
  });

  return (
    <MoneyProvider {...providerProps} initialTransaction={draftFromParam(params.add)}>
      <TransactionsView month={month} txns={txns} />
    </MoneyProvider>
  );
}
