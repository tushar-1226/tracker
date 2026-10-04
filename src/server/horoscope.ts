import "server-only";
import type { UserSettings } from "@/db/schema";
import { houseFrom } from "@/lib/astro/constants";
import { currentDasha } from "@/lib/astro/dasha";
import { names, readingText } from "@/lib/astro/i18n";
import { dailyReading } from "@/lib/astro/reading";
import { detectYogas } from "@/lib/astro/yogas";
import { addDays } from "@/lib/dates";
import { ephemerisSource, natalChart, panchang } from "@/server/astro/ephemeris";

/** Local "HH:MM", with "+1" when the moment falls on the next local day. */
function clock(d: Date | null, tz: string, day?: string) {
  if (!d) return null;
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  return day && localDay > day ? `${hm} +1` : hm;
}
const span = (w: { start: Date; end: Date } | null, tz: string) =>
  w ? { start: clock(w.start, tz)!, end: clock(w.end, tz)!, startMs: w.start.getTime(), endMs: w.end.getTime() } : null;

/** Everything the horoscope section shows, as plain data (safe for client props). Null until birth details exist. */
export function getHoroscope(settings: UserSettings, today: string, now = new Date()) {
  const birth = settings.birth;
  if (!birth) return null;
  const place = settings.currentPlace ?? birth.place;
  const tz = place.tz;
  const natal = natalChart(birth);
  const p = panchang(today, place);
  const reading = dailyReading(natal, p, today);
  const dasha = currentDasha(natal.moonLongitude, natal.instant, now);

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    const r = i === 0 ? reading : dailyReading(natal, panchang(day, place), day);
    return { day, score: r.score, headlineKey: r.headline.key, variant: r.headline.variant, moonHouse: r.moon.house, chandrashtama: r.chandrashtama };
  });

  return {
    lang: settings.horoscopeLang ?? "en",
    source: ephemerisSource,
    place,
    birth,
    natal: {
      timeKnown: natal.timeKnown,
      moonRashi: natal.moonRashi,
      sunRashi: natal.sunRashi,
      nakshatra: natal.nakshatra,
      lagna: natal.lagna ? { rashi: natal.lagna.rashi, navamsa: natal.lagna.navamsa, degree: natal.lagna.longitude % 30 } : null,
      houseRef: natal.houseRef,
      positions: natal.positions.map((x) => ({
        graha: x.graha,
        rashi: x.rashi,
        degree: x.degree,
        nakshatra: x.nakshatra,
        navamsa: x.navamsa,
        house: x.house,
        retrograde: x.retrograde,
        combust: x.combust,
        dignity: x.dignity,
      })),
    },
    yogas: detectYogas(natal.positions, natal.houseRef),
    dasha: {
      maha: dasha.maha,
      antar: dasha.antar,
      pratyantar: dasha.pratyantar,
      timeline: dasha.timeline,
      antars: dasha.antars,
    },
    panchang: {
      vara: p.vara,
      tithi: { ...p.tithi, ends: clock(p.tithi.ends, tz, today)! },
      nakshatra: { index: p.nakshatra.index, pada: p.nakshatra.pada, ends: clock(p.nakshatra.ends, tz, today)! },
      yoga: { index: p.yoga.index, ends: clock(p.yoga.ends, tz, today)! },
      karana: { index: p.karana.index, ends: clock(p.karana.ends, tz, today)! },
      moonRashi: p.moonRashi,
      moonIllumination: p.moonIllumination,
      waxing: p.waxing,
      sunrise: clock(p.sunrise, tz)!,
      sunset: clock(p.sunset, tz)!,
      moonrise: clock(p.moonrise, tz, today),
      moonset: clock(p.moonset, tz, today),
      rahuKaal: span(p.rahuKaal, tz)!,
      yamaganda: span(p.yamaganda, tz)!,
      gulika: span(p.gulika, tz)!,
      abhijit: span(p.abhijit, tz),
      brahmaMuhurta: span(p.brahmaMuhurta, tz)!,
    },
    planets: p.positions.map((x) => ({ graha: x.graha, rashi: x.rashi, degree: x.degree, retrograde: x.retrograde, nakshatra: x.nakshatra, house: houseFrom(natal.moonRashi, x.rashi) })),
    reading,
    week,
  };
}

export type HoroscopeView = NonNullable<ReturnType<typeof getHoroscope>>;

/** One-line text for the morning notification, in the user's language. */
export function horoscopeLine(h: HoroscopeView) {
  const lang = h.lang;
  const n = names(lang);
  const { headline } = readingText(h.reading, lang, h.panchang.tithi);
  const moon = n.rashi(h.panchang.moonRashi).split(" · ")[0];
  const rahu = `${h.panchang.rahuKaal.start}–${h.panchang.rahuKaal.end}`;
  const md = `${n.graha(h.dasha.maha.graha)}–${n.graha(h.dasha.antar.graha)}`;
  if (lang === "hi") return `${headline}। चंद्रमा ${moon} में (आपसे ${n.ord(h.reading.moon.house)} भाव) · राहु काल ${rahu} · दशा ${md}`;
  if (lang === "hinglish") return `${headline}. Chandrama ${moon} mein (aapse ${n.ord(h.reading.moon.house)} bhav) · Rahu Kaal ${rahu} · Dasha ${md}`;
  return `${headline}. Moon in ${moon} (${n.ord(h.reading.moon.house)} from you) · Rahu Kaal ${rahu} · Dasha ${md}`;
}
