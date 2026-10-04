import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardLabel } from "@/components/ui/card";
import { names, readingText, ui } from "@/lib/astro/i18n";
import type { HoroscopeView } from "@/server/horoscope";

/** Dashboard summary of today's horoscope (in the chosen language), or a prompt to set it up. */
export function TodaySkyCard({ h }: { h: HoroscopeView | null }) {
  if (!h) {
    return (
      <Link href="/horoscope" className="flex items-center justify-between rounded-3xl bg-surface p-6 transition-colors hover:bg-subtle">
        <span>
          <span className="block text-xs font-medium text-muted">Horoscope</span>
          <span className="mt-1 block text-sm text-muted">Add your birth details for a daily Vedic reading.</span>
        </span>
        <ArrowUpRight className="size-4" />
      </Link>
    );
  }
  const t = ui(h.lang);
  const n = names(h.lang);
  const { headline } = readingText(h.reading, h.lang, h.panchang.tithi);
  return (
    <Link href="/horoscope" data-cursor-label="Open" className="block" lang={h.lang === "hi" ? "hi" : "en"}>
      <Card className="grid gap-4 transition-colors hover:bg-subtle md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex items-baseline gap-2">
          <span className="tabular text-5xl font-medium">{h.reading.score}</span>
          <span className="text-xs text-muted">/ 100</span>
        </div>
        <div className="min-w-0">
          <CardLabel>{t.todaySky}</CardLabel>
          <p className={`mt-1 text-xl font-semibold tracking-tight `}>{headline}</p>
          <p className="mt-1 truncate text-sm text-muted">
            {t.moon} · {n.rashi(h.panchang.moonRashi).split(" · ")[0]} · {n.nakshatra(h.panchang.nakshatra.index)} · {n.tithi(h.panchang.tithi)}
          </p>
        </div>
        <div className="rounded-2xl bg-subtle px-4 py-2 text-right">
          <p className="text-xs font-medium text-muted">{t.rahuKaal}</p>
          <p className="tabular text-lg">
            {h.panchang.rahuKaal.start}–{h.panchang.rahuKaal.end}
          </p>
        </div>
      </Card>
    </Link>
  );
}
