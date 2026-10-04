"use client";

import { Pause, Play, Repeat, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { toDate, formatDate } from "@/lib/dates";
import { monthlyEquivalent } from "@/lib/money/math";
import { cn } from "@/lib/utils";
import { deleteRecurring, setRecurringActive } from "@/server/actions/money";
import type { listRecurring } from "@/server/queries/money";
import { CategoryIcon } from "./icons";
import { useMoney } from "./money-context";

type Rule = Awaited<ReturnType<typeof listRecurring>>[number];
const EVERY = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" } as const;

export function RecurringList({ rules }: { rules: Rule[] }) {
  const { money, category } = useMoney();
  const [pending, startTransition] = useTransition();
  const monthlyOut = rules
    .filter((r) => r.active && r.type === "expense")
    .reduce((s, r) => s + monthlyEquivalent(r.amount, r.every), 0);

  return (
    <Card className="h-full">
      <CardLabel>Repeating</CardLabel>
      <p className="mt-1 text-sm text-muted">
        <span className="text-foreground tabular-nums">{money(monthlyOut)}</span> a month in bills & subscriptions
      </p>
      {rules.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-foreground/[0.035] px-4 py-6 text-center text-sm text-muted">
          Choose “Repeat” when adding rent, salary or a subscription.
        </p>
      ) : (
        <ul className="mt-4 -mx-2">
          {rules.map((r) => {
            const cat = category(r.categoryId);
            return (
              <li key={r.id} className={cn("group flex items-center gap-3 rounded-2xl px-2 py-2", !r.active && "opacity-50")}>
                {r.type === "transfer" ? <Repeat className="size-4 text-muted" /> : <CategoryIcon name={cat?.icon} className="text-muted" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{r.note || cat?.name || "Transfer"}</span>
                  <span className="block text-xs text-muted">
                    {EVERY[r.every]} ·{" "}
                    {r.active
                      ? `next ${formatDate(toDate(r.nextDate), { day: "numeric", month: "short", timeZone: "UTC" })}`
                      : "paused"}
                  </span>
                </span>
                <span className="text-sm tabular-nums">
                  {r.type === "income" ? "+" : ""}
                  {money(r.amount)}
                </span>
                <span className="flex opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label={r.active ? "Pause" : "Resume"}
                    disabled={pending}
                    onClick={() => startTransition(() => setRecurringActive(r.id, !r.active))}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-foreground"
                  >
                    {r.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Stop repeating"
                    disabled={pending}
                    onClick={() => startTransition(() => deleteRecurring(r.id))}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-foreground"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
