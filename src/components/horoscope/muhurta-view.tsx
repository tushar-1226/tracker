"use client";

import { ArrowLeft, CalendarSearch, LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import type { Place } from "@/lib/astro/constants";
import { type HoroscopeLang, names } from "@/lib/astro/i18n";
import { type FactorKey, PURPOSES, type Purpose } from "@/lib/astro/muhurta";
import { formatDate, toDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { type MuhurtaDay, findMuhurta } from "@/server/actions/muhurta";
import { PlacePicker } from "./birth-form";

const FACTOR: Record<FactorKey, string> = {
  nakshatraGood: "Favourable nakshatra",
  nakshatraBad: "Unfavourable nakshatra",
  tithiGood: "Favourable tithi",
  tithiBad: "Rikta tithi (4, 9, 14)",
  amavasya: "Amavasya",
  ashtami: "Ashtami",
  shukla: "Waxing Moon",
  weekdayGood: "Good weekday",
  weekdayBad: "Weak weekday",
  yogaGood: "Auspicious yoga",
  yogaBad: "Inauspicious yoga",
  vishti: "Vishti (Bhadra) karana",
  panchak: "Panchak",
  venusCombust: "Venus combust (asta)",
  jupiterCombust: "Jupiter combust (asta)",
  mercuryRetro: "Mercury retrograde",
  chandrashtama: "Chandrashtama for you",
  taraGood: "Favourable Tara for you",
  taraBad: "Unfavourable Tara for you",
};

const VERDICT = { great: "Very good", good: "Good", fair: "Fair", avoid: "Avoid" } as const;

export function MuhurtaView({ place: initialPlace, hasBirth, lang }: { place: Place | null; hasBirth: boolean; lang: HoroscopeLang }) {
  const n = names(lang);
  const [purpose, setPurpose] = useState<Purpose>("marriage");
  const [range, setRange] = useState<"30" | "60" | "90">("30");
  const [place, setPlace] = useState<Place | null>(initialPlace);
  const [personal, setPersonal] = useState(hasBirth);
  const [days, setDays] = useState<MuhurtaDay[] | null>(null);
  const [onlyGood, setOnlyGood] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const search = () => {
    if (!place) return setError("Choose a place first");
    setError(null);
    startTransition(async () => {
      const r = await findMuhurta({ purpose, days: Number(range) as 30 | 60 | 90, place, personal: personal && hasBirth });
      if ("error" in r) return setError(r.error);
      setDays(r.days);
    });
  };

  const shown = days?.filter((d) => !onlyGood || d.verdict === "great" || d.verdict === "good") ?? [];
  const best = days?.filter((d) => d.verdict === "great").length ?? 0;

  return (
    <>
      <PageHeader
        title="Muhurta"
        description="Find auspicious days · panchang based"
        actions={
          <Button variant="outline" asChild>
            <Link href="/horoscope">
              <ArrowLeft /> Horoscope
            </Link>
          </Button>
        }
      />

      <Card className="space-y-5 p-6">
        <div className="space-y-2">
          <CardLabel>For</CardLabel>
          <div className="flex flex-wrap gap-2">
            {PURPOSES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPurpose(p.value)}
                className={cn("rounded-full px-4 py-2 text-sm shadow-soft transition-colors", purpose === p.value ? "bg-foreground text-background" : "bg-surface text-muted hover:text-foreground")}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">{PURPOSES.find((p) => p.value === purpose)?.about}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <CardLabel>Look ahead</CardLabel>
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: "30", label: "30 days" },
                { value: "60", label: "60 days" },
                { value: "90", label: "90 days" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <CardLabel>Where (sunrise and Rahu Kaal depend on it)</CardLabel>
            <PlacePicker id="muhurta-place" value={place} onChange={setPlace} />
          </div>
        </div>
        {hasBirth && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={personal} onChange={(e) => setPersonal(e.target.checked)} /> Match to my birth chart (Tara and Chandrashtama)
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={search} disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : <CalendarSearch />} Find days
          </Button>
          {error && <p className="text-xs">— {error}</p>}
        </div>
      </Card>

      {days && (
        <div className="mt-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-muted">
              {best} very good · {days.filter((d) => d.verdict === "good").length} good in the next {days.length} days
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyGood} onChange={(e) => setOnlyGood(e.target.checked)} /> Only good days
            </label>
          </div>
          {shown.length === 0 && <Card className="py-10 text-center text-sm text-muted">No good days in this window. Try a longer range, or untick “Only good days”.</Card>}
          <ul className="space-y-3">
            {shown.map((d, i) => (
              <motion.li key={d.day} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{formatDate(toDate(d.day), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }, lang === "hi" ? "hi" : "en")}</p>
                      <p className="text-sm text-muted">
                        {n.nakshatra(d.nakshatra.index)} · {d.tithi.paksha} {d.tithi.day}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-medium", d.verdict === "avoid" && "text-muted")}>{VERDICT[d.verdict]}</p>
                      <p className="tabular text-2xl font-medium">{d.score}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${d.score}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {d.factors.map((f) => (
                      <span key={f.key} className={cn("rounded-full px-2.5 py-1 text-xs", f.good ? "bg-foreground text-background" : "bg-subtle text-muted")}>
                        {f.good ? "+" : "−"} {FACTOR[f.key]}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {d.abhijit ? `Abhijit ${d.abhijit.start}–${d.abhijit.end} · ` : "No Abhijit on Wednesdays · "}Avoid Rahu Kaal {d.rahuKaal.start}–{d.rahuKaal.end}
                  </p>
                </Card>
              </motion.li>
            ))}
          </ul>
          <p className="pt-2 text-xs leading-relaxed text-muted">
            Scores use the day’s tithi, nakshatra, yoga, karana, weekday and combustion, read at sunrise. Lagna, Chaturmas, Adhik masa and eclipses are not modelled, so confirm an important date with a pandit.
          </p>
        </div>
      )}
    </>
  );
}
