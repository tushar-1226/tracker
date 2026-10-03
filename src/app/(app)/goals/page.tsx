import type { Metadata } from "next";
import { GoalsView } from "@/components/progress/goals-view";
import { getProgress } from "@/server/progress";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const p = await getProgress();
  return <GoalsView goals={p.goals} lookups={p.lookups} today={p.today} units={p.units} />;
}
