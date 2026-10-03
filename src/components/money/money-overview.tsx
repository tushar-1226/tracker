"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { BarList } from "@/components/charts/bar-list";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/column-chart";
import { Legend } from "@/components/charts/legend";
import { LineChart } from "@/components/charts/line-chart";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { type MonthKey, monthLabel } from "@/lib/money/math";
import { AccountsGrid } from "./accounts-grid";
import { CategoryIcon } from "./icons";
import { useMoney } from "./money-context";
import { RecurringList } from "./recurring-list";
import { TransactionList, type TxnRow } from "./transaction-list";
import type { listRecurring } from "@/server/queries/money";

export function MoneyOverview({
  netWorth,
  netWorthSeries,
  monthly,
  categorySpend,
  recent,
  recurring,
}: {
  netWorth: number;
  netWorthSeries: { month: MonthKey; value: number }[];
  monthly: { month: MonthKey; income: number; expense: number }[];
  categorySpend: { categoryId: string | null; total: number }[];
  recent: TxnRow[];
  recurring: Awaited<ReturnType<typeof listRecurring>>;
}) {
  const { money, category, openTransaction, openAccount } = useMoney();
  const compact = (v: number) => money(v, { compact: true });
  const thisMonth = monthly[monthly.length - 1];
  const saved = thisMonth.income - thisMonth.expense;
  const rate = thisMonth.income > 0 ? saved / thisMonth.income : null;
  const lastMonthNW = netWorthSeries[netWorthSeries.length - 2]?.value ?? netWorth;
  const delta = netWorth - lastMonthNW;

  const spend = [...categorySpend]
    .sort((a, b) => b.total - a.total)
    .map((c) => {
      const cat = category(c.categoryId);
      return { key: c.categoryId ?? "none", label: cat?.name ?? "Uncategorised", value: c.total, icon: <CategoryIcon name={cat?.icon} className="text-muted" /> };
    });
  const spendTotal = spend.reduce((s, c) => s + c.value, 0);

  return (
    <>
      <PageHeader
        title="Money"
        description="Accounts, cash flow and net worth."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openAccount()}>
              Add account
            </Button>
            <Magnetic>
              <Button onClick={() => openTransaction()} data-cursor-label="Add">
                <Plus /> Add transaction
              </Button>
            </Magnetic>
          </div>
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-3">
        <StaggerItem className="md:col-span-2">
          <ChartCard
            title="Net worth"
            className="h-full"
            subtitle={
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  {netWorth < 0 ? "−" : ""}
                  {money(Math.abs(netWorth))}
                </span>
                {delta !== 0 && (
                  <span className="inline-flex items-center gap-0.5 text-sm">
                    {delta > 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    {money(Math.abs(delta))} this month
                  </span>
                )}
              </span>
            }
            table={{
              columns: ["Month", "Net worth"],
              rows: netWorthSeries.map((p) => [monthLabel(p.month, "long"), money(p.value)]),
            }}
          >
            <LineChart
              ariaLabel="Net worth over the last 12 months"
              labels={netWorthSeries.map((p) => monthLabel(p.month))}
              titles={netWorthSeries.map((p) => monthLabel(p.month, "long"))}
              series={[{ name: "Net worth", tone: "fg", values: netWorthSeries.map((p) => p.value), area: true }]}
              format={(v) => money(v)}
              formatAxis={compact}
              height={200}
            />
          </ChartCard>
        </StaggerItem>

        <StaggerItem>
          <Card className="flex h-full flex-col gap-6">
            <CardLabel>{monthLabel(thisMonth.month, "long")}</CardLabel>
            <Figure label="Income" value={money(thisMonth.income)} />
            <Figure label="Spent" value={money(thisMonth.expense)} />
            <Figure label="Saved" value={`${saved < 0 ? "−" : ""}${money(Math.abs(saved))}`} />
            <div className="mt-auto space-y-2">
              <div className="flex justify-between text-xs text-muted">
                <span>Savings rate</span>
                <span className="text-foreground tabular-nums">{rate === null ? "—" : `${Math.round(rate * 100)}%`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-none bg-hairline">
                <div
                  className="h-full rounded-none bg-foreground transition-[width] duration-1000 ease-out-expo"
                  style={{ width: `${Math.max(0, Math.min(1, rate ?? 0)) * 100}%` }}
                />
              </div>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>

      <Reveal className="mt-10 mb-4 flex items-baseline justify-between">
        <h2 className="border-t-2 border-foreground pt-3 text-2xl font-bold tracking-[-0.03em] uppercase">Accounts</h2>
      </Reveal>
      <AccountsGrid />

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Reveal className="md:col-span-2">
          <ChartCard
            title="Cash flow"
            subtitle="Last 6 months"
            className="h-full"
            legend={
              <Legend
                mark="rect"
                items={[
                  { name: "Income", tone: "fg" },
                  { name: "Spent", tone: "muted" },
                ]}
              />
            }
            table={{
              columns: ["Month", "Income", "Spent", "Saved"],
              rows: monthly.map((m) => [monthLabel(m.month, "long"), money(m.income), money(m.expense), money(m.income - m.expense)]),
            }}
          >
            <ColumnChart
              ariaLabel="Income and spending per month"
              labels={monthly.map((m) => monthLabel(m.month))}
              titles={monthly.map((m) => monthLabel(m.month, "long"))}
              series={[
                { name: "Income", tone: "fg", values: monthly.map((m) => m.income) },
                { name: "Spent", tone: "muted", values: monthly.map((m) => m.expense) },
              ]}
              format={(v) => money(v)}
              formatAxis={compact}
            />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.05}>
          <ChartCard
            title="Spending by category"
            subtitle={monthLabel(thisMonth.month, "long")}
            className="h-full"
            table={{
              columns: ["Category", "Spent", "Share"],
              rows: spend.map((s) => [s.label, money(s.value), `${Math.round((s.value / spendTotal) * 100)}%`]),
            }}
          >
            {spend.length ? (
              <BarList items={spend.slice(0, 6)} format={(v) => money(v)} />
            ) : (
              <p className="py-10 text-center text-sm text-muted">No spending yet this month.</p>
            )}
          </ChartCard>
        </Reveal>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Reveal className="md:col-span-2">
          <Card className="h-full">
            <div className="mb-3 flex items-center justify-between">
              <CardLabel>Recent</CardLabel>
              <Link
                href="/money/transactions"
                className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
              >
                All transactions <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="-mx-2">
              <TransactionList
                txns={recent}
                empty={
                  <button
                    type="button"
                    onClick={() => openTransaction()}
                    className="mx-2 flex h-32 w-[calc(100%-1rem)] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm text-muted transition-colors hover:bg-subtle hover:text-foreground"
                  >
                    <Plus className="size-5" />
                    Log your first transaction
                  </button>
                }
              />
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <RecurringList rules={recurring} />
        </Reveal>
      </div>
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-muted">{label}</span>
      <span className="truncate text-xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}
