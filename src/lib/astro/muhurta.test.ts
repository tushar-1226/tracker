import { describe, expect, it } from "vitest";
import { type DayFacts, scoreDay } from "./muhurta";

const base: DayFacts = {
  weekday: 4, // Thursday
  tithi: { number: 5, day: 5 }, // Shukla Panchami
  nakshatra: { index: 4, pada: 2 }, // Mrigashira
  yoga: 3, // Saubhagya
  karana: 1,
  venusCombust: false,
  jupiterCombust: false,
  mercuryRetro: false,
};

describe("scoreDay", () => {
  it("rates a clean Thursday Panchami in Mrigashira as great", () => {
    const r = scoreDay("marriage", base);
    expect(r.verdict).toBe("great");
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it("avoids Amavasya whatever else is good", () => {
    const r = scoreDay("venture", { ...base, tithi: { number: 30, day: 15 } });
    expect(r.avoid).toBe(true);
    expect(r.verdict).toBe("avoid");
  });

  it("avoids marriage when Venus is combust but not a purchase", () => {
    expect(scoreDay("marriage", { ...base, venusCombust: true }).verdict).toBe("avoid");
    expect(scoreDay("purchase", { ...base, venusCombust: true }).verdict).not.toBe("avoid");
  });

  it("penalises Rikta tithi, Tuesday, bad yoga and Vishti", () => {
    const r = scoreDay("home", { ...base, weekday: 2, tithi: { number: 9, day: 9 }, yoga: 16, karana: 6 });
    const keys = r.factors.map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(["tithiBad", "weekdayBad", "yogaBad", "vishti"]));
    expect(r.verdict).toBe("avoid");
  });

  it("treats Mula as good for marriage and bad otherwise", () => {
    const mula = { ...base, nakshatra: { index: 18, pada: 1 } };
    expect(scoreDay("marriage", mula).factors.some((f) => f.key === "nakshatraGood")).toBe(true);
    expect(scoreDay("venture", mula).factors.some((f) => f.key === "nakshatraBad")).toBe(true);
  });

  it("counts Chandrashtama against the user", () => {
    const r = scoreDay("venture", { ...base, personal: { chandrashtama: true, taraGood: true } });
    expect(r.factors.some((f) => f.key === "chandrashtama")).toBe(true);
    expect(r.score).toBeLessThan(scoreDay("venture", base).score);
  });

  it("flags Panchak nakshatras", () => {
    expect(scoreDay("venture", { ...base, nakshatra: { index: 24, pada: 1 } }).factors.some((f) => f.key === "panchak")).toBe(true);
    expect(scoreDay("venture", { ...base, nakshatra: { index: 22, pada: 1 } }).factors.some((f) => f.key === "panchak")).toBe(false);
  });
});
