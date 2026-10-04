import type { Graha } from "./constants";

/** The parts of a birth chart and a panchang the reading needs. */
type NatalLike = { moonRashi: number; nakshatra: { index: number } };
type PanchangLike = {
  moonRashi: number;
  nakshatra: { index: number };
  tithi: { day: number; number: number };
  waxing: boolean;
  positions: { graha: Graha; rashi: number; retrograde: boolean }[];
};

/** House (1–12) of a sign counted from a reference sign, inclusive (classical Vedic counting). */
export const houseFrom = (from: number, to: number) => ((to - from + 12) % 12) + 1;

// Moon's transit from the Janma Rashi (Chandra Gochara). Favourable: 1, 3, 6, 7, 10, 11.
export const GOOD_MOON_HOUSES = [1, 3, 6, 7, 10, 11];

// Tarabala: today's nakshatra counted from the birth nakshatra, in cycles of nine.
export const TARA_GOOD = [false, true, false, true, false, true, false, true, true];

const RIKTA = new Set([4, 9, 14]); // Chaturthi, Navami, Chaturdashi: traditionally poor for beginnings

export type HeadlineKey = "slow" | "strong" | "steady" | "mixed" | "low";
export type AreaCodes = {
  work: "good" | "careful" | "neutral";
  money: "careful" | "good" | "neutral";
  health: "high" | "low" | "moderate";
  people: "good" | "careful" | "venusRetro" | "steady";
  mind: "mercuryRetro" | "space" | "clear";
};
export type ModuleKey = "gym" | "learning" | "money" | "journal" | "habits";

// Gochara: houses (from the Moon) where each planet's transit is favourable.
export const GOCHARA_GOOD: Record<Graha, number[]> = {
  Sun: [3, 6, 10, 11],
  Moon: [1, 3, 6, 7, 10, 11],
  Mars: [3, 6, 11],
  Mercury: [2, 4, 6, 8, 10, 11],
  Jupiter: [2, 5, 7, 9, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Saturn: [3, 6, 11],
  Rahu: [3, 6, 11],
  Ketu: [3, 6, 11],
};
// Slow planets shape the background of the day more than fast ones.
const GOCHARA_WEIGHT: Partial<Record<Graha, number>> = { Jupiter: 4, Saturn: 4, Rahu: 2, Ketu: 1, Sun: 2, Mars: 2, Mercury: 1, Venus: 1 };
export type AvoidKey = "decisions" | "beginnings" | "spending" | "signing" | "risky";

/** Language-neutral reading: codes only. Text comes from `lib/astro/i18n.ts`. */
export type Reading = {
  score: number;
  headline: { key: HeadlineKey; variant: number };
  moon: { house: number; good: boolean };
  tara: { index: number; good: boolean };
  chandrashtama: boolean;
  rikta: boolean;
  saturn: { house: number; sadeSati: boolean; phase: "rising" | "peak" | "setting" | null };
  jupiter: { house: number; good: boolean };
  areas: AreaCodes;
  transits: { graha: Graha; house: number; good: boolean; retrograde: boolean }[];
  goodFor: { module: ModuleKey; href: string }[];
  avoid: AvoidKey[];
};

/** Deterministic variety: the same day always reads the same. */
function variant(seed: string, n: number) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % n;
}

