import { type Day, addDays, diffDays, toDate, formatDate } from "@/lib/dates";

export type AccountType = "cash" | "bank" | "card" | "savings" | "investment" | "loan";
export type TxnType = "income" | "expense" | "transfer";
export type RepeatEvery = "weekly" | "monthly" | "yearly";

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Accounts where the balance is normally money owed. */
export const LIABILITY_TYPES: AccountType[] = ["card", "loan"];

// ---------- Formatting & parsing ----------

export function formatMoney(
  minor: number,
  currency = "INR",
  opts: { compact?: boolean; sign?: boolean; decimals?: boolean } = {},
) {
  const major = minor / 100;
  const fraction = opts.compact ? 1 : opts.decimals === false || Number.isInteger(major) ? 0 : 2;
  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: fraction,
    minimumFractionDigits: opts.compact ? 0 : fraction,
    signDisplay: opts.sign ? "exceptZero" : "auto",
  });
  return fmt.format(major);
}

export function currencySymbol(currency = "INR") {
  return (
    new Intl.NumberFormat("en-IN", { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

/** "1,234.5" → 123450. Returns null for anything that isn't a positive amount. */
export function parseAmount(input: unknown): number | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const cleaned = String(input).replace(/[,\s₹$€£]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const minor = Math.round(Number(cleaned) * 100);
  return minor > 0 && minor <= 1e13 ? minor : null;
}

// ---------- Balances ----------

type TxnLike = { type: TxnType; amount: number; accountId: string; toAccountId: string | null };

export function accountBalances(
  accounts: { id: string; openingBalance: number }[],
  txns: TxnLike[],
): Map<string, number> {
  const balances = new Map(accounts.map((a) => [a.id, a.openingBalance]));
  const add = (id: string | null, n: number) => {
    if (id && balances.has(id)) balances.set(id, balances.get(id)! + n);
  };
  for (const t of txns) {
    if (t.type === "income") add(t.accountId, t.amount);
    else if (t.type === "expense") add(t.accountId, -t.amount);
    else {
      add(t.accountId, -t.amount);
      add(t.toAccountId, t.amount);
    }
  }
  return balances;
}

/** Effect of a transaction on total net worth (transfers are neutral). */
export function netEffect(t: { type: TxnType; amount: number }) {
  return t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0;
}

// ---------- Months ----------

export type MonthKey = string; // "YYYY-MM"

export const monthOf = (day: Day): MonthKey => day.slice(0, 7);

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function daysInMonth(month: MonthKey) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthRange(month: MonthKey): { first: Day; last: Day } {
  return { first: `${month}-01`, last: `${month}-${String(daysInMonth(month)).padStart(2, "0")}` };
}

export function monthLabel(month: MonthKey, style: "short" | "long" = "short") {
  return formatDate(toDate(`${month}-01`), {
    month: style,
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export const isMonthKey = (v: unknown): v is MonthKey => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

// ---------- Recurring ----------

/** The n-th occurrence (0 = start). Monthly/yearly dates clamp to the month's last day. */
export function occurrence(start: Day, every: RepeatEvery, n: number): Day {
  if (every === "weekly") return addDays(start, 7 * n);
  const startDay = Number(start.slice(8));
  const month = addMonths(monthOf(start), every === "monthly" ? n : 12 * n);
  const day = Math.min(startDay, daysInMonth(month));
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** All occurrences in [from, to], plus the first one after `to`. */
export function occurrencesUntil(start: Day, every: RepeatEvery, from: Day, to: Day) {
  const dates: Day[] = [];
  let n = 0;
  let d = start;
  while (d < from) d = occurrence(start, every, ++n);
  while (d <= to) {
    dates.push(d);
    d = occurrence(start, every, ++n);
  }
  return { dates, next: d };
}

export function monthlyEquivalent(amount: number, every: RepeatEvery) {
  if (every === "weekly") return Math.round((amount * 52) / 12);
  if (every === "yearly") return Math.round(amount / 12);
  return amount;
}

// ---------- Budget & goals ----------

/** What can be spent per day for the rest of the month (today included). */
export function safeToSpend(remaining: number, today: Day, month: MonthKey) {
  const { last } = monthRange(month);
  const daysLeft = diffDays(today, last) + 1;
  if (daysLeft <= 0) return 0;
  return Math.max(0, Math.floor(remaining / daysLeft));
}

/** Months until a goal is reached at the recent saving pace (null if no pace). */
export function goalEta(
  saved: number,
  target: number,
  contributions: { amount: number; date: Day }[],
  today: Day,
) {
  if (saved >= target) return 0;
  const since = addDays(today, -89);
  const recent = contributions.filter((c) => c.date >= since).reduce((s, c) => s + c.amount, 0);
  const perMonth = recent / 3;
  if (perMonth <= 0) return null;
  return Math.ceil((target - saved) / perMonth);
}

/** Which budget alert a new expense triggers, if any: only the first crossing of 80% or 100%. */
export function budgetCrossing(before: number, after: number, limit: number): "over" | "near" | null {
  if (limit <= 0) return null;
  if (before < limit && after >= limit) return "over";
  if (before < limit * 0.8 && after >= limit * 0.8) return "near";
  return null;
}
