import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { YearReview } from "@/components/progress/year-review";
import { getCurrentUser } from "@/lib/auth/dal";
import { getPeriodSummary } from "@/server/summary";
import { getToday } from "@/server/today";

export async function generateMetadata({ params }: PageProps<"/progress/[year]">): Promise<Metadata> {
  return { title: `${(await params).year} in review` };
}

export default async function YearPage({ params }: PageProps<"/progress/[year]">) {
  const [user, { year: raw }, today] = await Promise.all([getCurrentUser(), params, getToday()]);
  const year = Number(raw);
  const current = Number(today.slice(0, 4));
  const firstYear = Math.min(current, user.createdAt.getFullYear());
  if (!/^\d{4}$/.test(raw) || year > current || year < 2000) notFound();
  const end = year === current ? today : `${year}-12-31`;
  const summary = await getPeriodSummary(user.id, `${year}-01-01`, end);
  return <YearReview year={year} summary={summary} currency={user.settings.currency ?? "INR"} hasPrev={year > firstYear} hasNext={year < current} />;
}
