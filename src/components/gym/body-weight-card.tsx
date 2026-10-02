"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { LineChart } from "@/components/charts/line-chart";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Day, toDate } from "@/lib/dates";
import type { Units } from "@/lib/fitness";
import { logBodyMetric } from "@/server/actions/gym";

const short = (d: Day) => toDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Body weight trend (display units) with a quick log dialog. */
export function BodyWeightCard({
  points,
  units,
  today,
}: {
  points: { date: Day; weight: number; bodyFat: number | null }[];
  units: Units;
  today: Day;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [state, action, pending] = useActionState(async (prev: unknown, fd: FormData) => {
    const res = await logBodyMetric(prev, fd);
    if ("ok" in res) setOpen(false);
    return res;
  }, null);

  const latest = points.at(-1);
  const first = points[0];
  const change = latest && first && points.length > 1 ? Math.round((latest.weight - first.weight) * 10) / 10 : null;

  return (
    <ChartCard
      title="Body weight"
      className="h-full"
      subtitle={
        latest ? (
          <span>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {latest.weight} {units}
            </span>
            {change !== null && change !== 0 && (
              <span className="ml-2">
                {change > 0 ? "+" : ""}
                {change} {units} since {short(first.date)}
              </span>
            )}
          </span>
        ) : (
          "Log your weight to see the trend"
        )
      }
      table={{
        columns: ["Date", `Weight (${units})`, "Body fat"],
        rows: [...points].reverse().map((p) => [short(p.date), p.weight, p.bodyFat ? `${p.bodyFat}%` : "—"]),
      }}
    >
      {points.length > 1 ? (
        <LineChart
          ariaLabel="Body weight over time"
          labels={points.map((p) => short(p.date))}
          series={[{ name: "Weight", tone: "fg", values: points.map((p) => p.weight) }]}
          format={(v) => `${v} ${units}`}
          formatAxis={(v) => String(v)}
          height={160}
          baseline="fit"
        />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed text-sm text-muted">
          {points.length ? "One more entry and the line appears." : "No entries yet."}
        </div>
      )}
      <Dialog open={open} onOpenChange={(o) => (setOpen(o), o && setKey((k) => k + 1))}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="mt-4 w-full">
            <Plus /> Log weight
          </Button>
        </DialogTrigger>
        <DialogContent title="Log body metrics">
          <form key={key} action={action} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bm-weight">Weight ({units})</Label>
                <Input id="bm-weight" name="weight" inputMode="decimal" defaultValue={latest?.weight ?? ""} autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bm-fat">Body fat % (optional)</Label>
                <Input id="bm-fat" name="bodyFat" inputMode="decimal" defaultValue={latest?.bodyFat ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bm-date">Date</Label>
              <Input id="bm-date" name="date" type="date" defaultValue={today} max={today} />
            </div>
            {state && "message" in state && <p className="text-xs text-muted">— {state.message}</p>}
            {state && "errors" in state && <p className="text-xs text-muted">— Check the values</p>}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </ChartCard>
  );
}
