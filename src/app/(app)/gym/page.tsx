import type { Metadata } from "next";
import { AutoStart } from "@/components/gym/auto-start";
import { GymOverview } from "@/components/gym/gym-overview";
import { getCurrentUser } from "@/lib/auth/dal";
import { addDays } from "@/lib/dates";
import {
  type ExerciseKind,
  MUSCLE_LABEL,
  formatDuration,
  formatWeight,
  isComplete,
  setVolume,
  toDisplayWeight,
  weeklyWorkoutStreak,
} from "@/lib/fitness";
import {
  ensureGymSetup,
  getActiveWorkout,
  listBodyMetrics,
  listDatedSets,
  listExercises,
  listTemplates,
  listWorkouts,
} from "@/server/queries/gym";
import { computePRs, weekRange, workoutSummaries } from "@/server/queries/gym-stats";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Gym" };


export default async function GymPage({ searchParams }: PageProps<"/gym">) {
  const start = (await searchParams).start === "1";
  const user = await getCurrentUser();
  await ensureGymSetup(user.id);
  const units = user.settings.units ?? "kg";
  const weekStartsOn = user.settings.weekStartsOn ?? 1;
  const WEEKLY_TARGET = user.settings.workoutTarget ?? 3;
  const [today, active, workouts, library, history, templates, metrics] = await Promise.all([
    getToday(),
    getActiveWorkout(user.id),
    listWorkouts(user.id),
    listExercises(user.id),
    listDatedSets(user.id),
    listTemplates(user.id),
    listBodyMetrics(user.id),
  ]);

  const exById = new Map(library.map((e) => [e.id, e]));
  const kindOf = (id: string): ExerciseKind => exById.get(id)?.kind ?? "strength";
  const { prIds, records } = computePRs(library, history);
  const summaries = workoutSummaries(workouts, library, history, prIds);
  const finished = summaries.filter((w) => !w.inProgress);
  const week = weekRange(today, weekStartsOn);
  const monthPrefix = today.slice(0, 7);
  const since30 = addDays(today, -29);

  let volumeMonth = 0;
  let prs30 = 0;
  const muscleSets = new Map<string, number>();
  for (const [exerciseId, sets] of history) {
    for (const s of sets) {
      if (!isComplete(kindOf(exerciseId), s)) continue;
      if (s.date.startsWith(monthPrefix)) volumeMonth += setVolume(s);
      if (s.date >= since30 && prIds.has(s.id)) prs30++;
      if (s.date >= week.start && s.date <= week.end) {
        const m = MUSCLE_LABEL[exById.get(exerciseId)?.muscle ?? "full_body"];
        muscleSets.set(m, (muscleSets.get(m) ?? 0) + 1);
      }
    }
  }

  const setsPerDay = new Map<string, number>();
  for (const w of finished) setsPerDay.set(w.date, (setsPerDay.get(w.date) ?? 0) + w.sets);
  const heat = Object.fromEntries(
    [...setsPerDay].map(([date, n]) => [date, n >= 20 ? 4 : n >= 12 ? 3 : n >= 6 ? 2 : 1]),
  );

  const bestLabel = (exerciseId: string) => {
    const r = records.get(exerciseId);
    const kind = kindOf(exerciseId);
    if (!r?.best) return null;
    if (kind === "strength") return `${formatWeight(r.best.weight ?? 0, units)} × ${r.best.reps}`;
    if (kind === "bodyweight") return `${r.mostReps} reps${r.heaviest ? ` · +${formatWeight(r.heaviest, units)}` : ""}`;
    if (kind === "cardio") return r.longest ? `${r.longest} km` : formatDuration(r.best.durationSec ?? 0);
    return formatDuration(r.longest);
  };
  const recordCards = [...history.entries()]
    .map(([exerciseId, sets]) => ({
      exerciseId,
      name: exById.get(exerciseId)?.name ?? "Exercise",
      best: bestLabel(exerciseId),
      sessions: new Set(sets.filter((s) => isComplete(kindOf(exerciseId), s)).map((s) => s.workoutId)).size,
    }))
    .filter((r): r is typeof r & { best: string } => r.best !== null && r.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6);

  return (
    <>
      {start && <AutoStart />}
    <GymOverview
      today={today}
      units={units}
      weekStartsOn={weekStartsOn}
      weeklyTarget={WEEKLY_TARGET}
      active={active ? { id: active.id, name: active.name } : null}
      stats={{
        thisWeek: new Set(finished.filter((w) => w.date >= week.start && w.date <= week.end).map((w) => w.id)).size,
        streak: weeklyWorkoutStreak(
          finished.map((w) => w.date),
          today,
          WEEKLY_TARGET,
          weekStartsOn,
        ),
        volumeMonth: toDisplayWeight(volumeMonth, units),
        prs30,
      }}
      heat={heat}
      workouts={summaries.map((w) => ({ ...w, volume: toDisplayWeight(w.volume, units) }))}
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        exercises: t.items.map((i) => exById.get(i.exerciseId)?.name).filter((n): n is string => !!n),
      }))}
      records={recordCards}
      muscles={[...muscleSets.entries()].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets)}
      body={metrics
        .filter((m) => m.weight !== null && m.date >= addDays(today, -180))
        .map((m) => ({ date: m.date, weight: toDisplayWeight(m.weight!, units), bodyFat: m.bodyFat }))}
    />
    </>
  );
}
