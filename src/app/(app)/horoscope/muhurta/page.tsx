import type { Metadata } from "next";
import { MuhurtaView } from "@/components/horoscope/muhurta-view";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Muhurta" };

export default async function MuhurtaPage() {
  const user = await getCurrentUser();
  const { birth, currentPlace } = user.settings;
  return <MuhurtaView place={currentPlace ?? birth?.place ?? null} hasBirth={!!birth} lang={user.settings.horoscopeLang ?? "en"} />;
}
