import { DASHA_ORDER, type Graha, nakshatraOf } from "./constants";

/** Vimshottari years are taken as 365.25 days. */
const YEAR_MS = 365.25 * 86_400_000;

export type Period = { graha: Graha; start: number; end: number };

const indexOf = (g: Graha) => DASHA_ORDER.findIndex((d) => d.graha === g);

/** Splits a period into the nine sub-periods, starting with its own lord. */
export function subPeriods(parent: Period): Period[] {
  const total = parent.end - parent.start;
  const start = indexOf(parent.graha);
  const out: Period[] = [];
  let t = parent.start;
  for (let i = 0; i < 9; i++) {
    const d = DASHA_ORDER[(start + i) % 9];
    const len = (total * d.years) / 120;
    out.push({ graha: d.graha, start: t, end: t + len });
    t += len;
  }
  return out;
}

/**
 * Mahadashas from birth: the first is the Moon's nakshatra lord, with only the
 * unelapsed fraction of the nakshatra remaining at birth.
 */
export function mahadashas(moonLon: number, birth: Date, count = 10): Period[] {
  const nak = nakshatraOf(moonLon);
  const first = indexOf(nak.lord);
  const out: Period[] = [];
  // Start of the (virtual) first mahadasha before birth.
  let t = birth.getTime() - nak.fraction * DASHA_ORDER[first].years * YEAR_MS;
  for (let i = 0; i < count; i++) {
    const d = DASHA_ORDER[(first + i) % 9];
    const end = t + d.years * YEAR_MS;
    out.push({ graha: d.graha, start: t, end });
    t = end;
  }
  return out;
}

/** The running Maha, Antar and Pratyantar dasha at an instant. */
export function currentDasha(moonLon: number, birth: Date, at: Date) {
  const now = at.getTime();
  const mds = mahadashas(moonLon, birth, 18);
  const md = mds.find((p) => now >= p.start && now < p.end) ?? mds[0];
  const ad = subPeriods(md).find((p) => now >= p.start && now < p.end) ?? subPeriods(md)[0];
  const pd = subPeriods(ad).find((p) => now >= p.start && now < p.end) ?? subPeriods(ad)[0];
  return { maha: md, antar: ad, pratyantar: pd, timeline: mds.filter((p) => p.end > birth.getTime()).slice(0, 9), antars: subPeriods(md) };
}
