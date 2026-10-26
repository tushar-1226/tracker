import type { Metadata } from "next";
import { CompatibilityView } from "@/components/horoscope/compatibility-view";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Compatibility" };

export default async function CompatibilityPage() {
  const user = await getCurrentUser();
  return <CompatibilityView me={{ name: user.name ?? "", birth: user.settings.birth ?? null }} lang={user.settings.horoscopeLang ?? "en"} />;
}
