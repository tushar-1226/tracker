import { describe, expect, it } from "vitest";
import type { Graha } from "./constants";
import { detectYogas } from "./yogas";

type P = { graha: Graha; longitude: number; rashi: number; dignity: "exalted" | "debilitated" | "own" | null };
const chart = (signs: Partial<Record<Graha, number>>, dignity: Partial<Record<Graha, P["dignity"]>> = {}): P[] =>
  (["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as Graha[]).map((g) => {
    const rashi = signs[g] ?? 0;
    return { graha: g, rashi, longitude: rashi * 30 + 15, dignity: dignity[g] ?? null };
  });
const keys = (p: P[], ref = 0) => detectYogas(p, ref).map((y) => y.key);

describe("yogas", () => {
  it("Gaja Kesari when Jupiter is in a kendra from the Moon", () => {
    expect(keys(chart({ Moon: 2, Jupiter: 8, Rahu: 4, Ketu: 10 }))).toContain("gajaKesari"); // 7th
    expect(keys(chart({ Moon: 2, Jupiter: 4, Rahu: 6, Ketu: 0 }))).not.toContain("gajaKesari"); // 3rd
  });
  it("Hamsa when Jupiter is exalted in a kendra from the Lagna", () => {
    expect(keys(chart({ Jupiter: 3, Rahu: 5, Ketu: 11 }, { Jupiter: "exalted" }), 0)).toContain("hamsa"); // 4th from Aries
  });
  it("Mangal Dosha by Mars' house from the Lagna", () => {
    expect(keys(chart({ Mars: 6, Rahu: 2, Ketu: 8 }), 0)).toContain("mangalDosha"); // 7th
    expect(keys(chart({ Mars: 2, Rahu: 4, Ketu: 10 }), 0)).not.toContain("mangalDosha"); // 3rd
  });
  it("Kaal Sarp when all planets sit on one side of the nodes", () => {
    const p = chart({ Rahu: 0, Ketu: 6, Sun: 1, Moon: 2, Mars: 3, Mercury: 1, Jupiter: 4, Venus: 2, Saturn: 5 });
    expect(keys(p)).toContain("kaalSarp");
    expect(keys(chart({ Rahu: 0, Ketu: 6, Sun: 1, Moon: 8 }))).not.toContain("kaalSarp");
  });
  it("Kemadruma when the Moon has no planetary neighbours", () => {
    expect(keys(chart({ Moon: 6, Sun: 6, Mars: 0, Mercury: 0, Jupiter: 0, Venus: 0, Saturn: 0, Rahu: 3, Ketu: 9 }))).toContain("kemadruma");
  });
});
