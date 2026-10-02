import { describe, expect, it } from "vitest";
import {
  type DatedSet,
  e1rm,
  findPRs,
  formatWeight,
  fromDisplayWeight,
  summarizeSets,
  weeklyWorkoutStreak,
} from "./fitness";

const set = (id: string, date: string, workoutId: string, weight: number, reps: number, done = true): DatedSet => ({
  id,
  date,
  workoutId,
  weight,
  reps,
  distance: null,
  durationSec: null,
  done,
});

describe("e1rm", () => {
  it("uses Epley and returns the weight for singles", () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1);
    expect(e1rm(0, 5)).toBe(0);
  });
});

describe("PRs", () => {
  it("never marks the first workout, then flags improvements once per workout", () => {
    const sets = [
      set("a1", "2026-09-01", "w1", 60, 8),
      set("a2", "2026-09-01", "w1", 65, 5),
      set("b1", "2026-09-05", "w2", 62.5, 8), // e1rm 79.2 > 75.8 → PR
      set("b2", "2026-09-05", "w2", 70, 5), // 81.7 → better PR in same workout
      set("c1", "2026-09-09", "w3", 60, 5), // not a PR
    ];
    const { prIds, records } = findPRs("strength", sets);
    expect([...prIds]).toEqual(["b2"]);
    expect(records.heaviest).toBe(70);
    expect(records.best?.id).toBe("b2");
  });

  it("ignores sets not marked done", () => {
    const sets = [set("a", "2026-09-01", "w1", 60, 8), set("b", "2026-09-02", "w2", 200, 8, false)];
    expect(findPRs("strength", sets).prIds.size).toBe(0);
  });

  it("ranks bodyweight sets by reps", () => {
    const sets = [
      { ...set("a", "2026-09-01", "w1", 0, 8) },
      { ...set("b", "2026-09-03", "w2", 0, 10) },
    ];
    expect([...findPRs("bodyweight", sets).prIds]).toEqual(["b"]);
  });
});

describe("streak", () => {
  it("counts consecutive weeks hitting the target; the current week never breaks it", () => {
    const today = "2026-10-02"; // Fri; week starts Mon 28 Sep
    const dates = ["2026-09-14", "2026-09-16", "2026-09-18", "2026-09-21", "2026-09-23", "2026-09-25", "2026-09-29"];
    expect(weeklyWorkoutStreak(dates, today, 3)).toBe(2);
    expect(weeklyWorkoutStreak([...dates, "2026-09-30", "2026-10-01"], today, 3)).toBe(3);
  });
});

describe("units & summaries", () => {
  it("converts and formats", () => {
    expect(formatWeight(100, "lb")).toBe("220.5 lb");
    expect(fromDisplayWeight(220.462, "lb")).toBeCloseTo(100, 2);
  });
  it("summarises sets", () => {
    const s = [set("a", "d", "w", 60, 8), set("b", "d", "w", 60, 8), set("c", "d", "w", 60, 8)];
    expect(summarizeSets("strength", s, "kg")).toBe("3 × 8 @ 60 kg");
  });
});
