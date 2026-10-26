"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { currentDasha } from "@/lib/astro/dasha";
import { readingText } from "@/lib/astro/i18n";
import { type Match, guna } from "@/lib/astro/matching";
import { dailyReading } from "@/lib/astro/reading";
import { birthSchema } from "@/lib/validators/horoscope";
import { natalChart, panchang } from "@/server/astro/ephemeris";
import { getToday } from "@/server/today";

const personSchema = z.object({ name: z.string().trim().min(1, { error: "Add a name" }).max(40), birth: birthSchema });
const inputSchema = z.object({ a: personSchema, b: personSchema, groom: z.enum(["a", "b"]) });

export type PersonSummary = {
  name: string;
  moonRashi: number;
  sunRashi: number;
  nakshatra: { index: number; pada: number };
  lagna: number | null;
  timeKnown: boolean;
  dasha: { maha: { graha: string; end: number }; antar: { graha: string; end: number } };
  today: { score: number; headline: string };
};

export type CompatibilityResult = { match: Match; a: PersonSummary; b: PersonSummary; groom: "a" | "b" };

/** Ashtakoota match plus a side-by-side chart summary for two people. Nothing is stored. */
export async function checkCompatibility(input: z.input<typeof inputSchema>): Promise<CompatibilityResult | { error: string }> {
  const user = await getCurrentUser();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details" };
  const { a, b, groom } = parsed.data;

  const today = await getToday();
  const place = user.settings.currentPlace ?? user.settings.birth?.place ?? a.birth.place;
  const sky = panchang(today, place);
  const lang = user.settings.horoscopeLang ?? "en";
  const now = new Date();

  const summarize = (name: string, birth: typeof a.birth) => {
    const natal = natalChart(birth);
    const dasha = currentDasha(natal.moonLongitude, natal.instant, now);
    const reading = dailyReading(natal, sky, today);
    const summary: PersonSummary = {
      name,
      moonRashi: natal.moonRashi,
      sunRashi: natal.sunRashi,
      nakshatra: { index: natal.nakshatra.index, pada: natal.nakshatra.pada },
      lagna: natal.lagna?.rashi ?? null,
      timeKnown: natal.timeKnown,
      dasha: { maha: { graha: dasha.maha.graha, end: dasha.maha.end }, antar: { graha: dasha.antar.graha, end: dasha.antar.end } },
      today: { score: reading.score, headline: readingText(reading, lang, sky.tithi).headline },
    };
    const mars = natal.positions.find((p) => p.graha === "Mars")!;
    return { summary, person: { moonLongitude: natal.moonLongitude, marsHouse: mars.house } };
  };

  const A = summarize(a.name, a.birth);
  const B = summarize(b.name, b.birth);
  const match = groom === "a" ? guna(A.person, B.person) : guna(B.person, A.person);
  return { match, a: A.summary, b: B.summary, groom };
}
