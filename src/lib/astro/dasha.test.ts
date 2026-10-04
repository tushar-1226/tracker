import { describe, expect, it } from "vitest";
import { currentDasha, mahadashas, subPeriods } from "./dasha";

const YEAR = 365.25 * 86_400_000;
const birth = new Date("1995-06-15T03:00:00Z");

describe("vimshottari dasha", () => {
  it("starts with the Moon's nakshatra lord and only its unelapsed share", () => {
    // Moon exactly halfway through Mula (lord Ketu, 7 years) → 3.5 years of Ketu left.
    const mula = 18 * (360 / 27) + 360 / 54;
    const [first, second] = mahadashas(mula, birth);
    expect(first.graha).toBe("Ketu");
    expect((first.end - birth.getTime()) / YEAR).toBeCloseTo(3.5, 5);
    expect(second.graha).toBe("Venus");
    expect((second.end - second.start) / YEAR).toBeCloseTo(20, 5);
  });

  it("covers 120 years over a full cycle", () => {
    const md = mahadashas(0, birth, 9);
    expect((md[8].end - md[0].start) / YEAR).toBeCloseTo(120, 5);
  });

  it("splits a mahadasha into antardashas that start with its own lord and sum to it", () => {
    const md = mahadashas(0, birth, 1)[0]; // Ketu
    const ads = subPeriods(md);
    expect(ads[0].graha).toBe("Ketu");
    expect(ads[1].graha).toBe("Venus");
    expect(ads[8].end).toBeCloseTo(md.end, -2);
  });

  it("finds the running periods", () => {
    const d = currentDasha(100, birth, new Date("2026-10-04T00:00:00Z"));
    const now = new Date("2026-10-04T00:00:00Z").getTime();
    for (const p of [d.maha, d.antar, d.pratyantar]) expect(now >= p.start && now < p.end).toBe(true);
  });
});
