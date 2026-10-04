"use client";

import { Check, LoaderCircle, Minus, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState, useTransition } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { Legend } from "@/components/charts/legend";
import { LineChart } from "@/components/charts/line-chart";
import { Ring } from "@/components/charts/ring";
import { MonthNav } from "@/components/module/month-nav";
import { PageHeader } from "@/components/module/page-header";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Chips } from "@/components/ui/chips";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { type Day, diffDays, toDate, formatDate } from "@/lib/dates";
import { type MonthKey, addMonths, daysInMonth, goalEta, monthLabel, monthOf, safeToSpend } from "@/lib/money/math";
import type { FormState } from "@/lib/validators/money";
import { cn } from "@/lib/utils";
import {
  archiveCategory,
  contributeToGoal,
  deleteGoal,
  saveCategory,
  saveGoal,
  setBudget,
} from "@/server/actions/money";
import { CATEGORY_ICONS, CategoryIcon } from "./icons";
import { useMoney } from "./money-context";

type Goal = {
  id: string;
  name: string;
  icon: string;
  target: number;
  deadline: string | null;
  saved: number;
  contributions: { amount: number; date: Day }[];
};

export function BudgetView({
  month,
  budgets,
  spend,
  daily,
  prevDaily,
  goals,
}: {
  month: MonthKey;
  budgets: { categoryId: string; amount: number }[];
  spend: { categoryId: string | null; total: number }[];
  daily: Record<Day, number>;
  prevDaily: Record<Day, number>;
  goals: Goal[];
}) {
  const { categories, money, today } = useMoney();
  const isCurrent = month === monthOf(today);
  const limitOf = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const spentOf = new Map(spend.map((s) => [s.categoryId ?? "none", s.total]));

  const expenseCats = categories.filter((c) => c.kind === "expense");
  const budgeted = expenseCats.filter((c) => limitOf.has(c.id));
  const unbudgeted = expenseCats.filter((c) => !limitOf.has(c.id));
  const totalLimit = budgeted.reduce((s, c) => s + limitOf.get(c.id)!, 0);
  const spentBudgeted = budgeted.reduce((s, c) => s + (spentOf.get(c.id) ?? 0), 0);
  const totalSpent = spend.reduce((s, c) => s + c.total, 0);
  const left = totalLimit - spentBudgeted;
  const perDay = isCurrent ? safeToSpend(left, today, month) : null;

  return (
    <>
      <PageHeader
        title="Budget"
        description="Monthly limits, pace and savings goals."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthNav month={month} max={monthOf(today)} href={(m) => `/budget?month=${m}`} />
            <CategoryManager />
          </div>
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-3">
        <StaggerItem>
          <Card className="flex h-full flex-col justify-between gap-8">
            <div>
              <CardLabel>{isCurrent ? "Safe to spend today" : "Left in budget"}</CardLabel>
              <p className="mt-3 text-5xl font-semibold tracking-tight">
                {totalLimit === 0 ? "—" : money(isCurrent ? Math.floor(perDay! / 100) * 100 : Math.max(0, left))}
              </p>
              <p className="mt-2 text-sm text-muted">
                {totalLimit === 0
                  ? "Set a limit on a category below to get a daily number."
                  : left < 0
                    ? `Over budget by ${money(-left)}`
                    : isCurrent
                      ? `${money(left)} left for ${diffDays(today, `${month}-${daysInMonth(month)}`) + 1} days`
                      : `${money(left)} under budget`}
              </p>
            </div>
            <dl className="space-y-2 border-t pt-4 text-sm">
              <Row label="Budgeted" value={money(totalLimit)} />
              <Row label="Spent in budgets" value={money(spentBudgeted)} />
              <Row label="All spending" value={money(totalSpent)} />
            </dl>
          </Card>
        </StaggerItem>
        <StaggerItem className="md:col-span-2">
          <PaceChart month={month} daily={daily} prevDaily={prevDaily} limit={totalLimit} />
        </StaggerItem>
      </Stagger>

      <Reveal className="mt-10 mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Categories</h2>
        <p className="text-sm text-muted">Limits repeat every month. Tap an amount to change it.</p>
      </Reveal>
      <Card className="p-2 md:p-3">
        <ul>
          {budgeted.map((c) => (
            <BudgetRow key={c.id} category={c} limit={limitOf.get(c.id)!} spent={spentOf.get(c.id) ?? 0} />
          ))}
          {unbudgeted
            .filter((c) => spentOf.has(c.id))
            .sort((a, b) => spentOf.get(b.id)! - spentOf.get(a.id)!)
            .map((c) => (
              <BudgetRow key={c.id} category={c} limit={null} spent={spentOf.get(c.id)!} />
            ))}
        </ul>
        <MoreCategories categories={unbudgeted.filter((c) => !spentOf.has(c.id))} />
      </Card>

      <Goals goals={goals} />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** Cumulative spend this month vs last month, by day of month. */
function PaceChart({
  month,
  daily,
  prevDaily,
  limit,
}: {
  month: MonthKey;
  daily: Record<Day, number>;
  prevDaily: Record<Day, number>;
  limit: number;
}) {
  const { money, today } = useMoney();
  const prev = addMonths(month, -1);
  const days = daysInMonth(month);
  const cumulative = (m: MonthKey, data: Record<Day, number>, stopAt?: Day) => {
    let sum = 0;
    return Array.from({ length: days }, (_, i) => {
      const d = `${m}-${String(i + 1).padStart(2, "0")}`;
      if (i + 1 > daysInMonth(m) || (stopAt && d > stopAt)) return null;
      sum += data[d] ?? 0;
      return sum;
    });
  };
  const current = cumulative(month, daily, today);
  const last = cumulative(prev, prevDaily);
  const labels = Array.from({ length: days }, (_, i) => String(i + 1));
  const lastIdx = current.findLastIndex((v) => v !== null);
  const nowVal = current[lastIdx] ?? 0;
  const thenVal = last[lastIdx] ?? null;

  return (
    <ChartCard
      title="Spending pace"
      className="h-full"
      subtitle={
        thenVal === null || lastIdx < 0
          ? "Cumulative spend by day of month"
          : nowVal <= thenVal
            ? `${money(thenVal - nowVal)} less than this point last month`
            : `${money(nowVal - thenVal)} more than this point last month`
      }
      legend={
        <Legend
          mark="line"
          items={[
            { name: monthLabel(month), tone: "fg" },
            { name: monthLabel(prev), tone: "muted" },
          ]}
        />
      }
      table={{
        columns: ["Day", monthLabel(month), monthLabel(prev)],
        rows: labels.map((l, i) => [l, current[i] === null ? "—" : money(current[i]!), last[i] === null ? "—" : money(last[i]!)]),
      }}
    >
      <LineChart
        ariaLabel="Cumulative spending this month compared with last month"
        labels={labels}
        titles={labels.map((l) => `Day ${l}`)}
        series={[
          { name: monthLabel(month), tone: "fg", values: current, area: true },
          { name: monthLabel(prev), tone: "muted", values: last },
        ]}
        format={(v) => money(v)}
        formatAxis={(v) => money(v, { compact: true })}
        height={210}
      />
      {limit > 0 && <p className="mt-2 text-xs text-muted">Monthly budget: {money(limit)}</p>}
    </ChartCard>
  );
}

function BudgetRow({
  category,
  limit,
  spent,
}: {
  category: { id: string; name: string; icon: string };
  limit: number | null;
  spent: number;
}) {
  const { money } = useMoney();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(limit ? String(limit / 100) : "");
  const [pending, startTransition] = useTransition();
  const ratio = limit ? spent / limit : 0;
  const over = limit !== null && spent > limit;

  const save = () =>
    startTransition(async () => {
      await setBudget(category.id, value);
      setEditing(false);
    });

  return (
    <li className="rounded-2xl px-3 py-3 transition-colors hover:bg-subtle">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle">
          <CategoryIcon name={category.icon} />
        </span>
        <span className={cn("min-w-0 flex-1 truncate text-sm", limit === null && spent === 0 && "text-muted")}>{category.name}</span>
        {editing ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Input
              autoFocus
              inputMode="decimal"
              aria-label={`Monthly limit for ${category.name}`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              placeholder="No limit"
              className="h-9 w-28 px-3 text-right"
            />
            <Button type="submit" size="icon" variant="ghost" aria-label="Save" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Cancel" onClick={() => setEditing(false)}>
              <X />
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group/amt flex items-baseline gap-1 text-right text-sm tabular-nums"
          >
            <span className={cn(over && "font-semibold")}>{money(spent)}</span>
            {limit !== null ? (
              <span className="text-muted">/ {money(limit)}</span>
            ) : (
              <span className="text-xs text-muted underline decoration-dotted underline-offset-4 group-hover/amt:text-foreground">
                set limit
              </span>
            )}
            <Pencil className="ml-1 size-3 self-center text-muted opacity-0 transition-opacity group-hover/amt:opacity-100" />
          </button>
        )}
      </div>
      {limit !== null && (
        <div className="mt-2.5 ml-12 flex items-center gap-3">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-subtle">
            <motion.div
              className={cn("absolute inset-y-0 left-0 rounded-full", over ? "hatch" : "bg-foreground")}
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.min(1, ratio) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="w-24 text-right text-xs text-muted tabular-nums">
            {over ? `over ${money(spent - limit)}` : `${money(limit - spent)} left`}
          </span>
        </div>
      )}
    </li>
  );
}

/** Categories with no limit and no spending this month, folded away. */
function MoreCategories({ categories }: { categories: { id: string; name: string; icon: string }[] }) {
  const [open, setOpen] = useState(false);
  if (!categories.length) return null;
  return (
    <div className="px-3 pt-1 pb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 py-2 text-xs text-muted transition-colors hover:text-foreground"
      >
        <Plus className={cn("size-3.5 transition-transform duration-300", open && "rotate-45")} />
        {open ? "Hide" : `Set a limit on ${categories.length} more categor${categories.length === 1 ? "y" : "ies"}`}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="-mx-3 overflow-hidden"
          >
            {categories.map((c) => (
              <BudgetRow key={c.id} category={c} limit={null} spent={0} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Savings goals ----------

function Goals({ goals }: { goals: Goal[] }) {
  const [form, setForm] = useState<{ open: boolean; goal?: Goal; key: number }>({ open: false, key: 0 });
  return (
    <>
      <Reveal className="mt-10 mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Savings goals</h2>
          <p className="text-sm text-muted">ETAs use your saving pace over the last 90 days.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setForm((f) => ({ open: true, key: f.key + 1 }))}>
          <Plus /> New goal
        </Button>
      </Reveal>
      {goals.length === 0 ? (
        <button
          type="button"
          onClick={() => setForm((f) => ({ open: true, key: f.key + 1 }))}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-3xl bg-foreground/[0.035] text-sm text-muted transition-colors hover:bg-subtle hover:text-foreground"
        >
          <Plus className="size-5" />
          Save for something — a laptop, a trip, an emergency fund
        </button>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onEdit={() => setForm((f) => ({ open: true, goal: g, key: f.key + 1 }))} />
          ))}
        </div>
      )}
      <Dialog open={form.open} onOpenChange={(open) => setForm((f) => ({ ...f, open }))}>
        <GoalForm key={form.key} goal={form.goal} onDone={() => setForm((f) => ({ ...f, open: false }))} />
      </Dialog>
    </>
  );
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { money, today } = useMoney();
  const [mode, setMode] = useState<null | 1 | -1>(null);
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const progress = goal.saved / goal.target;
  const eta = goalEta(goal.saved, goal.target, goal.contributions, today);
  const done = goal.saved >= goal.target;

  let note: string;
  if (done) note = "Reached. Well done.";
  else if (goal.deadline) {
    const months = Math.max(1, Math.ceil(diffDays(today, goal.deadline) / 30.4));
    note = `${money(Math.ceil((goal.target - goal.saved) / months))}/month to hit ${formatDate(toDate(goal.deadline), { month: "short", year: "numeric", timeZone: "UTC" })}`;
  } else note = eta === null ? "Add money to see an ETA" : `About ${eta} month${eta === 1 ? "" : "s"} at your pace`;

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{goal.name}</p>
          <p className="mt-0.5 text-xs text-muted">{note}</p>
        </div>
        <button type="button" onClick={onEdit} aria-label="Edit goal" className="-mt-1 -mr-2 inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-foreground">
          <Pencil className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-5">
        <Ring value={progress} size={88} stroke={7}>
          <span className="text-sm font-semibold">{Math.min(999, Math.round(progress * 100))}%</span>
        </Ring>
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold tracking-tight">{money(goal.saved)}</p>
          <p className="text-xs text-muted">of {money(goal.target)}</p>
        </div>
      </div>
      {mode === null ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setMode(1)}>
            <Plus /> Add money
          </Button>
          <Button variant="ghost" size="sm" aria-label="Withdraw" onClick={() => setMode(-1)} disabled={goal.saved <= 0}>
            <Minus />
          </Button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await contributeToGoal(goal.id, amount, mode, today);
              setAmount("");
              setMode(null);
            });
          }}
        >
          <Input
            autoFocus
            inputMode="decimal"
            aria-label={mode === 1 ? "Amount to add" : "Amount to withdraw"}
            placeholder={mode === 1 ? "Add amount" : "Withdraw amount"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          </Button>
          <Button type="button" size="sm" variant="ghost" aria-label="Cancel" onClick={() => setMode(null)}>
            <X />
          </Button>
        </form>
      )}
    </Card>
  );
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const [deleting, startDelete] = useTransition();
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await saveGoal(prev, fd);
    if (res?.ok) onDone();
    return res;
  }, undefined);
  return (
    <DialogContent title={goal ? "Edit goal" : "New savings goal"}>
      <form action={action} className="space-y-5">
        {goal && <input type="hidden" name="id" value={goal.id} />}
        <div className="space-y-2">
          <Label htmlFor="goal-name">Name</Label>
          <Input id="goal-name" name="name" defaultValue={goal?.name} placeholder="e.g. New laptop" autoFocus={!goal} />
          {state?.errors?.name && <p className="text-xs text-muted">— {state.errors.name[0]}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="goal-target">Target</Label>
            <Input id="goal-target" name="target" inputMode="decimal" defaultValue={goal ? goal.target / 100 : ""} placeholder="80,000" />
            {state?.errors?.target && <p className="text-xs text-muted">— {state.errors.target[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-deadline">By (optional)</Label>
            <Input id="goal-deadline" name="deadline" type="date" defaultValue={goal?.deadline ?? ""} />
          </div>
        </div>
        <div className="flex gap-2">
          {goal && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              aria-label="Delete goal"
              disabled={deleting}
              onClick={() =>
                startDelete(async () => {
                  await deleteGoal(goal.id);
                  onDone();
                })
              }
            >
              <Trash2 />
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : goal ? "Save changes" : "Create goal"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// ---------- Categories ----------

function CategoryManager() {
  const { categories } = useMoney();
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [icon, setIcon] = useState("circle-dashed");
  const [key, setKey] = useState(0);
  const [archiving, startArchive] = useTransition();
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await saveCategory(prev, fd);
    if (res?.ok) setKey((k) => k + 1);
    return res;
  }, undefined);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Manage categories">
          <Settings2 />
        </Button>
      </DialogTrigger>
      <DialogContent title="Categories">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "expense", label: "Spending" },
            { value: "income", label: "Income" },
          ]}
        />
        <ul className="mt-4 max-h-60 overflow-y-auto" data-lenis-prevent>
          {categories
            .filter((c) => c.kind === kind)
            .map((c) => (
              <li key={c.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-subtle">
                <CategoryIcon name={c.icon} className="text-muted" />
                <span className="flex-1 text-sm">{c.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  disabled={archiving}
                  onClick={() => startArchive(() => archiveCategory(c.id))}
                  className="inline-flex size-7 items-center justify-center rounded-full text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
        </ul>
        <form key={key} action={action} className="mt-4 space-y-3 border-t pt-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="icon" value={icon} />
          <div className="flex gap-2">
            <Input name="name" placeholder={`New ${kind === "expense" ? "spending" : "income"} category`} aria-label="Category name" />
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
            </Button>
          </div>
          {state?.errors?.name && <p className="text-xs text-muted">— {state.errors.name[0]}</p>}
          <Chips
            value={icon}
            onChange={setIcon}
            options={Object.entries(CATEGORY_ICONS).map(([k, Icon]) => ({ value: k, label: "", icon: <Icon aria-label={k} /> }))}
            className="[&_button]:w-9 [&_button]:justify-center [&_button]:px-0"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
