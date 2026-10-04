import { describe, expect, it } from "vitest";
import { dailyReading, houseFrom } from "./reading";
import { natalChart, panchang } from "@/server/astro/ephemeris";

const DELHI = { name: "New Delhi", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" };

describe("house counting", () => {
  it("counts inclusively from the reference sign", () => {
    expect(houseFrom(0, 0)).toBe(1);
    expect(houseFrom(0, 7)).toBe(8);
    expect(houseFrom(11, 0)).toBe(2);
  });
});

describe("daily reading", () => {
  const natal = natalChart({ date: "1995-06-15", time: "08:30", place: DELHI });
  const p = panchang("2026-10-04", DELHI);

  it("is deterministic for a day", () => {
    expect(dailyReading(natal, p, "2026-10-04")).toEqual(dailyReading(natal, p, "2026-10-04"));
  });

  it("flags Chandrashtama when the Moon transits the 8th from the birth Moon", () => {
    const fakeNatal = { ...natal, moonRashi: (p.moonRashi + 12 - 7) % 12 };
    const r = dailyReading(fakeNatal, p, "2026-10-04");
    expect(r.moon.house).toBe(8);
    expect(r.chandrashtama).toBe(true);
    expect(r.headline.key).toBe("slow");
    expect(r.avoid).toContain("decisions");
  });

  it("scores a favourable Moon and Tara above an unfavourable pair", () => {
    const good = dailyReading({ ...natal, moonRashi: p.moonRashi, nakshatra: { ...natal.nakshatra, index: (p.nakshatra.index + 19) % 27 } }, p, "x"); // 1st house, Parama Mitra (9th from birth star)
    const bad = dailyReading({ ...natal, moonRashi: (p.moonRashi + 1) % 12, nakshatra: { ...natal.nakshatra, index: (p.nakshatra.index + 21) % 27 } }, p, "x"); // 12th house, Naidhana
    expect(good.tara.index).toBe(8); // Parama Mitra
    expect(bad.tara.index).toBe(6); // Naidhana
    expect(good.score).toBeGreaterThan(bad.score + 30);
  });

  it("detects Sade Sati from Saturn's house relative to the Moon", () => {
    const saturn = p.positions.find((x) => x.graha === "Saturn")!.rashi;
    const r = dailyReading({ ...natal, moonRashi: saturn }, p, "x");
    expect(r.saturn).toMatchObject({ house: 1, sadeSati: true, phase: "peak" });
  });
});

describe("gochara transits", () => {
  it("lists all nine grahas with their house from the birth Moon", () => {
    const natal = natalChart({ date: "1995-06-15", time: "08:30", place: { name: "New Delhi", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" } });
    const r = dailyReading(natal, panchang("2026-10-04", { name: "New Delhi", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" }), "x");
    expect(r.transits).toHaveLength(9);
    const saturn = r.transits.find((t) => t.graha === "Saturn")!;
    expect(saturn.good).toBe([3, 6, 11].includes(saturn.house));
  });
});
