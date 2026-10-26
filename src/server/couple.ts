import "server-only";
import type { UserSettings } from "@/db/schema";
import { houseFrom } from "@/lib/astro/constants";
import { currentDasha } from "@/lib/astro/dasha";
import { readingText } from "@/lib/astro/i18n";
import { dailyReading } from "@/lib/astro/reading";
import { natalChart, panchang } from "@/server/astro/ephemeris";

/** Today's reading for you and your saved partner, against the same sky. Null until both have birth details. */
export function getCoupleToday(settings: UserSettings, userName: string, today: string) {
  const { birth, partner } = settings;
  if (!birth || !partner) return null;
  const sky = panchang(today, settings.currentPlace ?? birth.place);
  const lang = settings.horoscopeLang ?? "en";
  const now = new Date();

  const side = (name: string, b: typeof birth) => {
    const natal = natalChart(b);
    const r = dailyReading(natal, sky, today);
    const dasha = currentDasha(natal.moonLongitude, natal.instant, now);
    return {
      moonRashi: natal.moonRashi,
      name,
      score: r.score,
      headline: readingText(r, lang, sky.tithi).headline,
      chandrashtama: r.chandrashtama,
      moonHouse: r.moon.house,
      mahaGraha: dasha.maha.graha,
      antarGraha: dasha.antar.graha,
    };
  };
  const you = side(userName, birth);
  const them = side(partner.name, partner.birth);

  const together = Math.round((you.score + them.score) / 2);
  const tone = you.chandrashtama || them.chandrashtama ? "gentle" : together >= 65 ? "bright" : together >= 45 ? "steady" : "gentle";
  // Where today's Moon sits from each other's Moon: 6/8 and 2/12 are the tense placements.
  const moonBetween = houseFrom(you.moonRashi, them.moonRashi);

  return {
    you,
    partner: them,
    together,
    tone: tone as "bright" | "steady" | "gentle",
    moonBetween,
    rahuKaal: { start: sky.rahuKaal.start.getTime(), end: sky.rahuKaal.end.getTime() },
    tz: (settings.currentPlace ?? birth.place).tz,
  };
}
export type CoupleToday = NonNullable<ReturnType<typeof getCoupleToday>>;
