import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, type AchievementMetrics, tiersReached } from "./achievements";
import { goalProgress } from "./goals";
import { budgetPart, fitnessPart, lifeScore } from "./life-score";
import { moduleOf } from "./modules";

describe("life score", () => {
  it("averages only the modules in use", () => {
    expect(lifeScore({ habits: 1, fitness: 0.5, money: null })).toBe(75);
    expect(lifeScore({})).toBeNull();
  });
  it("scores the workout week by pace", () => {
    expect(fitnessPart(true, 0, 0, 3)).toBe(1);
    expect(fitnessPart(false, 1, 2, 3)).toBeCloseTo(0.78, 2); // Wed, 1 of 1.29 expected
    expect(fitnessPart(false, 3, 6, 3)).toBe(1);
  });
  it("scores spending against the daily share", () => {
    expect(budgetPart(50, 100)).toBe(1);
    expect(budgetPart(150, 100)).toBe(0.5);
    expect(budgetPart(500, 100)).toBe(0);
    expect(budgetPart(10, 0)).toBeNull();
  });
});

describe("achievements", () => {
  const zero = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.metric, 0])) as unknown as AchievementMetrics;
  it("counts tiers reached", () => {
    const bench = ACHIEVEMENTS.find((a) => a.key === "bench")!;
    expect(tiersReached(bench, { ...zero, benchE1rmKg: 84 })).toBe(1);
    expect(tiersReached(bench, { ...zero, benchE1rmKg: 150 })).toBe(3);
  });
  it("has unique keys", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.key)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe("goals & modules", () => {
  it("measures up and down goals", () => {
    expect(goalProgress(84, 100, null)).toBe(0.84);
    expect(goalProgress(78, 75, 80)).toBe(0.4); // lose 5 kg, lost 2
    expect(goalProgress(null, 10, null)).toBe(0);
  });
  it("maps XP sources to modules", () => {
    expect(moduleOf("workout-pr")).toBe("fitness");
    expect(moduleOf("achievement")).toBeNull();
  });
});
