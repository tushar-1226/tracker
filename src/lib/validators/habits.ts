import { z } from "zod";
import type { Frequency } from "@/lib/habits/stats";

const frequencySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }),
  z.object({
    kind: z.literal("weekdays"),
    days: z.array(z.coerce.number().int().min(0).max(6)).min(1, { error: "Pick at least one day" }),
  }),
  z.object({ kind: z.literal("weekly"), times: z.coerce.number().int().min(1).max(7) }),
]);

export const habitSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Give it a name" }).max(60),
    icon: z.string().trim().min(1).max(40).default("circle"),
    type: z.enum(["check", "count", "duration", "quit"]),
    target: z.coerce.number().positive({ error: "Must be above 0" }).max(100_000).optional(),
    unit: z.string().trim().max(20).optional(),
    frequency: frequencySchema,
  })
  .transform((v) => {
    const measured = v.type === "count" || v.type === "duration";
    return {
      ...v,
      target: measured ? (v.target ?? 1) : 1,
      unit: measured ? v.unit || (v.type === "duration" ? "min" : null) : null,
      // Quit habits are tracked every day.
      frequency: (v.type === "quit" ? { kind: "daily" } : v.frequency) as Frequency,
    };
  });

/** Turns the habit form's FormData into the shape `habitSchema` expects. */
export function habitFormInput(formData: FormData) {
  const kind = formData.get("freqKind");
  return {
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
    type: formData.get("type"),
    target: formData.get("target") || undefined,
    unit: formData.get("unit") || undefined,
    frequency:
      kind === "weekdays"
        ? { kind, days: formData.getAll("days") }
        : kind === "weekly"
          ? { kind, times: formData.get("times") }
          : { kind: "daily" },
  };
}

export type HabitFormState =
  | { ok?: boolean; errors?: Record<string, string[] | undefined>; message?: string }
  | undefined;
