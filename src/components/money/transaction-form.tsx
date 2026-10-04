"use client";

import { LoaderCircle, Repeat, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { addDays } from "@/lib/dates";
import { type TxnType, currencySymbol } from "@/lib/money/math";
import type { FormState } from "@/lib/validators/money";
import { cn } from "@/lib/utils";
import { deleteTransaction, saveTransaction } from "@/server/actions/money";
import { ACCOUNT_ICONS, CategoryIcon } from "./icons";
import { type TxnDraft, useMoney } from "./money-context";

export function TransactionForm({ draft, onDone }: { draft?: TxnDraft; onDone: () => void }) {
  const { accounts, categories, currency, today } = useMoney();
  const editing = !!draft?.id;
  const active = accounts.filter((a) => !a.archived || a.id === draft?.accountId || a.id === draft?.toAccountId);

  const [type, setType] = useState<TxnType>(draft?.type ?? "expense");
  const [categoryId, setCategoryId] = useState(draft?.categoryId ?? "");
  const [accountId, setAccountId] = useState(draft?.accountId ?? active[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(draft?.toAccountId ?? "");
  const [date, setDate] = useState(draft?.date ?? today);
  const [repeat, setRepeat] = useState<"none" | "weekly" | "monthly" | "yearly">("none");
  const [deleting, startDelete] = useTransition();

  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await saveTransaction(prev, fd);
    if (res?.ok) onDone();
    return res;
  }, undefined);
  const err = (k: string) => state?.errors?.[k]?.[0];

  const kindCategories = categories.filter((c) => c.kind === (type === "income" ? "income" : "expense"));
  const switchType = (t: TxnType) => {
    setType(t);
    if (!categories.some((c) => c.id === categoryId && c.kind === t)) setCategoryId("");
  };
  const accountOptions = active.map((a) => {
    const Icon = ACCOUNT_ICONS[a.type];
    return { value: a.id, label: a.name, icon: <Icon /> };
  });

  return (
    <DialogContent title={editing ? "Edit transaction" : "Add transaction"}>
      <form action={action} className="space-y-6">
        {draft?.id && <input type="hidden" name="id" value={draft.id} />}
        <Segmented
          name="type"
          value={type}
          onChange={switchType}
          options={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
            { value: "transfer", label: "Transfer" },
          ]}
        />

        <div className="flex flex-col items-center py-2">
          <label htmlFor="txn-amount" className="sr-only">
            Amount
          </label>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl text-muted">{currencySymbol(currency)}</span>
            <input
              id="txn-amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              autoFocus={!editing}
              placeholder="0"
              defaultValue={draft?.amount ? String(draft.amount / 100) : ""}
              aria-invalid={!!err("amount")}
              className="w-48 bg-transparent text-center text-5xl font-medium tracking-tight outline-none placeholder:text-border"
            />
          </div>
          {err("amount") && <p className="mt-1 text-xs text-muted">— {err("amount")}</p>}
        </div>

        {type !== "transfer" && (
          <div className="space-y-2">
            <Label>Category</Label>
            <Chips
              name="categoryId"
              value={categoryId}
              onChange={setCategoryId}
              options={kindCategories.map((c) => ({ value: c.id, label: c.name, icon: <CategoryIcon name={c.icon} /> }))}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>{type === "transfer" ? "From" : "Account"}</Label>
          <Chips name="accountId" value={accountId} onChange={setAccountId} options={accountOptions} />
          {err("accountId") && <p className="text-xs text-muted">— {err("accountId")}</p>}
        </div>

        {type === "transfer" && (
          <div className="space-y-2">
            <Label>To</Label>
            <Chips
              name="toAccountId"
              value={toAccountId}
              onChange={setToAccountId}
              options={accountOptions.filter((o) => o.value !== accountId)}
            />
            {err("toAccountId") && <p className="text-xs text-muted">— {err("toAccountId")}</p>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="txn-date">Date</Label>
            <div className="flex gap-1.5">
              {[
                ["Today", today],
                ["Yesterday", addDays(today, -1)],
              ].map(([label, d]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDate(d)}
                  className={cn(
                    "h-11 rounded-full bg-subtle px-3 text-xs font-medium transition-colors",
                    date === d ? "bg-foreground text-background" : "text-muted hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
              <Input
                id="txn-date"
                name="date"
                type="date"
                value={date}
                max={addDays(today, 365)}
                onChange={(e) => setDate(e.target.value)}
                className="min-w-0 flex-1 px-3"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="txn-note">Note</Label>
            <Input id="txn-note" name="note" defaultValue={draft?.note ?? ""} placeholder="Optional" maxLength={140} />
          </div>
        </div>

        {!editing ? (
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Repeat className="size-3" /> Repeat
            </Label>
            <Segmented
              name="repeat"
              value={repeat}
              onChange={setRepeat}
              options={[
                { value: "none", label: "Never" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
          </div>
        ) : (
          draft?.recurringId && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Repeat className="size-3" /> Created by a repeating rule — edits apply to this one only.
            </p>
          )
        )}

        {state?.message && <p className="rounded-xl bg-foreground/[0.035] px-4 py-3 text-sm">{state.message}</p>}

        <div className="flex gap-2">
          {editing && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              aria-label="Delete transaction"
              disabled={deleting}
              onClick={() =>
                startDelete(async () => {
                  await deleteTransaction(draft.id!);
                  onDone();
                })
              }
            >
              <Trash2 />
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : editing ? "Save changes" : "Add"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
