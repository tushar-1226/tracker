"use client";

import { LoaderCircle, Minus, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { WEEKDAY_SHORT } from "@/lib/dates";
import type { Frequency, HabitType } from "@/lib/habits/stats";
import type { HabitView } from "@/lib/habits/view";
import { cn } from "@/lib/utils";
import { saveHabit } from "@/server/actions/habits";
import { HABIT_ICONS } from "./icons";

export type HabitDraft = Partial<Pick<HabitView, "id" | "name" | "icon" | "type" | "target" | "unit" | "frequency">>;

export const HABIT_TEMPLATES: (HabitDraft & { name: string })[] = [
  { name: "Drink water", icon: "droplet", type: "count", target: 8, unit: "glasses" },
  { name: "Read", icon: "book-open", type: "duration", target: 20, unit: "min" },
  { name: "Workout", icon: "dumbbell", type: "check", frequency: { kind: "weekly", times: 4 } },
  { name: "Meditate", icon: "brain", type: "duration", target: 10, unit: "min" },
  { name: "Walk", icon: "footprints", type: "count", target: 8000, unit: "steps" },
  { name: "No sugar", icon: "apple", type: "quit" },
];

const TYPE_HINT: Record<HabitType, string> = {
  check: "Done or not done — simple.",
  count: "Hit a number, like 8 glasses of water.",
  duration: "Reach a number of minutes.",
  quit: "Break a habit. Log a slip when it happens; we count clean days.",
};

// Monday-first display order.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Create / edit form, rendered inside a <Dialog>. */
export function HabitForm({ draft, onDone }: { draft?: HabitDraft; onDone: () => void }) {
  const editing = !!draft?.id;
  const [type, setType] = useState<HabitType>(draft?.type ?? "check");
  const [icon, setIcon] = useState(draft?.icon ?? "sparkles");
  const initialFreq: Frequency = draft?.frequency ?? { kind: "daily" };
  const [freqKind, setFreqKind] = useState<Frequency["kind"]>(initialFreq.kind);
  const [days, setDays] = useState<number[]>(initialFreq.kind === "weekdays" ? initialFreq.days : [1, 2, 3, 4, 5]);
  const [times, setTimes] = useState(initialFreq.kind === "weekly" ? initialFreq.times : 3);

  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveHabit>>, fd: FormData) => {
    const result = await saveHabit(prev, fd);
    if (result?.ok) onDone();
    return result;
  }, undefined);
  const err = (k: string) => state?.errors?.[k]?.[0];

  const measured = type === "count" || type === "duration";

  return (
    <DialogContent
      title={editing ? "Edit habit" : "New habit"}
      description={editing ? undefined : "Small, specific and daily works best."}
    >
      <form action={action} className="space-y-6">
        {draft?.id && <input type="hidden" name="id" value={draft.id} />}
        <input type="hidden" name="icon" value={icon} />

        <div className="space-y-2">
          <Label htmlFor="habit-name">Name</Label>
          <Input
            id="habit-name"
            name="name"
            defaultValue={draft?.name}
            placeholder="e.g. Read before bed"
            autoFocus={!editing}
            aria-invalid={!!err("name")}
          />
          {err("name") && <p className="text-xs text-muted">— {err("name")}</p>}
        </div>

        <div className="space-y-2">
          <Label>Icon</Label>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.entries(HABIT_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                aria-label={key}
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl border transition-colors",
                  icon === key ? "border-foreground bg-foreground text-background" : "border-transparent hover:bg-subtle",
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Segmented
            name="type"
            value={type}
            onChange={setType}
            options={[
              { value: "check", label: "Yes / No" },
              { value: "count", label: "Count" },
              { value: "duration", label: "Duration" },
              { value: "quit", label: "Quit" },
            ]}
          />
          <p className="text-xs text-muted">{TYPE_HINT[type]}</p>
        </div>

        {measured && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="habit-target">Daily goal</Label>
              <Input
                id="habit-target"
                name="target"
                type="number"
                inputMode="decimal"
                min={1}
                defaultValue={draft?.target ?? (type === "duration" ? 20 : 8)}
                aria-invalid={!!err("target")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="habit-unit">Unit</Label>
              {type === "duration" ? (
                <>
                  <input type="hidden" name="unit" value="min" />
                  <Input id="habit-unit" value="minutes" disabled readOnly />
                </>
              ) : (
                <Input id="habit-unit" name="unit" defaultValue={draft?.unit ?? ""} placeholder="glasses, pages…" />
              )}
            </div>
            {err("target") && <p className="col-span-2 text-xs text-muted">— {err("target")}</p>}
          </div>
        )}

        {type !== "quit" && (
          <div className="space-y-3">
            <Label>Frequency</Label>
            <Segmented
              name="freqKind"
              value={freqKind}
              onChange={setFreqKind}
              options={[
                { value: "daily", label: "Every day" },
                { value: "weekdays", label: "Specific days" },
                { value: "weekly", label: "Per week" },
              ]}
            />
            {freqKind === "weekdays" && (
              <div className="grid grid-cols-7 gap-1.5">
                {WEEK_ORDER.map((d) => {
                  const on = days.includes(d);
                  return (
                    <label
                      key={d}
                      className={cn(
                        "flex h-10 items-center justify-center rounded-xl border text-xs font-medium transition-colors",
                        on ? "border-foreground bg-foreground text-background" : "text-muted hover:bg-subtle",
                      )}
                    >
                      <input
                        type="checkbox"
                        name="days"
                        value={d}
                        checked={on}
                        onChange={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                        className="sr-only"
                      />
                      {WEEKDAY_SHORT[d].slice(0, 2)}
                    </label>
                  );
                })}
              </div>
            )}
            {freqKind === "weekly" && (
              <div className="flex items-center justify-between rounded-2xl border px-4 py-2">
                <input type="hidden" name="times" value={times} />
                <span className="text-sm">
                  <span className="tabular text-lg font-medium">{times}</span> times a week
                </span>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label="Fewer" onClick={() => setTimes(Math.max(1, times - 1))}>
                    <Minus />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="More" onClick={() => setTimes(Math.min(7, times + 1))}>
                    <Plus />
                  </Button>
                </div>
              </div>
            )}
            {err("frequency") && <p className="text-xs text-muted">— {err("frequency")}</p>}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : editing ? "Save changes" : "Create habit"}
        </Button>
      </form>
    </DialogContent>
  );
}
