"use client";

import { ArrowLeft, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { MonthNav } from "@/components/module/month-nav";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { type MonthKey, monthOf } from "@/lib/money/math";
import { cn } from "@/lib/utils";
import { useMoney } from "./money-context";
import { TransactionList, type TxnRow } from "./transaction-list";

const selectClass =
  "h-9 rounded-full border bg-transparent px-3 text-xs text-foreground outline-none transition-colors hover:bg-subtle focus:border-foreground";

export function TransactionsView({ month, txns }: { month: MonthKey; txns: TxnRow[] }) {
  const { accounts, categories, money, today, openTransaction } = useMoney();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };
  const hrefForMonth = (m: MonthKey) => {
    const next = new URLSearchParams(params);
    next.set("month", m);
    return `${pathname}?${next}`;
  };

  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const filtered = ["type", "account", "category", "q"].some((k) => params.get(k));

  return (
    <>
      <Reveal>
        <Link href="/money" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Money
        </Link>
      </Reveal>
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Transactions</h1>
        <Button onClick={() => openTransaction()}>
          <Plus /> Add
        </Button>
      </Reveal>

      {/* Filters: one row, above everything they scope. */}
      <Reveal className="mb-6 flex flex-wrap items-center gap-2">
        <MonthNav month={month} max={monthOf(today)} href={hrefForMonth} />
        <Segmented
          className="w-full sm:w-auto"
          value={(params.get("type") as "income" | "expense" | "transfer") ?? "all"}
          onChange={(v) => setParam("type", v === "all" ? null : v)}
          options={[
            { value: "all", label: "All" },
            { value: "expense", label: "Spent" },
            { value: "income", label: "Income" },
            { value: "transfer", label: "Transfers" },
          ]}
        />
        <select aria-label="Account" className={selectClass} value={params.get("account") ?? ""} onChange={(e) => setParam("account", e.target.value || null)}>
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select aria-label="Category" className={selectClass} value={params.get("category") ?? ""} onChange={(e) => setParam("category", e.target.value || null)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", q.trim() || null);
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" />
          <input
            aria-label="Search notes"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes"
            className={cn(selectClass, "w-40 pl-8")}
          />
        </form>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace(`${pathname}?month=${month}`, { scroll: false }));
            }}
          >
            <X /> Clear
          </Button>
        )}
      </Reveal>

      <div className={cn("grid gap-4 transition-opacity md:grid-cols-3", pending && "opacity-60")}>
        <Card className="md:order-2">
          <dl className="space-y-4">
            {[
              ["In", money(income)],
              ["Out", money(expense)],
              ["Net", `${income - expense < 0 ? "−" : ""}${money(Math.abs(income - expense))}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="text-xl font-semibold tracking-tight">{v}</dd>
              </div>
            ))}
            <p className="border-t pt-4 text-xs text-muted">
              {txns.length} transaction{txns.length === 1 ? "" : "s"}
            </p>
          </dl>
        </Card>
        <Card className="md:order-1 md:col-span-2">
          <div className="-mx-2">
            <TransactionList
              txns={txns}
              empty={<p className="py-16 text-center text-sm text-muted">{filtered ? "Nothing matches these filters." : "No transactions this month."}</p>}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
