import { describe, expect, it } from "vitest";
import { addDays, isDay, startOfWeek } from "@/lib/dates";
import { type HabitLike, type LogMap, computeStats, dayCompletion, dayLevel, isDue } from "./stats";

const TODAY = "2026-10-02"; // Friday

const habit = (over: Partial<HabitLike> = {}): HabitLike => ({
  type: "check",
  target: 1,
  frequency: { kind: "daily" },
  startDate: "2026-09-01",
  ...over,
});

/** Logs for the given days relative to TODAY (0 = today, -1 = yesterday). */
const logsAt = (offsets: number[], value = 1): LogMap =>
  new Map(offsets.map((o) => [addDays(TODAY, o), value]));

describe("dates", () => {
  it("validates days", () => {
    expect(isDay("2026-02-28")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("2026-2-3")).toBe(false);
  });
  it("finds week start", () => {
    expect(startOfWeek(TODAY, 1)).toBe("2026-09-28");
    expect(startOfWeek(TODAY, 0)).toBe("2026-09-27");
  });
});

describe("daily streaks", () => {
  it("counts consecutive days including today", () => {
    expect(computeStats(habit(), logsAt([0, -1, -2]), TODAY).current).toBe(3);
  });

  it("does not break when today is not done yet", () => {
    expect(computeStats(habit(), logsAt([-1, -2]), TODAY).current).toBe(2);
  });

  it("breaks on a missed past day and remembers the best run", () => {
    const s = computeStats(habit(), logsAt([0, -2, -3, -4, -5]), TODAY);
    expect(s.current).toBe(1);
    expect(s.best).toBe(4);
  });

  it("requires reaching the target for count habits", () => {
    const h = habit({ type: "count", target: 8 });
    const logs = new Map([
      [addDays(TODAY, -1), 8],
      [TODAY, 5],
    ]);
    const s = computeStats(h, logs, TODAY);
    expect(s.current).toBe(1);
    expect(dayLevel(h, 5)).toBe(2);
    expect(dayLevel(h, 8)).toBe(4);
  });

  it("does not penalise an unfinished today in the 30-day rate", () => {
    const h = habit({ startDate: addDays(TODAY, -1) });
    expect(computeStats(h, logsAt([-1]), TODAY).rate30).toBe(1);
  });

  it("uses backfilled logs before the start date", () => {
    const h = habit({ startDate: TODAY });
    expect(computeStats(h, logsAt([0, -1, -2]), TODAY).current).toBe(3);
  });
});

describe("weekday habits", () => {
  // Mon / Wed / Fri
  const h = habit({ frequency: { kind: "weekdays", days: [1, 3, 5] } });

  it("skips off days without breaking the streak", () => {
    // Fri 2 Oct, Wed 30 Sep, Mon 28 Sep
    const s = computeStats(h, logsAt([0, -2, -4]), TODAY);
    expect(s.current).toBe(3);
  });

  it("breaks when a due day is missed", () => {
    // Missing Wed 30 Sep
    expect(computeStats(h, logsAt([0, -4]), TODAY).current).toBe(1);
  });

  it("knows which days are due", () => {
    expect(isDue(h, TODAY)).toBe(true);
    expect(isDue(h, addDays(TODAY, 1))).toBe(false);
  });
});

describe("weekly target habits", () => {
  const h = habit({ frequency: { kind: "weekly", times: 3 } });

  it("counts weeks that hit the target", () => {
    // Previous two weeks: 3 each. This week: 1 so far (does not break).
    const logs = logsAt([-5, -7, -9, -12, -14, -16, 0]);
    const s = computeStats(h, logs, TODAY);
    expect(s.unit).toBe("weeks");
    expect(s.current).toBe(2);
  });

  it("includes the current week once met", () => {
    const logs = logsAt([-5, -7, -9, 0, -1, -2]);
    expect(computeStats(h, logs, TODAY).current).toBe(2);
  });
});

describe("quit habits", () => {
  const h = habit({ type: "quit", startDate: addDays(TODAY, -9) });

  it("counts clean days since the start including today", () => {
    expect(computeStats(h, new Map(), TODAY).current).toBe(10);
  });

  it("resets on a slip and tracks the best gap", () => {
    const s = computeStats(h, logsAt([-3]), TODAY);
    expect(s.current).toBe(3);
    expect(s.best).toBe(6);
  });

  it("is zero on the day of a slip", () => {
    expect(computeStats(h, logsAt([0]), TODAY).current).toBe(0);
  });
});

describe("day completion", () => {
  it("ignores off days and weekly habits that were not done", () => {
    const items = [
      { habit: habit(), logs: logsAt([0]) },
      { habit: habit(), logs: new Map() },
      { habit: habit({ frequency: { kind: "weekdays", days: [6] } }), logs: new Map() },
      { habit: habit({ frequency: { kind: "weekly", times: 2 } }), logs: new Map() },
    ];
    expect(dayCompletion(items, TODAY)).toEqual({ due: 2, done: 1, ratio: 0.5 });
  });
});
