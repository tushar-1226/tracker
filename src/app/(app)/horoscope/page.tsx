import type { Metadata } from "next";
import { HoroscopeSetup, HoroscopeView } from "@/components/horoscope/horoscope-view";
import { getCurrentUser } from "@/lib/auth/dal";
import { CoupleCard } from "@/components/horoscope/couple-card";
import { getCoupleToday } from "@/server/couple";
import { getHoroscope } from "@/server/horoscope";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Horoscope" };

export default async function HoroscopePage() {
  const [user, today] = await Promise.all([getCurrentUser(), getToday()]);
  const h = getHoroscope(user.settings, today);
  return h ? <HoroscopeView h={h} today={today} extra={<CoupleCard couple={getCoupleToday(user.settings, user.name, today)} lang={h.lang} />} /> : <HoroscopeSetup />;
}
