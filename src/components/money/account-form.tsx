"use client";

import { Archive, ArchiveRestore, LoaderCircle } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AccountType, LIABILITY_TYPES } from "@/lib/money/math";
import type { FormState } from "@/lib/validators/money";
import { saveAccount, setAccountArchived } from "@/server/actions/money";
import { ACCOUNT_ICONS, ACCOUNT_TYPE_LABEL } from "./icons";
import type { AccountLite } from "./money-context";

export function AccountForm({ account, onDone }: { account?: AccountLite; onDone: () => void }) {
  const [type, setType] = useState<AccountType>(account?.type ?? "bank");
  const [archiving, startArchive] = useTransition();
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await saveAccount(prev, fd);
    if (res?.ok) onDone();
    return res;
  }, undefined);
  const liability = LIABILITY_TYPES.includes(type);
  const opening = account ? Math.abs(account.openingBalance) / 100 : undefined;

  return (
    <DialogContent
      title={account ? "Edit account" : "New account"}
      description={account ? undefined : "Where your money lives — or what you owe."}
    >
      <form action={action} className="space-y-6">
        {account && <input type="hidden" name="id" value={account.id} />}
        <div className="space-y-2">
          <Label htmlFor="acct-name">Name</Label>
          <Input id="acct-name" name="name" defaultValue={account?.name} placeholder="e.g. HDFC Savings" autoFocus={!account} />
          {state?.errors?.name && <p className="text-xs text-muted">— {state.errors.name[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Chips
            name="type"
            value={type}
            onChange={setType}
            options={(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((t) => {
              const Icon = ACCOUNT_ICONS[t];
              return { value: t, label: ACCOUNT_TYPE_LABEL[t], icon: <Icon /> };
            })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acct-balance">{liability ? "Amount owed at start" : "Starting balance"}</Label>
          <Input
            id="acct-balance"
            name="balance"
            inputMode="decimal"
            defaultValue={opening || ""}
            placeholder="0"
          />
          <p className="text-xs text-muted">
            {account ? "The balance before any transactions you logged here." : "What it holds today. Transactions update it from here."}
          </p>
          {state?.errors?.balance && <p className="text-xs text-muted">— {state.errors.balance[0]}</p>}
        </div>
        <div className="flex gap-2">
          {account && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={archiving}
              onClick={() =>
                startArchive(async () => {
                  await setAccountArchived(account.id, !account.archived);
                  onDone();
                })
              }
            >
              {account.archived ? <ArchiveRestore /> : <Archive />}
              {account.archived ? "Restore" : "Archive"}
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : account ? "Save changes" : "Create account"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
