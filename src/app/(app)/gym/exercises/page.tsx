import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/module/page-header";
import { getCurrentUser } from "@/lib/auth/dal";
import { MUSCLE_LABEL, type Muscle, isComplete } from "@/lib/fitness";
import { ensureGymSetup, listDatedSets, listExercises } from "@/server/queries/gym";

export const metadata: Metadata = { title: "Exercises" };

export default async function ExercisesPage() {
  const user = await getCurrentUser();
  await ensureGymSetup(user.id);
  const [library, history] = await Promise.all([listExercises(user.id), listDatedSets(user.id)]);
  const groups = new Map<Muscle, typeof library>();
  for (const e of library) groups.set(e.muscle, [...(groups.get(e.muscle) ?? []), e]);

  return (
    <>
      <Link href="/gym" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        ← Gym
      </Link>
      <PageHeader title="Exercises" description="Your library. Open one to see its history and records." />
      <div className="grid gap-8 md:grid-cols-2">
        {[...groups.entries()].map(([muscle, list]) => (
          <section key={muscle}>
            <h2 className="mb-2 text-xs font-medium tracking-wide text-muted">{MUSCLE_LABEL[muscle]}</h2>
            <ul className="divide-y rounded-3xl bg-surface">
              {list.map((e) => {
                const sessions = new Set((history.get(e.id) ?? []).filter((s) => isComplete(e.kind, s)).map((s) => s.workoutId)).size;
                return (
                  <li key={e.id}>
                    <Link href={`/gym/exercises/${e.id}`} className="flex items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-subtle">
                      {e.name}
                      <span className="text-xs text-muted">{sessions ? `${sessions} session${sessions === 1 ? "" : "s"}` : "—"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
