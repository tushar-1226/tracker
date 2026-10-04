/** Client-safe Vedic astrology constants and pure helpers (no ephemeris here). */

export const RASHIS = [
  { name: "Mesha", en: "Aries", lord: "Mars" },
  { name: "Vrishabha", en: "Taurus", lord: "Venus" },
  { name: "Mithuna", en: "Gemini", lord: "Mercury" },
  { name: "Karka", en: "Cancer", lord: "Moon" },
  { name: "Simha", en: "Leo", lord: "Sun" },
  { name: "Kanya", en: "Virgo", lord: "Mercury" },
  { name: "Tula", en: "Libra", lord: "Venus" },
  { name: "Vrishchika", en: "Scorpio", lord: "Mars" },
  { name: "Dhanu", en: "Sagittarius", lord: "Jupiter" },
  { name: "Makara", en: "Capricorn", lord: "Saturn" },
  { name: "Kumbha", en: "Aquarius", lord: "Saturn" },
  { name: "Meena", en: "Pisces", lord: "Jupiter" },
] as const;

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

export type Graha = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" | "Rahu" | "Ketu";
export const GRAHAS: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

/** Vimshottari order and years; also the nakshatra lords (repeating every 9). */
export const DASHA_ORDER: { graha: Graha; years: number }[] = [
  { graha: "Ketu", years: 7 },
  { graha: "Venus", years: 20 },
  { graha: "Sun", years: 6 },
  { graha: "Moon", years: 10 },
  { graha: "Mars", years: 7 },
  { graha: "Rahu", years: 18 },
  { graha: "Jupiter", years: 16 },
  { graha: "Saturn", years: 19 },
  { graha: "Mercury", years: 17 },
];

export const TITHIS = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami",
  "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
] as const;

export const YOGAS = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula",
  "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana",
  "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
] as const;

export const KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga", "Kimstughna"] as const;

export const VARAS = [
  { name: "Ravivara", lord: "Sun" as Graha },
  { name: "Somavara", lord: "Moon" as Graha },
  { name: "Mangalavara", lord: "Mars" as Graha },
  { name: "Budhavara", lord: "Mercury" as Graha },
  { name: "Guruvara", lord: "Jupiter" as Graha },
  { name: "Shukravara", lord: "Venus" as Graha },
  { name: "Shanivara", lord: "Saturn" as Graha },
];

export type Place = { name: string; lat: number; lon: number; tz: string };
export type BirthDetails = { date: string; time: string | null; place: Place };

export const norm = (deg: number) => ((deg % 360) + 360) % 360;
export const rashiOf = (lon: number) => Math.floor(norm(lon) / 30);
/** Whole-sign house (1–12) of a sign counted from a reference sign. */
export const houseFrom = (from: number, to: number) => ((to - from + 12) % 12) + 1;

const NAK_SPAN = 360 / 27;
export function nakshatraOf(lon: number) {
  const index = Math.floor(norm(lon) / NAK_SPAN);
  const pada = Math.floor((norm(lon) % NAK_SPAN) / (NAK_SPAN / 4)) + 1;
  return { index, pada, lord: DASHA_ORDER[index % 9].graha, fraction: (norm(lon) % NAK_SPAN) / NAK_SPAN };
}

/** Tithi 1–30 from the Moon–Sun elongation; 1–15 Shukla (waxing), 16–30 Krishna. */
export function tithiOf(sunLon: number, moonLon: number) {
  const n = Math.floor(norm(moonLon - sunLon) / 12) + 1;
  const shukla = n <= 15;
  return { number: n, paksha: shukla ? ("Shukla" as const) : ("Krishna" as const), day: shukla ? n : n - 15 };
}

export const yogaOf = (sunLon: number, moonLon: number) => Math.floor(norm(sunLon + moonLon) / NAK_SPAN);

/** Karana (half-tithi), 1–60 → one of 11 names. */
export function karanaOf(sunLon: number, moonLon: number) {
  const k = Math.floor(norm(moonLon - sunLon) / 6); // 0–59
  if (k === 0) return 10; // Kimstughna
  if (k >= 57) return 7 + (k - 57); // Shakuni, Chatushpada, Naga
  return (k - 1) % 7; // Bava … Vishti
}

/** Navamsa (D9) sign: each sign is split into nine 3°20′ parts continuing around the zodiac. */
export const navamsaOf = (lon: number) => Math.floor(norm(lon) / (30 / 9)) % 12;

// ---------- Dignity ----------

const EXALTATION: Partial<Record<Graha, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 7 };
const OWN: Partial<Record<Graha, number[]>> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
export type Dignity = "exalted" | "debilitated" | "own" | null;

export function dignityOf(g: Graha, rashi: number): Dignity {
  const ex = EXALTATION[g];
  if (ex === rashi) return "exalted";
  if (ex !== undefined && (ex + 6) % 12 === rashi) return "debilitated";
  if (OWN[g]?.includes(rashi)) return "own";
  return null;
}

/** Degrees from the Sun within which a planet is combust (retrograde orbs for Mercury/Venus). */
const COMBUST: Partial<Record<Graha, [number, number]>> = { Moon: [12, 12], Mars: [17, 17], Mercury: [14, 12], Jupiter: [11, 11], Venus: [10, 8], Saturn: [15, 15] };
export function isCombust(g: Graha, lon: number, sunLon: number, retrograde: boolean) {
  const orb = COMBUST[g];
  if (!orb) return false;
  const d = Math.abs(((lon - sunLon + 540) % 360) - 180);
  return d <= (retrograde ? orb[1] : orb[0]);
}

// ---------- Time zones ----------

function offsetMinutes(instant: Date, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(instant)
      .map((x) => [x.type, x.value]),
  );
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - instant.getTime()) / 60_000;
}

/** Wall-clock date + time in a zone → the real instant (historical offsets and DST included). */
export function zonedToUtc(day: string, time: string, timeZone: string) {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ts = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  ts = guess - offsetMinutes(new Date(ts), timeZone) * 60_000;
  return new Date(ts);
}
