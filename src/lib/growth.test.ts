import { describe, expect, it } from "vitest";
import { bookEta, compareByDays, dayStreak, nextMilestone, readingPace, studyXp } from "./growth";

describe("learning", () => {
  it("awards 15 XP per 25 minutes, capped", () => {
    expect(studyXp(25)).toBe(15);
    expect(studyXp(500)).toBe(120);
  });
  it("finds the next hour milestone", () => {
    expect(nextMilestone(7)).toEqual({ next: 10, prev: 5, progress: 0.4 });
    expect(nextMilestone(0).next).toBe(1);
  });
  it("counts day streaks that survive an unfinished today", () => {
    expect(dayStreak(["2026-10-01", "2026-09-30", "2026-09-28"], "2026-10-02")).toBe(2);
    expect(dayStreak(["2026-10-02", "2026-10-01"], "2026-10-02")).toBe(2);
    expect(dayStreak([], "2026-10-02")).toBe(0);
  });
});

describe("books", () => {
  it("compares finished books with the even pace", () => {
    // 2 Oct is day 275 of 365 → expected 9.04 of 12
    const p = readingPace(12, 10, "2026-10-02");
    expect(p.expected).toBeCloseTo(9.04, 1);
    expect(p.delta).toBeGreaterThan(0);
  });
  it("estimates days left from the last 14 days", () => {
    const logs = [
      { date: "2026-10-01", pages: 140 },
      { date: "2026-09-01", pages: 999 },
    ];
    expect(bookEta(100, logs, "2026-10-02")).toBe(10);
    expect(bookEta(100, [], "2026-10-02")).toBeNull();
  });
});

describe("journal", () => {
  it("splits means by a day set", () => {
    const entries = [
      { date: "a", mood: 5 },
      { date: "b", mood: 3 },
      { date: "c", mood: null },
      { date: "d", mood: 2 },
    ];
    const r = compareByDays(entries, new Set(["a", "b"]), (e) => e.mood);
    expect(r.with).toBe(4);
    expect(r.without).toBe(2);
  });
});
