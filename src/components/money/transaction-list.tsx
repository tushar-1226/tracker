"use client";

import { ArrowLeftRight, Repeat } from "lucide-react";
import { motion } from "motion/react";
import { type Day, addDays, toDate } from "@/lib/dates";
import { netEffect } from "@/lib/money/math";
import { cn } from "@/lib/utils";
import type { listTransactions } from "@/server/queries/money";
import { CategoryIcon } from "./icons";
import { useMoney } from "./money-context";

export type TxnRow = Awaited<ReturnType<typeof listTransactions>>[number];

function dayHeading(day: Day, today: Day) {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  return toDate(day).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: day.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
    timeZone: "UTC",
  });
}

/** Transactions grouped by day; tap a row to edit. */
export function TransactionList({ txns, empty }: { txns: TxnRow[]; empty?: React.ReactNode }) {
  const { today, money, account, category, openTransaction } = useMoney();
  if (!txns.length) return <>{empty}</>;

  const groups = new Map<Day, TxnRow[]>();
  for (const t of txns) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);

  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([day, rows]) => {
        const net = rows.reduce((s, t) => s + netEffect(t), 0);
        return (
          <section key={day}>
            <div className="mb-1 flex items-baseline justify-between px-2 text-xs text-muted">
              <span>{dayHeading(day, today)}</span>
              {net !== 0 && <span className="tabular-nums">{money(net, { sign: true })}</span>}
            </div>
            <ul>
              {rows.map((t, i) => {
                const cat = category(t.categoryId);
                const from = account(t.accountId);
                const to = account(t.toAccountId);
                const title = t.type === "transfer" ? "Transfer" : (cat?.name ?? "Uncategorised");
                return (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.02 }}
                  >
                    <button
                      type="button"
                      data-cursor-label="Edit"
                      onClick={() => openTransaction(t)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-subtle"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-background">
                        {t.type === "transfer" ? <ArrowLeftRight className="size-4" /> : <CategoryIcon name={cat?.icon} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate text-sm">
                          {t.note || title}
                          {t.recurringId && <Repeat className="size-3 shrink-0 text-muted" aria-label="Repeating" />}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {t.note ? `${title} · ` : ""}
                          {t.type === "transfer" ? `${from?.name ?? "?"} → ${to?.name ?? "?"}` : from?.name}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-medium tabular-nums",
                          t.type === "transfer" && "text-muted",
                        )}
                      >
                        {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                        {money(t.amount)}
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
