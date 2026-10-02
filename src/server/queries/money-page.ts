import "server-only";
import type { TxnDraft } from "@/components/money/money-context";
import { getCurrentUser } from "@/lib/auth/dal";
import { listAccounts, listCategories, prepareMoney } from "./money";
import { getToday } from "@/server/today";

/** Shared setup for every money/budget page. */
export async function loadMoneyBase() {
  const user = await getCurrentUser();
  const today = await getToday();
  await prepareMoney(user.id, today);
  const [accounts, categories] = await Promise.all([listAccounts(user.id), listCategories(user.id)]);
  return {
    user,
    today,
    accounts,
    currency: user.settings.currency ?? "INR",
    providerProps: {
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: a.balance,
        openingBalance: a.openingBalance,
        archived: a.archivedAt !== null,
      })),
      categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, icon: c.icon })),
      currency: user.settings.currency ?? "INR",
      today,
    },
  };
}

/** `?add=expense|income|transfer` opens the add dialog (used by the command palette). */
export function draftFromParam(add: unknown): TxnDraft | undefined {
  return add === "expense" || add === "income" || add === "transfer" ? { type: add } : undefined;
}
