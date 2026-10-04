import { describe, expect, it } from "vitest";
import { LANGS, names, readingText, ui } from "./i18n";
import type { Reading } from "./reading";

const base: Reading = {
  score: 50,
  headline: { key: "mixed", variant: 1 },
  moon: { house: 1, good: true },
  tara: { index: 0, good: false },
  chandrashtama: false,
  rikta: true,
  saturn: { house: 1, sadeSati: true, phase: "peak" },
  jupiter: { house: 2, good: true },
  areas: { work: "good", money: "careful", health: "low", people: "venusRetro", mind: "mercuryRetro" },
  transits: [],
  goodFor: [{ module: "gym", href: "/gym" }],
  avoid: ["decisions", "beginnings", "spending", "signing", "risky"],
};
const tithi = { paksha: "Krishna" as const, day: 9, number: 24 };

describe("horoscope translations", () => {
  it("has text for every moon house and tara in every language", () => {
    for (const { value: lang } of LANGS) {
      for (let house = 1; house <= 12; house++) {
        for (let tara = 0; tara < 9; tara++) {
          const t = readingText({ ...base, moon: { house, good: true }, tara: { index: tara, good: true } }, lang, tithi);
          expect(t.summary.length).toBeGreaterThan(40);
          expect(t.headline).toBeTruthy();
        }
      }
    }
  });

  it("covers every area code, module and avoid key", () => {
    for (const { value: lang } of LANGS) {
      const t = readingText(base, lang, tithi);
      expect(t.areas.every((a) => a.text.length > 10)).toBe(true);
      expect(t.goodFor[0].label).toBeTruthy();
      expect(t.avoid).toHaveLength(5);
      expect(t.avoid.every(Boolean)).toBe(true);
    }
  });

  it("writes Hindi in Devanagari and Hinglish in Latin script", () => {
    const hi = readingText(base, "hi", tithi);
    const hinglish = readingText(base, "hinglish", tithi);
    expect(hi.summary).toMatch(/[ऀ-ॿ]/);
    expect(hinglish.summary).not.toMatch(/[ऀ-ॿ]/);
    expect(hi.summary).toContain("कृष्ण नवमी");
    expect(hinglish.summary).toContain("Krishna Navami");
  });

  it("translates names", () => {
    expect(names("hi").rashi(8)).toBe("धनु");
    expect(names("hinglish").rashi(8)).toBe("Dhanu");
    expect(names("en").rashi(8)).toBe("Dhanu · Sagittarius");
    expect(names("hi").graha("Saturn")).toBe("शनि");
    expect(names("hinglish").vara("Ravivara")).toBe("Ravivaar");
    expect(names("hi").nakshatra(18)).toBe("मूल");
  });

  it("has every UI label in every language", () => {
    const keys = Object.keys(ui("en"));
    for (const { value: lang } of LANGS) {
      const labels = ui(lang) as Record<string, unknown>;
      for (const k of keys) expect(labels[k], `${lang}.${k}`).toBeTruthy();
    }
  });
});
