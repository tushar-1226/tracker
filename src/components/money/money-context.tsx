"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { Day } from "@/lib/dates";
import { type AccountType, type TxnType, formatMoney } from "@/lib/money/math";
import { AccountForm } from "./account-form";
import { TransactionForm } from "./transaction-form";

export type AccountLite = { id: string; name: string; type: AccountType; balance: number; openingBalance: number; archived: boolean };
export type CategoryLite = { id: string; name: string; kind: "income" | "expense"; icon: string };
export type TxnDraft = {
  id?: string;
  type?: TxnType;
  amount?: number;
  accountId?: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  date?: Day;
  note?: string | null;
  recurringId?: string | null;
};

type Ctx = {
  accounts: AccountLite[];
  categories: CategoryLite[];
  currency: string;
  today: Day;
  money: (minor: number, opts?: Parameters<typeof formatMoney>[2]) => string;
  account: (id: string | null | undefined) => AccountLite | undefined;
  category: (id: string | null | undefined) => CategoryLite | undefined;
  openTransaction: (draft?: TxnDraft) => void;
  openAccount: (account?: AccountLite) => void;
};

const MoneyContext = createContext<Ctx | null>(null);

export function useMoney() {
  const ctx = useContext(MoneyContext);
  if (!ctx) throw new Error("useMoney must be used inside <MoneyProvider>");
  return ctx;
}

export function MoneyProvider({
  accounts,
  categories,
  currency,
  today,
  initialTransaction,
  children,
}: {
  accounts: AccountLite[];
  categories: CategoryLite[];
  currency: string;
  today: Day;
  initialTransaction?: TxnDraft;
  children: React.ReactNode;
}) {
  const [txn, setTxn] = useState<{ open: boolean; draft?: TxnDraft; key: number }>({
    open: !!initialTransaction,
    draft: initialTransaction,
    key: 0,
  });
  const router = useRouter();
  const pathname = usePathname();
  const closeTxn = () => {
    setTxn((s) => ({ ...s, open: false }));
    // Drop ?add=… so a reload doesn't reopen the dialog.
    if (initialTransaction) router.replace(pathname, { scroll: false });
  };
  const [acct, setAcct] = useState<{ open: boolean; account?: AccountLite; key: number }>({ open: false, key: 0 });

  const openTransaction = useCallback((draft?: TxnDraft) => setTxn((s) => ({ open: true, draft, key: s.key + 1 })), []);
  const openAccount = useCallback((account?: AccountLite) => setAcct((s) => ({ open: true, account, key: s.key + 1 })), []);

  const value = useMemo<Ctx>(() => {
    const accountById = new Map(accounts.map((a) => [a.id, a]));
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    return {
      accounts,
      categories,
      currency,
      today,
      money: (minor, opts) => formatMoney(minor, currency, opts),
      account: (id) => (id ? accountById.get(id) : undefined),
      category: (id) => (id ? categoryById.get(id) : undefined),
      openTransaction,
      openAccount,
    };
  }, [accounts, categories, currency, today, openTransaction, openAccount]);

  return (
    <MoneyContext.Provider value={value}>
      {children}
      <Dialog open={txn.open} onOpenChange={(open) => (open ? setTxn((s) => ({ ...s, open })) : closeTxn())}>
        <TransactionForm key={txn.key} draft={txn.draft} onDone={closeTxn} />
      </Dialog>
      <Dialog open={acct.open} onOpenChange={(open) => setAcct((s) => ({ ...s, open }))}>
        <AccountForm key={acct.key} account={acct.account} onDone={() => setAcct((s) => ({ ...s, open: false }))} />
      </Dialog>
    </MoneyContext.Provider>
  );
}
