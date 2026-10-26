"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { type DayScore, type Purpose, scoreDay } from "@/lib/astro/muhurta";
import { addDays } from "@/lib/dates";
import { dailyReading } from "@/lib/astro/reading";
import { placeSchema } from "@/lib/validators/horoscope";
import { natalChart, panchang } from "@/server/astro/ephemeris";
import { getToday } from "@/server/today";

const inputSchema = z.object({
  purpose: z.enum(["marriage", "venture", "purchase", "home"]),
  days: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  place: placeSchema,
  personal: z.boolean(),
});

export type MuhurtaDay = DayScore & {
  day: string;
  weekday: number;
  tithi: { number: number; day: number; paksha: "Shukla" | "Krishna" };
  nakshatra: { index: number; pada: number };
  /** Local "HH:MM" windows. */
  abhijit: { start: string; end: string } | null;
  rahuKaal: { start: string; end: string };
};

const hm = (d: Date, tz: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);

/** Scores each upcoming day for a purpose from the panchang (and, optionally, the user's birth chart). */
export async function findMuhurta(input: z.input<typeof inputSchema>): Promise<{ days: MuhurtaDay[] } | { error: string }> {
  const user = await getCurrentUser();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: "Choose a place first" };
  const { purpose, days, place, personal } = parsed.data;
  const today = await getToday();
  const natal = personal && user.settings.birth ? natalChart(user.settings.birth) : null;

  const out: MuhurtaDay[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i);
    const p = panchang(day, place);
    const at = (g: string) => p.positions.find((x) => x.graha === g)!;
    const reading = natal ? dailyReading(natal, p, day) : null;
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    const s = scoreDay(purpose as Purpose, {
      weekday,
      tithi: { number: p.tithi.number, day: p.tithi.day },
      nakshatra: { index: p.nakshatra.index, pada: p.nakshatra.pada },
      yoga: p.yoga.index,
      karana: p.karana.index,
      venusCombust: at("Venus").combust,
      jupiterCombust: at("Jupiter").combust,
      mercuryRetro: at("Mercury").retrograde,
      personal: reading ? { chandrashtama: reading.chandrashtama, taraGood: reading.tara.good } : undefined,
    });
    out.push({
      ...s,
      day,
      weekday,
      tithi: { number: p.tithi.number, day: p.tithi.day, paksha: p.tithi.paksha },
      nakshatra: { index: p.nakshatra.index, pada: p.nakshatra.pada },
      abhijit: p.abhijit ? { start: hm(p.abhijit.start, place.tz), end: hm(p.abhijit.end, place.tz) } : null,
      rahuKaal: { start: hm(p.rahuKaal.start, place.tz), end: hm(p.rahuKaal.end, place.tz) },
    });
  }
  return { days: out };
}
