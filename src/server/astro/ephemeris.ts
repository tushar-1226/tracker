import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import sweph from "sweph";
import {
  type BirthDetails,
  GRAHAS,
  type Graha,
  type Place,
  VARAS,
  dignityOf,
  houseFrom,
  isCombust,
  karanaOf,
  nakshatraOf,
  navamsaOf,
  norm,
  rashiOf,
  tithiOf,
  yogaOf,
  zonedToUtc,
} from "@/lib/astro/constants";

/**
 * Swiss Ephemeris (sweph). Sidereal positions with the Lahiri ayanamsa, true lunar node for
 * Rahu/Ketu. Uses the JPL-derived .se1 files in /ephe when present, otherwise the built-in
 * Moshier ephemeris (still sub-arcsecond for planets).
 */
const C = sweph.constants;
const EPHE_DIR = path.join(process.cwd(), "ephe");
const HAS_FILES = existsSync(path.join(EPHE_DIR, "sepl_18.se1"));
if (HAS_FILES) sweph.set_ephe_path(EPHE_DIR);
sweph.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);

const EPHE = HAS_FILES ? C.SEFLG_SWIEPH : C.SEFLG_MOSEPH;
const FLAGS = EPHE | C.SEFLG_SIDEREAL | C.SEFLG_SPEED;
const BODY: Record<Exclude<Graha, "Ketu">, number> = {
  Sun: C.SE_SUN,
  Moon: C.SE_MOON,
  Mars: C.SE_MARS,
  Mercury: C.SE_MERCURY,
  Jupiter: C.SE_JUPITER,
  Venus: C.SE_VENUS,
  Saturn: C.SE_SATURN,
  Rahu: C.SE_TRUE_NODE,
};

export const ephemerisSource = HAS_FILES ? "Swiss Ephemeris (DE431 files)" : "Swiss Ephemeris (Moshier)";

const toJd = (d: Date) => d.getTime() / 86_400_000 + 2440587.5;
const fromJd = (jd: number) => new Date((jd - 2440587.5) * 86_400_000);

function lonSpeed(jd: number, g: Graha): [number, number] {
  if (g === "Ketu") {
    const [lon, sp] = lonSpeed(jd, "Rahu");
    return [norm(lon + 180), sp];
  }
  const r = sweph.calc_ut(jd, BODY[g], FLAGS);
  if (r.error && r.flag < 0) throw new Error(`sweph: ${r.error}`);
  return [r.data[0], r.data[3]];
}

export type GrahaPosition = {
  graha: Graha;
  longitude: number;
  rashi: number;
  degree: number;
  speed: number;
  retrograde: boolean;
  nakshatra: { index: number; pada: number; lord: Graha };
  navamsa: number;
  dignity: ReturnType<typeof dignityOf>;
  combust: boolean;
};

export function grahaPositions(date: Date): GrahaPosition[] {
  const jd = toJd(date);
  const raw = GRAHAS.map((g) => [g, ...lonSpeed(jd, g)] as const);
  const sun = raw[0][1];
  return raw.map(([g, lon, speed]) => {
    const rashi = rashiOf(lon);
    const retrograde = g === "Rahu" || g === "Ketu" ? true : speed < 0;
    const nak = nakshatraOf(lon);
    return {
      graha: g,
      longitude: lon,
      rashi,
      degree: lon % 30,
      speed,
      retrograde,
      nakshatra: { index: nak.index, pada: nak.pada, lord: nak.lord },
      navamsa: navamsaOf(lon),
      dignity: dignityOf(g, rashi),
      combust: g !== "Sun" && isCombust(g, lon, sun, retrograde),
    };
  });
}

/** Sidereal ascendant (Lagna) for an instant and place (east longitude positive). */
export function ascendant(date: Date, lat: number, lon: number) {
  const h = sweph.houses_ex2(toJd(date), C.SEFLG_SIDEREAL, lat, lon, "W");
  return norm(h.data.points[0]);
}

export const ayanamsa = (date: Date) => sweph.get_ayanamsa_ex_ut(toJd(date), EPHE).data;

function riseSet(body: number, from: Date, place: Place, rsmi: number) {
  const r = sweph.rise_trans(toJd(from), body, null, EPHE, rsmi, [place.lon, place.lat, 0], 1013.25, 15);
  return r.flag === 0 ? fromJd(r.data) : null;
}

/** First time after `start` when f (an angle in degrees, increasing) reaches `target` (mod 360). */
function findCrossing(f: (jd: number) => number, target: number, startJd: number, maxDays = 3) {
  const diff = (jd: number) => ((f(jd) - target + 540) % 360) - 180;
  const step = 1 / 24;
  let lo = startJd;
  let hi = lo + step;
  while (diff(hi) < 0 && hi - startJd < maxDays) {
    lo = hi;
    hi += step;
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) < 0) lo = mid;
    else hi = mid;
  }
  return fromJd(hi);
}

const sunMoon = (jd: number) => [lonSpeed(jd, "Sun")[0], lonSpeed(jd, "Moon")[0]] as const;

