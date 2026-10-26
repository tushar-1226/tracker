/** Muhurta scoring: how auspicious a day is for a purpose, from its panchang. Pure. */

export type Purpose = "marriage" | "venture" | "purchase" | "home";

export const PURPOSES: { value: Purpose; label: string; about: string }[] = [
  { value: "marriage", label: "Marriage", about: "Vivah, engagement" },
  { value: "venture", label: "New work", about: "Business, job, launch, first day" },
  { value: "purchase", label: "Purchase", about: "Vehicle, property, gold, electronics" },
  { value: "home", label: "Griha pravesh", about: "Moving into a new home" },
];

export type FactorKey =
  | "nakshatraGood"
  | "nakshatraBad"
  | "tithiGood"
  | "tithiBad"
  | "amavasya"
  | "ashtami"
  | "shukla"
  | "weekdayGood"
  | "weekdayBad"
  | "yogaGood"
  | "yogaBad"
  | "vishti"
  | "panchak"
  | "venusCombust"
  | "jupiterCombust"
  | "mercuryRetro"
  | "chandrashtama"
  | "taraGood"
  | "taraBad";

export type Factor = { key: FactorKey; good: boolean; points: number };

export type DayFacts = {
  /** 0 = Sunday. */
  weekday: number;
  /** Tithi number 1–30 and day within its paksha 1–15. */
  tithi: { number: number; day: number };
  nakshatra: { index: number; pada: number };
  yoga: number;
  karana: number;
  venusCombust: boolean;
  jupiterCombust: boolean;
  mercuryRetro: boolean;
  /** Against the user's birth chart, when known. */
  personal?: { chandrashtama: boolean; taraGood: boolean };
};

const GOOD_NAK: Record<Purpose, number[]> = {
  marriage: [3, 4, 9, 11, 12, 14, 16, 18, 20, 25, 26],
  venture: [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 25, 26],
  purchase: [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26],
  home: [3, 4, 7, 11, 12, 16, 20, 22, 23, 25, 26],
};
// Bharani, Krittika, Ardra, Ashlesha, Jyeshtha (and Mula, except for marriage).
const BAD_NAK = [1, 2, 5, 8, 17];
const GOOD_TITHI: Record<Purpose, number[]> = {
  marriage: [2, 3, 5, 7, 10, 11, 12, 13],
  venture: [2, 3, 5, 7, 10, 11, 13, 15],
  purchase: [2, 3, 5, 7, 10, 11, 13, 15],
  home: [2, 3, 5, 7, 10, 11, 13],
};
const RIKTA = [4, 9, 14];
const GOOD_WEEKDAY = [1, 3, 4, 5]; // Mon, Wed, Thu, Fri
const BAD_YOGA = [0, 5, 8, 9, 12, 14, 16, 18, 26]; // Vishkambha, Atiganda, Shula, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti
const GOOD_YOGA = [1, 2, 3, 4, 6, 7, 10, 11, 13, 15, 19, 20, 21, 22, 23, 24, 25];
const VISHTI = 6;

export type DayScore = { score: number; factors: Factor[]; avoid: boolean; verdict: "great" | "good" | "fair" | "avoid" };

export function scoreDay(purpose: Purpose, d: DayFacts): DayScore {
  const factors: Factor[] = [];
  let avoid = false;
  const add = (key: FactorKey, points: number) => factors.push({ key, good: points > 0, points });

  const nak = d.nakshatra.index;
  if (GOOD_NAK[purpose].includes(nak)) add("nakshatraGood", 20);
  else if (BAD_NAK.includes(nak) || (nak === 18 && purpose !== "marriage")) add("nakshatraBad", -25);

  if (d.tithi.number === 30) {
    add("amavasya", -30);
    avoid = true;
  } else if (RIKTA.includes(d.tithi.day)) add("tithiBad", -20);
  else if (d.tithi.day === 8) add("ashtami", -10);
  else if (GOOD_TITHI[purpose].includes(d.tithi.day)) add("tithiGood", 15);
  if (d.tithi.number <= 15) add("shukla", 4);

  if (d.weekday === 2) add("weekdayBad", -12);
  else if (d.weekday === 6) add("weekdayBad", -8);
  else if (GOOD_WEEKDAY.includes(d.weekday)) add("weekdayGood", 8);

  if (BAD_YOGA.includes(d.yoga)) add("yogaBad", -20);
  else if (GOOD_YOGA.includes(d.yoga)) add("yogaGood", 5);

  if (d.karana === VISHTI) add("vishti", -15);
  if (nak === 22 ? d.nakshatra.pada >= 3 : nak > 22) add("panchak", -10);

  if (purpose === "marriage") {
    if (d.venusCombust) {
      add("venusCombust", -35);
      avoid = true;
    }
    if (d.jupiterCombust) {
      add("jupiterCombust", -35);
      avoid = true;
    }
  }
  if ((purpose === "purchase" || purpose === "venture") && d.mercuryRetro) add("mercuryRetro", -8);

  if (d.personal) {
    if (d.personal.chandrashtama) add("chandrashtama", -25);
    else add(d.personal.taraGood ? "taraGood" : "taraBad", d.personal.taraGood ? 5 : -10);
  }

  const score = Math.max(0, Math.min(100, 50 + factors.reduce((s, f) => s + f.points, 0)));
  const verdict = avoid || score < 45 ? "avoid" : score >= 80 ? "great" : score >= 62 ? "good" : "fair";
  return { score, factors, avoid, verdict };
}
