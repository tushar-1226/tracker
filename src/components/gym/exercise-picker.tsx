"use client";

import { LoaderCircle, Plus, Search } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { type ExerciseKind, MUSCLE_LABEL, type Muscle } from "@/lib/fitness";
import { cn } from "@/lib/utils";
import { createExercise } from "@/server/actions/gym";

export type ExerciseLite = { id: string; name: string; muscle: Muscle; kind: ExerciseKind };

const KIND_LABEL: Record<ExerciseKind, string> = {
  strength: "Weight × reps",
  bodyweight: "Bodyweight",
  cardio: "Distance & time",
  timed: "Timed hold",
};

/** Search / filter the library, or create a new exercise, then pick it. */
export function ExercisePicker({
  library,
  onPick,
  onCreated,
}: {
  library: ExerciseLite[];
  onPick: (exercise: ExerciseLite) => void;
  onCreated: (exercise: ExerciseLite) => void;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "all">("all");
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<ExerciseKind>("strength");
  const [newMuscle, setNewMuscle] = useState<Muscle>("chest");
  const [pending, startTransition] = useTransition();

  const list = library.filter(
    (e) => (muscle === "all" || e.muscle === muscle) && e.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const muscles = [...new Set(library.map((e) => e.muscle))];

  return (
    <DialogContent title="Add exercise">
      {creating ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
            if (!name) return;
            startTransition(async () => {
              const ex = await createExercise({ name, muscle: newMuscle, kind });
              onCreated(ex);
              onPick(ex);
            });
          }}
        >
          <Input name="name" defaultValue={q} placeholder="Exercise name" autoFocus aria-label="Exercise name" />
          <div className="space-y-2">
            <p className="text-xs text-muted">Muscle group</p>
            <Chips
              value={newMuscle}
              onChange={setNewMuscle}
              options={(Object.keys(MUSCLE_LABEL) as Muscle[]).map((m) => ({ value: m, label: MUSCLE_LABEL[m] }))}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted">Tracked as</p>
            <Segmented
              value={kind}
              onChange={setKind}
              options={(Object.keys(KIND_LABEL) as ExerciseKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
              className="flex-wrap rounded-2xl"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => setCreating(false)}>
              Back
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : "Create & add"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" className="pl-10" autoFocus aria-label="Search exercises" />
          </div>
          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" data-lenis-prevent>
            {(["all", ...muscles] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMuscle(m)}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                  muscle === m ? "border-foreground bg-foreground text-background" : "text-muted hover:text-foreground",
                )}
              >
                {m === "all" ? "All" : MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>
          <ul className="mt-3 max-h-[45vh] overflow-y-auto" data-lenis-prevent>
            {list.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onPick(e)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-subtle"
                >
                  {e.name}
                  <span className="text-xs text-muted">{MUSCLE_LABEL[e.muscle]}</span>
                </button>
              </li>
            ))}
            {!list.length && <li className="py-8 text-center text-sm text-muted">No match.</li>}
          </ul>
          <Button variant="outline" className="mt-4 w-full" onClick={() => setCreating(true)}>
            <Plus /> {q.trim() ? `Create “${q.trim()}”` : "Create exercise"}
          </Button>
        </>
      )}
    </DialogContent>
  );
}
