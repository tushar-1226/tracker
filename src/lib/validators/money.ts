import { z } from "zod";
import { isDay } from "@/lib/dates";
import { parseAmount } from "@/lib/money/math";

const amount = z.unknown().transform((v, ctx) => {
  const minor = parseAmount(v);
  if (minor === null) {
    ctx.addIssue({ code: "custom", message: "Enter an amount" });
    return z.NEVER;
  }
  return minor;
});

const day = z.string().refine(isDay, { error: "Pick a date" });
const optionalId = z
  .string()
  .optional()
  .transform((v) => v || null);

export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount,
    accountId: z.string().min(1, { error: "Pick an account" }),
    toAccountId: optionalId,
    categoryId: optionalId,
    date: day,
    note: z
      .string()
      .trim()
      .max(140)
      .optional()
      .transform((v) => v || null),
    repeat: z.enum(["none", "weekly", "monthly", "yearly"]).default("none"),
  })
  .superRefine((v, ctx) => {
    if (v.type === "transfer") {
      if (!v.toAccountId) ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Pick where it goes" });
      else if (v.toAccountId === v.accountId)
        ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Pick a different account" });
    }
  })
  .transform((v) => ({
    ...v,
    toAccountId: v.type === "transfer" ? v.toAccountId : null,
    categoryId: v.type === "transfer" ? null : v.categoryId,
  }));

export const accountSchema = z.object({
  name: z.string().trim().min(1, { error: "Name it" }).max(40),
  type: z.enum(["cash", "bank", "card", "savings", "investment", "loan"]),
  balance: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v?.trim()) return 0;
      const negative = v.trim().startsWith("-");
      const minor = parseAmount(v.replace(/^-/, ""));
      if (minor === null && Number(v) !== 0) {
        ctx.addIssue({ code: "custom", message: "Enter an amount" });
        return z.NEVER;
      }
      return (minor ?? 0) * (negative ? -1 : 1);
    }),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, { error: "Name it" }).max(40),
  kind: z.enum(["income", "expense"]),
  icon: z.string().trim().min(1).max(40).default("circle"),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, { error: "Name your goal" }).max(60),
  icon: z.string().trim().min(1).max(40).default("piggy-bank"),
  target: amount,
  deadline: z
    .string()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || isDay(v), { error: "Pick a date" }),
});

export type FormState = { ok?: boolean; errors?: Record<string, string[] | undefined>; message?: string } | undefined;
