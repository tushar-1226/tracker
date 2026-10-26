import { describe, expect, it } from "vitest";
import { guna, maitriScore, verdictFor, yoniTable } from "./matching";

// Moon longitudes: Mesha 0°, Ashwini = 0–13.33°, Rohini = 40–53.33°, Pushya = 93.33–106.67°
const person = (moonLongitude: number, marsHouse = 3) => ({ moonLongitude, marsHouse });

describe("tables", () => {
  it("yoni scores are symmetric with 4 on the diagonal", () => {
    yoniTable.forEach((row, i) => {
      expect(row[i]).toBe(4);
      row.forEach((v, j) => expect(v).toBe(yoniTable[j][i]));
    });
  });
  it("graha maitri", () => {
    expect(maitriScore("Sun", "Sun")).toBe(5);
    expect(maitriScore("Sun", "Moon")).toBe(5);
    expect(maitriScore("Sun", "Venus")).toBe(0);
    expect(maitriScore("Mars", "Mercury")).toBe(0.5);
  });
});

describe("guna milan", () => {
  it("scores the same chart against itself: nadi dosha, otherwise high", () => {
    const m = guna(person(5), person(5));
    expect(m.kootas.find((k) => k.key === "nadi")!.score).toBe(0);
    expect(m.doshas).toContain("nadi");
    expect(m.kootas.find((k) => k.key === "yoni")!.score).toBe(4);
    expect(m.kootas.find((k) => k.key === "maitri")!.score).toBe(5);
    expect(m.kootas.find((k) => k.key === "gana")!.score).toBe(6);
  });

  it("totals the eight kootas out of 36", () => {
    const m = guna(person(5), person(45));
    expect(m.kootas).toHaveLength(8);
    expect(m.kootas.reduce((s, k) => s + k.max, 0)).toBe(36);
    expect(m.total).toBe(m.kootas.reduce((s, k) => s + k.score, 0));
  });

  it("flags Bhakoot dosha for a 6/8 Moon-sign placement with unfriendly lords", () => {
    // Mesha (Mars) vs Kanya (Mercury): 6th/8th, Mars–Mercury enemy
    const m = guna(person(5), person(155));
    expect(m.kootas.find((k) => k.key === "bhakoot")!.score).toBe(0);
  });

  it("Ashwini and Bharani differ in nadi", () => {
    expect(guna(person(5), person(18)).kootas.find((k) => k.key === "nadi")!.score).toBe(8);
  });

  it("compares Manglik status", () => {
    expect(guna(person(5, 7), person(45, 7)).manglik.balanced).toBe(true);
    expect(guna(person(5, 7), person(45, 3)).manglik).toEqual({ groom: true, bride: false, balanced: false });
  });

  it("verdict bands", () => {
    expect([verdictFor(10), verdictFor(18), verdictFor(25), verdictFor(33)]).toEqual(["low", "average", "good", "excellent"]);
  });
});

describe("with real charts", () => {
  it("matches two natal charts end to end", async () => {
    const { natalChart } = await import("@/server/astro/ephemeris");
    const delhi = { name: "New Delhi", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" };
    const mk = (date: string, time: string) => {
      const n = natalChart({ date, time, place: delhi });
      return { moonLongitude: n.moonLongitude, marsHouse: n.positions.find((p) => p.graha === "Mars")!.house };
    };
    const m = guna(mk("1995-06-15", "08:30"), mk("1997-02-03", "21:10"));
    expect(m.total).toBeGreaterThanOrEqual(0);
    expect(m.total).toBeLessThanOrEqual(36);
    expect(m.kootas).toHaveLength(8);
  });
});
