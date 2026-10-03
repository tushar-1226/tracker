"use client";

import { Archive, Check, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { Ring } from "@/components/charts/ring";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Day, diffDays } from "@/lib/dates";
import { type GoalMetric, METRIC_LABEL } from "@/lib/progress/goals";
import { cn } from "@/lib/utils";
import { addMilestone, archiveGoal, createGoal, deleteGoal, toggleMilestone } from "@/server/actions/progress";

export type GoalView = {
  id: string;
  title: string;
  metric: GoalMetric;
  target: number;
  baseline: number | null;
  deadline: string | null;
  completedAt: number | null;
  current: number | null;
  progress: number;
  milestones: { id: string; title: string; done: boolean }[];
};

type Lookups = {
  habits: { id: string; name: string }[];
  exercises: { id: string; name: string }[];
  skills: { id: string; name: string }[];
  savings: { id: string; name: string; target: number }[];
  latestWeight: number | null;
  netWorth: number;
};

function unitFor(metric: GoalMetric, units: string, currency: string) {
  switch (metric.type) {
    case "habit_streak":
      return "days";
    case "exercise_1rm":
    case "body_weight":
      return units;
    case "study_hours":
      return "h";
    case "books_year":
      return "books";
    case "savings_goal":
    case "net_worth":
      return currency;
    default:
      return "milestones";
  }
}

const fmt = (n: number | null) => (n === null ? "—" : Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toFixed(1));

