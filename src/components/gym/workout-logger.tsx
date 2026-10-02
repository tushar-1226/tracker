"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookmarkPlus,
  Check,
  LoaderCircle,
  Plus,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Day } from "@/lib/dates";
import {
  type ExerciseKind,
  MUSCLE_LABEL,
  type SetLike,
  type Units,
  formatDuration,
  isComplete,
  setScore,
  setVolume,
} from "@/lib/fitness";
import { cn } from "@/lib/utils";
import { type WorkoutPayload, deleteWorkout, finishWorkout, saveAsTemplate, saveWorkout } from "@/server/actions/gym";
import { type ExerciseLite, ExercisePicker } from "./exercise-picker";
import { type Rest, RestTimer } from "./rest-timer";

/** Inputs are kept as strings in display units; converted on save. */
type SetDraft = { key: string; reps: string; weight: string; distance: string; duration: string; done: boolean };
type Item = { key: string; exerciseId: string; sets: SetDraft[] };
export type PrevSet = { reps: number | null; weight: number | null; distance: number | null; durationSec: number | null };

const REST_SECONDS = 90;
const uid = () => Math.random().toString(36).slice(2, 10);
const restFromNow = (sec: number): Rest => ({ endsAt: Date.now() + sec * 1000, total: sec });
const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const num = (v: string) => {
  if (!v.trim()) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function toDraft(kind: ExerciseKind, s: PrevSet & { done?: boolean }): SetDraft {
  return {
    key: uid(),
    reps: str(s.reps),
    weight: str(s.weight),
    distance: str(s.distance),
    // Cardio time is entered in minutes, holds in seconds.
    duration: s.durationSec ? (kind === "cardio" ? str(Math.round((s.durationSec / 60) * 10) / 10) : str(s.durationSec)) : "",
    done: s.done ?? false,
  };
}

function toSet(kind: ExerciseKind, d: SetDraft): SetLike {
  const duration = num(d.duration);
  return {
    reps: num(d.reps),
    weight: num(d.weight),
    distance: num(d.distance),
    durationSec: duration === null ? null : kind === "cardio" ? duration * 60 : duration,
    done: d.done,
  };
}

export function WorkoutLogger({
  workout,
  initial,
  library: initialLibrary,
  previous,
  bestBefore,
  units,
}: {
  workout: { id: string; name: string; date: Day; note: string | null; startedAt: number; finishedAt: number | null; durationMin: number | null };
  initial: { exerciseId: string; sets: (PrevSet & { done: boolean })[] }[];
  library: ExerciseLite[];
  /** Last session's sets per exercise (display units). */
  previous: Record<string, PrevSet[]>;
  /** Best set score per exercise before this workout. */
  bestBefore: Record<string, number>;
  units: Units;
}) {
  const router = useRouter();
  const [library, setLibrary] = useState(initialLibrary);
  const kindOf = (id: string) => library.find((e) => e.id === id)?.kind ?? "strength";
  const [items, setItems] = useState<Item[]>(() =>
    initial.map((e) => ({ key: uid(), exerciseId: e.exerciseId, sets: e.sets.map((s) => toDraft(kindOf(e.exerciseId), s)) })),
  );
  const [meta, setMeta] = useState({ name: workout.name, note: workout.note ?? "", date: workout.date });
  const [rest, setRest] = useState<Rest>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [finishing, startFinish] = useTransition();
  const [summary, setSummary] = useState<{ xp: number; prs: number } | null>(null);
  const finished = workout.finishedAt !== null;

  // ---------- Autosave ----------
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<WorkoutPayload | null>(null);

  const payloadFor = (nextItems: Item[], nextMeta: typeof meta): WorkoutPayload => ({
    name: nextMeta.name.trim() || "Workout",
    note: nextMeta.note.trim() || null,
    date: nextMeta.date,
    exercises: nextItems.map((i) => ({
      exerciseId: i.exerciseId,
      sets: i.sets.map((s) => toSet(kindOf(i.exerciseId), s)),
    })),
  });

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    try {
      await saveWorkout(workout.id, p);
      setStatus((s) => (pending.current ? s : "saved"));
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  const commit = (nextItems: Item[], nextMeta = meta) => {
    setItems(nextItems);
    setMeta(nextMeta);
    pending.current = payloadFor(nextItems, nextMeta);
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  };

  // Save anything outstanding when leaving the page.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (pending.current) void saveWorkout(workout.id, pending.current);
    };
  }, [workout.id]);

  // ---------- Mutations ----------
  const updateSet = (itemKey: string, setKey: string, patch: Partial<SetDraft>) =>
    commit(items.map((i) => (i.key !== itemKey ? i : { ...i, sets: i.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) })));

  const toggleDone = (item: Item, set: SetDraft) => {
    const kind = kindOf(item.exerciseId);
    const nowDone = !set.done;
    // Ticking an empty set copies the previous session's numbers.
    let patch: Partial<SetDraft> = { done: nowDone };
    if (nowDone && !isComplete(kind, { ...toSet(kind, set), done: true })) {
      const prev = previous[item.exerciseId]?.[item.sets.indexOf(set)] ?? previous[item.exerciseId]?.at(-1);
      if (prev) patch = { ...toDraft(kind, prev), key: set.key, done: true };
    }
    updateSet(item.key, set.key, patch);
    if (nowDone && (kind === "strength" || kind === "bodyweight")) {
      setRest(restFromNow(REST_SECONDS));
    }
  };

  const addSet = (item: Item) => {
    const last = item.sets.at(-1);
    const next: SetDraft = last ? { ...last, key: uid(), done: false } : toDraft(kindOf(item.exerciseId), { reps: null, weight: null, distance: null, durationSec: null });
    commit(items.map((i) => (i.key === item.key ? { ...i, sets: [...i.sets, next] } : i)));
  };
  const removeSet = (item: Item, setKey: string) =>
    commit(items.map((i) => (i.key === item.key ? { ...i, sets: i.sets.filter((s) => s.key !== setKey) } : i)));
  const removeItem = (key: string) => commit(items.filter((i) => i.key !== key));
  const move = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const [it] = next.splice(index, 1);
    next.splice(index + dir, 0, it);
    commit(next);
  };
  const addExercise = (e: ExerciseLite) => {
    setPickerOpen(false);
    const prev = previous[e.id];
    const sets = prev?.length
      ? prev.map((p) => ({ ...toDraft(e.kind, p), done: false }))
      : Array.from({ length: e.kind === "cardio" ? 1 : 3 }, () => toDraft(e.kind, { reps: null, weight: null, distance: null, durationSec: null }));
    commit([...items, { key: uid(), exerciseId: e.id, sets }]);
  };

  // ---------- Derived ----------
  const allSets = items.flatMap((i) => i.sets.map((s) => ({ kind: kindOf(i.exerciseId), set: toSet(kindOf(i.exerciseId), s) })));
  const doneSets = allSets.filter((x) => isComplete(x.kind, x.set));
  const volume = doneSets.reduce((s, x) => s + setVolume(x.set), 0);

  /** Best set of each exercise in this workout, if it beats every earlier session. */
  const prKeys = new Set<string>();
  for (const i of items) {
    const kind = kindOf(i.exerciseId);
    let best: SetDraft | null = null;
    let bestScore = bestBefore[i.exerciseId] ?? Infinity; // no history → no PR yet
    for (const s of i.sets) {
      const set = toSet(kind, s);
      if (!isComplete(kind, set)) continue;
      const score = setScore(kind, set);
      if (score > bestScore) {
        best = s;
        bestScore = score;
      }
    }
    if (best) prKeys.add(best.key);
  }

  const finish = () =>
    startFinish(async () => {
      await flush();
      const res = await finishWorkout(workout.id);
      setSummary({ xp: res.xp, prs: res.prSetIds.length });
    });

  return (
    <>
      <Link href="/gym" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Gym
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <input
            aria-label="Workout name"
            value={meta.name}
            onChange={(e) => commit(items, { ...meta, name: e.target.value })}
            className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none md:text-5xl"
          />
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {finished ? (
              <input
                type="date"
                aria-label="Workout date"
                value={meta.date}
                onChange={(e) => e.target.value && commit(items, { ...meta, date: e.target.value })}
                className="bg-transparent outline-none"
              />
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 animate-pulse rounded-full bg-foreground" /> <Elapsed since={workout.startedAt} />
              </span>
            )}
            {finished && workout.durationMin && <span>{workout.durationMin} min</span>}
            <span>
              {doneSets.length} set{doneSets.length === 1 ? "" : "s"}
            </span>
            {volume > 0 && (
              <span>
                {Math.round(volume).toLocaleString("en-IN")} {units} moved
              </span>
            )}
            <SaveStatus status={status} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WorkoutMenu workoutId={workout.id} canTemplate={finished && items.length > 0} defaultName={meta.name} />
          {!finished && (
            <Magnetic>
              <Button onClick={finish} disabled={finishing} data-cursor-label="Finish">
                {finishing ? <LoaderCircle className="animate-spin" /> : <Check />} Finish
              </Button>
            </Magnetic>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {items.map((item, index) => {
            const ex = library.find((e) => e.id === item.exerciseId);
            const kind = ex?.kind ?? "strength";
            const prev = previous[item.exerciseId] ?? [];
            const cols = columnsFor(kind, units);
            return (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="p-4 md:p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/gym/exercises/${item.exerciseId}`} className="font-medium hover:underline">
                        {ex?.name ?? "Exercise"}
                      </Link>
                      <p className="text-xs text-muted">{ex ? MUSCLE_LABEL[ex.muscle] : ""}</p>
                    </div>
                    <div className="flex">
                      <IconBtn label="Move up" disabled={index === 0} onClick={() => move(index, -1)} icon={ArrowUp} />
                      <IconBtn label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)} icon={ArrowDown} />
                      <IconBtn label="Remove exercise" onClick={() => removeItem(item.key)} icon={Trash2} />
                    </div>
                  </div>

                  <div className="grid max-w-xl items-center gap-x-2 gap-y-1.5" style={{ gridTemplateColumns: `1.75rem minmax(3.5rem,6rem) repeat(${cols.length}, minmax(3.5rem,1fr)) 2.25rem 1.5rem` }}>
                    <span className="text-[10px] text-muted uppercase">Set</span>
                    <span className="text-[10px] text-muted uppercase">Last</span>
                    {cols.map((c) => (
                      <span key={c.field} className="text-center text-[10px] text-muted uppercase">
                        {c.label}
                      </span>
                    ))}
                    <span />
                    <span />

                    {item.sets.map((s, si) => {
                      const p = prev[si];
                      const isPR = prKeys.has(s.key);
                      return (
                        <SetRow
                          key={s.key}
                          index={si}
                          set={s}
                          last={p ? lastLabel(kind, p, units) : "—"}
                          cols={cols}
                          isPR={isPR}
                          onCopyLast={p ? () => updateSet(item.key, s.key, { ...toDraft(kind, p), key: s.key, done: s.done }) : undefined}
                          onChange={(patch) => updateSet(item.key, s.key, patch)}
                          onToggle={() => toggleDone(item, s)}
                          onRemove={() => removeSet(item, s.key)}
                        />
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => addSet(item)}
                    className="mt-3 flex h-9 w-full max-w-xl items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs text-muted transition-colors hover:border-foreground hover:text-foreground"
                  >
                    <Plus className="size-3.5" /> Add set
                  </button>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex h-16 w-full items-center justify-center gap-2 rounded-3xl border border-dashed text-sm text-muted transition-colors hover:border-foreground hover:text-foreground"
            >
              <Plus className="size-4" /> Add exercise
            </button>
          </DialogTrigger>
          <ExercisePicker library={library} onPick={addExercise} onCreated={(e) => setLibrary((l) => [...l, e])} />
        </Dialog>

        <textarea
          aria-label="Workout notes"
          value={meta.note}
          onChange={(e) => commit(items, { ...meta, note: e.target.value })}
          placeholder="Notes — how did it feel?"
          rows={2}
          className="w-full resize-none rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-foreground"
        />
      </div>

      <RestTimer rest={rest} onChange={setRest} />

      <Dialog open={summary !== null} onOpenChange={(o) => !o && router.push("/gym")}>
        {summary && (
          <DialogContent title="Workout complete">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Sets", String(doneSets.length)],
                ["Volume", `${Math.round(volume).toLocaleString("en-IN")} ${units}`],
                ["XP", `+${summary.xp}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border p-4">
                  <p className="text-xl font-semibold tracking-tight">{v}</p>
                  <p className="mt-1 text-xs text-muted">{k}</p>
                </div>
              ))}
            </div>
            {summary.prs > 0 && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-medium text-background"
              >
                <Trophy className="size-4" /> {summary.prs} new personal record{summary.prs === 1 ? "" : "s"}
              </motion.p>
            )}
            <Button size="lg" className="mt-6 w-full" onClick={() => router.push("/gym")}>
              Done
            </Button>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

type Col = { field: "weight" | "reps" | "distance" | "duration"; label: string };

function columnsFor(kind: ExerciseKind, units: Units): Col[] {
  if (kind === "strength") return [{ field: "weight", label: units }, { field: "reps", label: "Reps" }];
  if (kind === "bodyweight") return [{ field: "weight", label: `+${units}` }, { field: "reps", label: "Reps" }];
  if (kind === "cardio") return [{ field: "distance", label: "km" }, { field: "duration", label: "Min" }];
  return [{ field: "duration", label: "Sec" }];
}

function lastLabel(kind: ExerciseKind, p: PrevSet, units: Units) {
  if (kind === "cardio") return [p.distance ? `${p.distance}km` : "", p.durationSec ? formatDuration(p.durationSec) : ""].filter(Boolean).join(" ") || "—";
  if (kind === "timed") return p.durationSec ? formatDuration(p.durationSec) : "—";
  if (!p.reps) return "—";
  return p.weight ? `${p.weight}${units === "lb" ? "lb" : ""}×${p.reps}` : `${p.reps} reps`;
}

function SetRow({
  index,
  set,
  last,
  cols,
  isPR,
  onCopyLast,
  onChange,
  onToggle,
  onRemove,
}: {
  index: number;
  set: SetDraft;
  last: string;
  cols: Col[];
  isPR: boolean;
  onCopyLast?: () => void;
  onChange: (patch: Partial<SetDraft>) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <span className={cn("tabular text-sm", set.done ? "text-foreground" : "text-muted")}>
        {isPR ? <Trophy className="size-3.5" aria-label="Personal record" /> : index + 1}
      </span>
      <button
        type="button"
        onClick={onCopyLast}
        disabled={!onCopyLast}
        title={onCopyLast ? "Use last time's numbers" : undefined}
        className="truncate text-left text-xs text-muted tabular-nums enabled:hover:text-foreground"
      >
        {last}
      </button>
      {cols.map((c) => (
        <input
          key={c.field}
          inputMode="decimal"
          aria-label={`Set ${index + 1} ${c.label}`}
          value={set[c.field]}
          onChange={(e) => onChange({ [c.field]: e.target.value })}
          className={cn(
            "h-9 w-full min-w-0 rounded-lg border bg-background text-center text-sm tabular-nums outline-none transition-colors focus:border-foreground",
            set.done && "border-transparent bg-subtle",
          )}
        />
      ))}
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={onToggle}
        aria-pressed={set.done}
        aria-label={set.done ? `Set ${index + 1} done` : `Complete set ${index + 1}`}
        className={cn(
          "flex size-9 items-center justify-center rounded-lg border transition-colors",
          set.done ? "border-foreground bg-foreground text-background" : "hover:border-foreground",
        )}
      >
        <Check className="size-4" />
      </motion.button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove set ${index + 1}`}
        className="flex size-6 items-center justify-center rounded-full text-muted opacity-50 transition-opacity hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </>
  );
}

function IconBtn({ label, icon: Icon, onClick, disabled }: { label: string; icon: typeof X; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-foreground disabled:opacity-25"
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{formatDuration(Math.max(0, Math.floor((now - since) / 1000)))}</span>;
}

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  return (
    <span className="text-xs" aria-live="polite">
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Couldn’t save — check your connection"}
    </span>
  );
}

function WorkoutMenu({ workoutId, canTemplate, defaultName }: { workoutId: string; canTemplate: boolean; defaultName: string }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);
  return (
    <>
      {canTemplate && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <BookmarkPlus /> Save as template
            </Button>
          </DialogTrigger>
          <DialogContent title="Save as template" description="Start future workouts with these exercises and set counts.">
            {saved ? (
              <p className="rounded-xl border border-dashed px-4 py-3 text-sm">Saved. Find it under Templates on the Gym page.</p>
            ) : (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    await saveAsTemplate(workoutId, name);
                    setSaved(true);
                  });
                }}
              >
                <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Template name" />
                <Button type="submit" disabled={pending}>
                  {pending ? <LoaderCircle className="animate-spin" /> : "Save"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Delete workout">
            <Trash2 />
          </Button>
        </DialogTrigger>
        <DialogContent title="Delete this workout?" description="Its sets, any PRs it set and the XP it earned will be removed.">
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={pending} onClick={() => startTransition(() => deleteWorkout(workoutId))}>
              {pending ? <LoaderCircle className="animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