export function dailyReading(natal: NatalLike, p: PanchangLike, day: string): Reading {
  const moonHouse = houseFrom(natal.moonRashi, p.moonRashi);
  const moonGood = GOOD_MOON_HOUSES.includes(moonHouse);
  const taraIndex = (p.nakshatra.index - natal.nakshatra.index + 27) % 9;
  const taraGood = TARA_GOOD[taraIndex];
  const chandrashtama = moonHouse === 8;
  const rikta = RIKTA.has(p.tithi.day) && p.tithi.number !== 15 && p.tithi.number !== 30;

  const at = (g: string) => p.positions.find((x) => x.graha === g)!;
  const saturnHouse = houseFrom(natal.moonRashi, at("Saturn").rashi);
  const sadeSati = saturnHouse === 12 || saturnHouse === 1 || saturnHouse === 2;
  const jupiterHouse = houseFrom(natal.moonRashi, at("Jupiter").rashi);
  const jupiterGood = [2, 5, 7, 9, 11].includes(jupiterHouse);
  const mercuryRetro = at("Mercury").retrograde;
  const venusRetro = at("Venus").retrograde;

  let score = 50;
  score += moonGood ? 18 : -12;
  if (chandrashtama) score -= 15;
  score += taraGood ? 14 : taraIndex === 0 ? -6 : -14;
  if (rikta) score -= 5;
  if (p.waxing) score += 4;
  if (jupiterGood) score += 5;
  if (sadeSati) score -= 4;
  const transits = p.positions.map((x) => {
    const house = houseFrom(natal.moonRashi, x.rashi);
    return { graha: x.graha, house, good: GOCHARA_GOOD[x.graha].includes(house), retrograde: x.retrograde };
  });
  for (const t of transits) if (t.graha !== "Moon") score += (t.good ? 1 : -1) * (GOCHARA_WEIGHT[t.graha] ?? 0) * 0.5;
  score = Math.max(5, Math.min(95, Math.round(score)));

  const key: HeadlineKey = chandrashtama ? "slow" : score >= 75 ? "strong" : score >= 58 ? "steady" : score >= 42 ? "mixed" : "low";

  const areas: AreaCodes = {
    work: [10, 11, 3, 6].includes(moonHouse) ? "good" : moonHouse === 8 || moonHouse === 12 ? "careful" : "neutral",
    money: moonHouse === 2 || moonHouse === 12 ? "careful" : moonHouse === 11 || jupiterGood ? "good" : "neutral",
    health: [6, 1, 3].includes(moonHouse) ? "high" : [4, 8, 12].includes(moonHouse) || taraIndex === 0 ? "low" : "moderate",
    people: moonHouse === 7 || moonHouse === 11 ? "good" : moonHouse === 2 || taraIndex === 4 ? "careful" : venusRetro ? "venusRetro" : "steady",
    mind: mercuryRetro ? "mercuryRetro" : [4, 5, 8, 12].includes(moonHouse) ? "space" : "clear",
  };

  const goodFor: Reading["goodFor"] = [];
  if ([1, 3, 6, 10].includes(moonHouse)) goodFor.push({ module: "gym", href: "/gym" });
  if (taraGood && [1, 3, 9, 10, 11].includes(moonHouse)) goodFor.push({ module: "learning", href: "/learning" });
  if ([2, 11, 12].includes(moonHouse)) goodFor.push({ module: "money", href: "/budget" });
  if ([4, 8, 12, 5].includes(moonHouse) || score < 45) goodFor.push({ module: "journal", href: "/journal" });
  if (!goodFor.length) goodFor.push({ module: "habits", href: "/habits" });

  const avoid: AvoidKey[] = [];
  if (chandrashtama) avoid.push("decisions");
  if (rikta) avoid.push("beginnings");
  if (moonHouse === 2 || moonHouse === 12) avoid.push("spending");
  if (mercuryRetro) avoid.push("signing");
  if (taraIndex === 6 || taraIndex === 2) avoid.push("risky");

  return {
    score,
    headline: { key, variant: variant(day, 3) },
    moon: { house: moonHouse, good: moonGood },
    tara: { index: taraIndex, good: taraGood },
    chandrashtama,
    rikta,
    saturn: { house: saturnHouse, sadeSati, phase: sadeSati ? (saturnHouse === 12 ? "rising" : saturnHouse === 1 ? "peak" : "setting") : null },
    jupiter: { house: jupiterHouse, good: jupiterGood },
    areas,
    transits,
    goodFor,
    avoid,
  };
}