export function GoalsView({ goals, lookups, today, units }: { goals: GoalView[]; lookups: Lookups; today: Day; units: string }) {
  const [form, setForm] = useState({ open: false, key: 0 });
  const active = goals.filter((g) => !g.completedAt);
  const done = goals.filter((g) => g.completedAt);
  const refName = (m: GoalMetric) =>
    m.type === "habit_streak"
      ? lookups.habits.find((h) => h.id === m.habitId)?.name
      : m.type === "exercise_1rm"
        ? lookups.exercises.find((e) => e.id === m.exerciseId)?.name
        : m.type === "study_hours"
          ? lookups.skills.find((s) => s.id === m.skillId)?.name
          : m.type === "savings_goal"
            ? lookups.savings.find((s) => s.id === m.goalId)?.name
            : undefined;

  return (
    <>
      <PageHeader
        title="Goals"
        description="Long-term goals that track themselves from your data."
        actions={
          <Magnetic>
            <Button onClick={() => setForm((f) => ({ open: true, key: f.key + 1 }))} data-cursor-label="New">
              <Plus /> New goal
            </Button>
          </Magnetic>
        }
      />

      {active.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {active.map((g, i) => (
              <GoalCard key={g.id} goal={g} index={i} today={today} unit={unitFor(g.metric, units, "₹")} refName={refName(g.metric)} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setForm((f) => ({ open: true, key: f.key + 1 }))}
          className="flex w-full flex-col items-center gap-2 rounded-3xl border border-dashed px-6 py-16 text-center transition-colors hover:bg-subtle"
        >
          <span className="font-medium">No goals yet.</span>
          <span className="max-w-md text-sm text-muted">“Bench 100 kg”, “Read 24 books this year”, “Save ₹1,00,000” — link a goal to your data and it updates on its own.</span>
        </button>
      )}

      {done.length > 0 && (
        <>
          <Reveal className="mt-10 mb-4">
            <h2 className="border-t-2 border-foreground pt-3 text-2xl font-bold tracking-[-0.03em] uppercase">Reached</h2>
          </Reveal>
          <div className="grid gap-3 md:grid-cols-3">
            {done.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-3xl border bg-surface p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-none bg-foreground text-background">
                  <Check className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{g.title}</span>
                  <span className="text-xs text-muted">{new Date(g.completedAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={form.open} onOpenChange={(open) => setForm((f) => ({ ...f, open }))}>
        <GoalForm key={form.key} lookups={lookups} units={units} onDone={() => setForm((f) => ({ ...f, open: false }))} />
      </Dialog>
    </>
  );
}

function GoalCard({ goal, index, today, unit, refName }: { goal: GoalView; index: number; today: Day; unit: string; refName?: string }) {
  const [pending, startTransition] = useTransition();
  const [newMilestone, setNewMilestone] = useState("");
  const daysLeft = goal.deadline ? diffDays(today, goal.deadline) : null;
  const manual = goal.metric.type === "manual";
  const money = unit === "₹";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group flex flex-col gap-5 rounded-3xl border bg-surface p-6", pending && "opacity-70")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight">{goal.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {METRIC_LABEL[goal.metric.type]}
            {refName && ` · ${refName}`}
            {daysLeft !== null && ` · ${daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? "due today" : `${-daysLeft} days overdue`}`}
          </p>
        </div>
        <div className="flex opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button type="button" aria-label="Archive goal" onClick={() => startTransition(() => archiveGoal(goal.id))} className="inline-flex size-8 items-center justify-center rounded-none text-muted hover:bg-subtle hover:text-foreground">
            <Archive className="size-3.5" />
          </button>
          <button type="button" aria-label="Delete goal" onClick={() => startTransition(() => deleteGoal(goal.id))} className="inline-flex size-8 items-center justify-center rounded-none text-muted hover:bg-subtle hover:text-foreground">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <Ring value={goal.progress} size={96} stroke={7}>
          <span className="text-lg font-semibold">{Math.round(goal.progress * 100)}%</span>
        </Ring>
        <div>
          <p className="text-3xl font-semibold tracking-tight">
            {money && "₹"}
            {fmt(goal.current)}
            <span className="text-base font-normal text-muted">
              {" "}
              / {money && "₹"}
              {fmt(goal.target)} {money ? "" : unit}
            </span>
          </p>
          {goal.baseline !== null && goal.target < goal.baseline && (
            <p className="mt-1 text-xs text-muted">
              Started at {fmt(goal.baseline)} {unit}
            </p>
          )}
        </div>
      </div>

      {(manual || goal.milestones.length > 0) && (
        <div>
          <ul className="space-y-1">
            {goal.milestones.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-1.5 text-sm transition-colors hover:bg-subtle">
                  <input type="checkbox" checked={m.done} onChange={(e) => startTransition(() => toggleMilestone(m.id, e.target.checked))} className="peer sr-only" />
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:outline peer-focus-visible:outline-1", m.done && "border-foreground bg-foreground text-background")}>
                    {m.done && <Check className="size-3" />}
                  </span>
                  <span className={cn(m.done && "text-muted line-through")}>{m.title}</span>
                </label>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newMilestone.trim()) return;
              startTransition(async () => {
                await addMilestone(goal.id, newMilestone);
                setNewMilestone("");
              });
            }}
          >
            <Input value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} placeholder="Add a milestone" aria-label="New milestone" className="h-9" />
            <Button type="submit" size="sm" variant="outline" disabled={!newMilestone.trim()} aria-label="Add milestone">
              <Plus />
            </Button>
          </form>
        </div>
      )}
    </motion.div>
  );
}

function GoalForm({ lookups, units, onDone }: { lookups: Lookups; units: string; onDone: () => void }) {
  const [type, setType] = useState<GoalMetric["type"]>("exercise_1rm");
  const [ref, setRef] = useState("");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refOptions =
    type === "habit_streak" ? lookups.habits : type === "exercise_1rm" ? lookups.exercises : type === "study_hours" ? lookups.skills : type === "savings_goal" ? lookups.savings : null;
  const metric = (): GoalMetric | null => {
    switch (type) {
      case "habit_streak":
        return ref ? { type, habitId: ref } : null;
      case "exercise_1rm":
        return ref ? { type, exerciseId: ref } : null;
      case "study_hours":
        return ref ? { type, skillId: ref } : null;
      case "savings_goal":
        return ref ? { type, goalId: ref } : null;
      default:
        return { type } as GoalMetric;
    }
  };
  const unit = unitFor({ type } as GoalMetric, units, "₹");
  const types = (Object.keys(METRIC_LABEL) as GoalMetric["type"][]).filter((t) => {
    if (t === "habit_streak") return lookups.habits.length > 0;
    if (t === "exercise_1rm") return lookups.exercises.length > 0;
    if (t === "study_hours") return lookups.skills.length > 0;
    if (t === "savings_goal") return lookups.savings.length > 0;
    return true;
  });

  const submit = () => {
    const m = metric();
    const allMilestones = draft.trim() ? [...milestones, draft.trim()] : milestones;
    if (!title.trim()) return setError("Name your goal");
    if (!m) return setError("Pick what it tracks");
    const t = Number(target.replace(/,/g, ""));
    if (type !== "manual" && !(t > 0)) return setError("Set a target");
    if (type === "manual" && !allMilestones.length) return setError("Add at least one milestone");
    setError(null);
    startTransition(async () => {
      await createGoal({
        title,
        metric: m,
        target: type === "manual" ? null : t,
        baseline: type === "body_weight" ? lookups.latestWeight : null,
        deadline: deadline || null,
        milestones: allMilestones,
      });
      onDone();
    });
  };

  return (
    <DialogContent title="New goal">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="goal-title">Goal</Label>
          <Input id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bench 100 kg" autoFocus />
        </div>
        <div className="space-y-2">
          <Label>Tracks</Label>
          <Chips
            value={type}
            onChange={(t) => {
              setType(t);
              setRef("");
            }}
            options={types.map((t) => ({ value: t, label: METRIC_LABEL[t] }))}
          />
        </div>
        {refOptions && (
          <div className="space-y-2">
            <Label>Which one</Label>
            <Chips value={ref} onChange={setRef} options={refOptions.map((o) => ({ value: o.id, label: o.name }))} />
          </div>
        )}
        {type !== "manual" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target ({unit})</Label>
              <Input id="goal-target" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder={type === "body_weight" && lookups.latestWeight ? `now ${lookups.latestWeight}` : "100"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">By (optional)</Label>
              <Input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Milestones {type !== "manual" && "(optional)"}</Label>
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <span className="flex-1">{m}</span>
              <button type="button" aria-label={`Remove ${m}`} onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className="text-muted hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  e.preventDefault();
                  setMilestones([...milestones, draft.trim()]);
                  setDraft("");
                }
              }}
              placeholder="e.g. First 5 km run"
              aria-label="Milestone"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              aria-label="Add milestone"
              onClick={() => {
                if (draft.trim()) {
                  setMilestones([...milestones, draft.trim()]);
                  setDraft("");
                }
              }}
            >
              <Plus />
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-muted">— {error}</p>}
        <Button size="lg" className="w-full" onClick={submit} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : "Create goal"}
        </Button>
      </div>
    </DialogContent>
  );
}

