"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { CardLabel } from "@/components/ui/card";
import { LIABILITY_TYPES } from "@/lib/money/math";
import { ACCOUNT_ICONS, ACCOUNT_TYPE_LABEL } from "./icons";
import { useMoney } from "./money-context";

export function AccountsGrid() {
  const { accounts, money, openAccount } = useMoney();
  const visible = accounts.filter((a) => !a.archived);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {visible.map((a, i) => {
        const Icon = ACCOUNT_ICONS[a.type];
        return (
          <motion.button
            key={a.id}
            type="button"
            data-cursor-label="Edit"
            onClick={() => openAccount(a)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between gap-6 rounded-3xl border bg-surface p-5 text-left transition-colors hover:bg-subtle"
          >
            <span className="flex items-center justify-between">
              <CardLabel className="truncate normal-case tracking-normal">{a.name}</CardLabel>
              <Icon className="size-4 shrink-0 text-muted" />
            </span>
            <span>
              <span className="block truncate text-2xl font-semibold tracking-tight">
                {a.balance < 0 ? "−" : ""}
                {money(Math.abs(a.balance))}
              </span>
              <span className="text-xs text-muted">
                {ACCOUNT_TYPE_LABEL[a.type]}
                {a.balance < 0 && LIABILITY_TYPES.includes(a.type) && " · owed"}
              </span>
            </span>
          </motion.button>
        );
      })}
      <button
        type="button"
        onClick={() => openAccount()}
        className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed text-sm text-muted transition-colors hover:bg-subtle hover:text-foreground"
      >
        <Plus className="size-5" />
        Add account
      </button>
    </div>
  );
}