// Weekday (Sun=0) → which eighth of daylight each kaal occupies.
const RAHU = [8, 2, 7, 5, 6, 4, 3];
const YAMAGANDA = [5, 4, 3, 2, 1, 7, 6];
const GULIKA = [7, 6, 5, 4, 3, 2, 1];

/** Full panchang for a local day at a place: angas with end times, rise/set and muhurtas. */
export function panchang(day: string, place: Place) {
  const midnight = zonedToUtc(day, "00:00", place.tz);
  const sunrise = riseSet(C.SE_SUN, midnight, place, C.SE_CALC_RISE) ?? zonedToUtc(day, "06:00", place.tz);
  const sunset = riseSet(C.SE_SUN, sunrise, place, C.SE_CALC_SET) ?? zonedToUtc(day, "18:00", place.tz);
  const nextSunrise = riseSet(C.SE_SUN, sunset, place, C.SE_CALC_RISE) ?? new Date(sunrise.getTime() + 86_400_000);
  const moonrise = riseSet(C.SE_MOON, midnight, place, C.SE_CALC_RISE);
  const moonset = riseSet(C.SE_MOON, midnight, place, C.SE_CALC_SET);

  const jd = toJd(sunrise);
  const [sun, moon] = sunMoon(jd);
  const t = tithiOf(sun, moon);
  const nak = nakshatraOf(moon);
  const yoga = yogaOf(sun, moon);
  const karana = karanaOf(sun, moon);

  const elong = (x: number) => {
    const [s, m] = sunMoon(x);
    return norm(m - s);
  };
  const moonLon = (x: number) => sunMoon(x)[1];
  const yogaSum = (x: number) => {
    const [s, m] = sunMoon(x);
    return norm(s + m);
  };
  const span = 360 / 27;

  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const dayLen = sunset.getTime() - sunrise.getTime();
  const part = dayLen / 8;
  const kaal = (n: number) => ({ start: new Date(sunrise.getTime() + (n - 1) * part), end: new Date(sunrise.getTime() + n * part) });
  const muhurta = dayLen / 15;
  const noon = sunrise.getTime() + dayLen / 2;
  const nightMuhurta = (nextSunrise.getTime() - sunset.getTime()) / 15;

  const illum = sweph.pheno_ut(jd, C.SE_MOON, EPHE).data[1];
  const positions = grahaPositions(sunrise);

  return {
    sunrise,
    sunset,
    moonrise,
    moonset,
    vara: VARAS[weekday],
    tithi: { ...t, ends: findCrossing(elong, t.number * 12, jd) },
    nakshatra: { ...nak, ends: findCrossing(moonLon, ((nak.index + 1) * span) % 360, jd) },
    yoga: { index: yoga, ends: findCrossing(yogaSum, ((yoga + 1) * span) % 360, jd) },
    karana: { index: karana, ends: findCrossing(elong, (Math.floor(norm(moon - sun) / 6) + 1) * 6, jd) },
    moonRashi: rashiOf(moon),
    moonIllumination: illum,
    waxing: t.paksha === "Shukla",
    rahuKaal: kaal(RAHU[weekday]),
    yamaganda: kaal(YAMAGANDA[weekday]),
    gulika: kaal(GULIKA[weekday]),
    abhijit: weekday === 3 ? null : { start: new Date(noon - muhurta / 2), end: new Date(noon + muhurta / 2) }, // not observed on Wednesdays
    brahmaMuhurta: { start: new Date(sunrise.getTime() - 2 * nightMuhurta), end: new Date(sunrise.getTime() - nightMuhurta) },
    positions,
  };
}

export type Panchang = ReturnType<typeof panchang>;

/** Birth chart. Without a birth time, noon is used and house-based results fall back to the Moon. */
export function natalChart(birth: BirthDetails) {
  const instant = zonedToUtc(birth.date, birth.time ?? "12:00", birth.place.tz);
  const positions = grahaPositions(instant);
  const moon = positions.find((p) => p.graha === "Moon")!;
  const sun = positions.find((p) => p.graha === "Sun")!;
  const lagnaLon = birth.time ? ascendant(instant, birth.place.lat, birth.place.lon) : null;
  const lagnaRashi = lagnaLon === null ? moon.rashi : rashiOf(lagnaLon);
  return {
    instant,
    timeKnown: !!birth.time,
    moonLongitude: moon.longitude,
    moonRashi: moon.rashi,
    sunRashi: sun.rashi,
    nakshatra: nakshatraOf(moon.longitude),
    lagna: lagnaLon === null ? null : { longitude: lagnaLon, rashi: lagnaRashi, navamsa: navamsaOf(lagnaLon) },
    /** Reference sign for houses: Lagna when known, otherwise Chandra lagna (the Moon). */
    houseRef: lagnaRashi,
    positions: positions.map((p) => ({ ...p, house: houseFrom(lagnaRashi, p.rashi) })),
  };
}

export type Natal = ReturnType<typeof natalChart>;
