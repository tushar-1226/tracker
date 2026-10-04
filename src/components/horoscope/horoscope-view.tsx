"use client";

import { ArrowUpRight, MapPin, Pencil } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Ring } from "@/components/charts/ring";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import type { Place } from "@/lib/astro/constants";
import { type HoroscopeLang, LANGS, dignityText, names, readingText, transitText, ui, yogaText } from "@/lib/astro/i18n";
import { toDate, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { saveCurrentPlace } from "@/server/actions/horoscope";
import { updatePreferences } from "@/server/actions/settings";
import type { HoroscopeView as View } from "@/server/horoscope";
import { BirthForm, PlacePicker } from "./birth-form";
import { KundliChart } from "./kundli-chart";

const subscribeClock = (cb: () => void) => {
  const id = setInterval(cb, 30_000);
  return () => clearInterval(id);
};
const DATE_LANG: Record<HoroscopeLang, "en" | "hi"> = { en: "en", hinglish: "en", hi: "hi" };

export function HoroscopeSetup() {
  return (
    <>
      <PageHeader title="Horoscope" description="Vedic · Swiss Ephemeris · Lahiri" />
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4 pt-2">
          <p className="text-2xl font-semibold tracking-tight">Your chart starts with your birth.</p>
          <p className="text-[15px] leading-relaxed text-muted">
            Track computes the exact positions of the grahas for the moment you were born — Lagna, Rashi, Nakshatra, Navamsa and your Vimshottari Dasha — then reads each day’s sky against it. In English, Hinglish or हिंदी.
          </p>
          <p className="text-sm text-muted">Your birth details stay on your server.</p>
        </div>
        <Card>
          <BirthForm />
        </Card>
      </div>
    </>
  );
}

export function HoroscopeView({ h, today }: { h: View; today: string }) {
  const [lang, setLang] = useState<HoroscopeLang>(h.lang);
  const [chart, setChart] = useState<"d1" | "d9">("d1");
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const t = ui(lang);
  const n = names(lang);
  const r = h.reading;
  const text = readingText(r, lang, h.panchang.tithi);
  const now = useSyncExternalStore(subscribeClock, () => Math.floor(Date.now() / 30_000) * 30_000, () => 0);
  const hi = lang === "hi";
  const dateLang = DATE_LANG[lang];
  const prose = hi ? "leading-loose" : "leading-relaxed";

  const switchLang = (next: HoroscopeLang) => {
    setLang(next);
    startTransition(() => updatePreferences({ horoscopeLang: next }));
  };
  const monthYear = (ms: number) => formatDate(ms, { month: "short", year: "numeric", timeZone: "UTC" }, dateLang);
  const fromMoon = (house: number) => (lang === "en" ? `${n.ord(house)} ${t.fromMoon}` : `${t.fromMoon} ${n.ord(house)} ${t.house}`);
  const areaTitle = { work: t.work, money: t.money, health: t.health, people: t.people, mind: t.mind };

  // Charts: D1 houses from the Lagna (or Moon); D9 from the navamsa Lagna.
  const ref = h.natal.lagna?.rashi ?? h.natal.houseRef;
  const d9Ref = h.natal.lagna?.navamsa ?? h.natal.positions.find((p) => p.graha === "Moon")!.navamsa;
  const d1: Record<number, string[]> = {};
  const d9: Record<number, string[]> = {};
  for (const p of h.natal.positions) {
    const lbl = `${n.grahaShort(p.graha)}${p.retrograde && p.graha !== "Rahu" && p.graha !== "Ketu" ? "ᴿ" : ""}`;
    (d1[((p.rashi - ref + 12) % 12) + 1] ??= []).push(lbl);
    (d9[((p.navamsa - d9Ref + 12) % 12) + 1] ??= []).push(n.grahaShort(p.graha));
  }
  if (h.natal.lagna) {
    (d1[1] ??= []).unshift(hi ? "ल" : "As");
    (d9[1] ??= []).unshift(hi ? "ल" : "As");
  }

  const progress = (p: { start: number; end: number }) => Math.min(1, Math.max(0, (now - p.start) / (p.end - p.start)));
  const live = (w: { start: string; end: string; startMs: number; endMs: number } | null) => (w ? { ...w, live: now >= w.startMs && now < w.endMs } : null);
  const avoid = [
    { label: t.rahuKaal, w: live(h.panchang.rahuKaal) },
    { label: t.yamaganda, w: live(h.panchang.yamaganda) },
    { label: t.gulika, w: live(h.panchang.gulika) },
  ];
  const good = [
    { label: t.brahma, w: live(h.panchang.brahmaMuhurta) },
    { label: t.abhijit, w: live(h.panchang.abhijit) },
  ];
  const timelineSpan = h.dasha.timeline[h.dasha.timeline.length - 1].end - h.dasha.timeline[0].start;

  return (
    <div lang={hi ? "hi" : "en"}>
      <PageHeader
        title={t.title}
        description={`${formatDate(toDate(today), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }, dateLang)} · ${h.place.name}`}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Segmented value={lang} onChange={switchLang} options={LANGS} className="w-full sm:w-auto" />
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil /> {t.birthDetails}
            </Button>
          </div>
        }
      />

      {/* Today */}
      <Stagger className="grid gap-4 lg:grid-cols-3">
        <StaggerItem className="lg:col-span-2">
          <Card className="flex h-full flex-col gap-6 p-7 sm:flex-row sm:items-center">
            <Ring value={r.score / 100} size={156} stroke={10}>
              <NumberTicker value={r.score} className="tabular text-5xl font-medium" />
              <span className="text-xs text-muted">/ 100</span>
            </Ring>
            <div className="min-w-0">
              <CardLabel>{t.today}</CardLabel>
              <h2 className="mt-1.5 text-3xl font-semibold tracking-tight md:text-[2.5rem] md:leading-tight">{text.headline}</h2>
              <p className={cn("mt-3 text-[15px] text-muted", prose)}>{text.summary}</p>
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="flex h-full flex-col gap-4 p-7">
            <CardLabel>{t.dashaNow}</CardLabel>
            {(
              [
                [t.maha, h.dasha.maha],
                [t.antar, h.dasha.antar],
                [t.pratyantar, h.dasha.pratyantar],
              ] as const
            ).map(([label, p]) => (
              <div key={label}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] text-muted">{label}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {monthYear(p.start)} – {monthYear(p.end)}
                  </span>
                </div>
                <p className="text-lg font-semibold">{n.graha(p.graha)}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle">
                  <motion.div className="h-full rounded-full bg-foreground" initial={{ width: 0 }} animate={{ width: `${progress(p) * 100}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              </div>
            ))}
          </Card>
        </StaggerItem>
      </Stagger>

      {/* Areas */}
      <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0" data-lenis-prevent>
        {text.areas.map((a, i) => (
          <motion.div key={a.key} className="w-[78%] shrink-0 snap-start md:w-auto" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.05, type: "spring", stiffness: 300, damping: 30 }}>
            <Card className="h-full p-5">
              <CardLabel>{areaTitle[a.key]}</CardLabel>
              <p className={cn("mt-2 text-[15px]", prose)}>{a.text}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Good for / avoid */}
      <Reveal className="mt-4 flex flex-wrap items-center gap-2">
        {text.goodFor.map((g) => (
          <Link key={g.module} href={g.href} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background shadow-soft transition-transform active:scale-95">
            {g.label} <ArrowUpRight className="size-3.5" />
          </Link>
        ))}
        {text.avoid.map((a) => (
          <span key={a} className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-sm text-muted shadow-soft">
            {t.avoid}: {a}
          </span>
        ))}
      </Reveal>

      {/* Panchang */}
      <SectionTitle>{t.panchang}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <CardLabel>
              {n.vara(h.panchang.vara.name)} · {n.graha(h.panchang.vara.lord)}
            </CardLabel>
            <CurrentPlace place={h.place} title={t.where} />
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Fact label={t.tithi} value={n.tithi(h.panchang.tithi)} sub={`${t.until} ${h.panchang.tithi.ends}`} />
            <Fact label={t.nakshatra} value={`${n.nakshatra(h.panchang.nakshatra.index)} · ${h.panchang.nakshatra.pada}`} sub={`${t.until} ${h.panchang.nakshatra.ends}`} />
            <Fact label={t.yoga} value={n.yoga(h.panchang.yoga.index)} sub={`${t.until} ${h.panchang.yoga.ends}`} />
            <Fact label={t.karana} value={n.karana(h.panchang.karana.index)} sub={`${t.until} ${h.panchang.karana.ends}`} />
            <Fact label={t.moon} value={n.rashi(h.panchang.moonRashi).split(" · ")[0]} sub={`${Math.round(h.panchang.moonIllumination * 100)}% · ${h.panchang.waxing ? t.waxing : t.waning}`} />
            <Fact label={t.sunriseSunset} value={`${h.panchang.sunrise} · ${h.panchang.sunset}`} sub={`${t.moonriseMoonset}: ${h.panchang.moonrise ?? "—"} · ${h.panchang.moonset ?? "—"}`} />
          </dl>
        </Card>
        <div className="grid gap-4">
          <TimesCard title={t.avoidTimes} items={avoid} dark />
          <TimesCard title={t.goodTimes} items={good} />
        </div>
      </div>

      {/* Transits */}
      <SectionTitle>{t.transits}</SectionTitle>
      <Card className="p-2 sm:p-3">
        <ul>
          {r.transits.map((x, i) => {
            const pos = h.planets.find((p) => p.graha === x.graha)!;
            return (
              <motion.li key={x.graha} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-subtle">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium", x.good ? "bg-foreground text-background" : "bg-subtle")}>{n.grahaShort(x.graha)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">
                    {n.graha(x.graha)}{" "}
                    <span className="font-normal text-muted">
                      · {n.rashi(pos.rashi).split(" · ")[0]} {Math.floor(pos.degree)}°{x.retrograde && x.graha !== "Rahu" && x.graha !== "Ketu" ? ` · ${t.retro}` : ""}
                    </span>
                  </span>
                  <span className="block truncate text-[13px] text-muted">{transitText(x.graha, x.good, lang)}</span>
                </span>
                <span className="shrink-0 text-right text-[13px] text-muted">
                  {fromMoon(x.house)}
                  <span className={cn("ml-2 inline-block size-2 rounded-full align-middle", x.good ? "bg-foreground" : "bg-hairline")} />
                </span>
              </motion.li>
            );
          })}
        </ul>
      </Card>

      {/* Week ahead */}
      <SectionTitle>{t.weekAhead}</SectionTitle>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-7 md:px-0" data-lenis-prevent>
        {h.week.map((d, i) => {
          const wk = readingText({ ...r, headline: { key: d.headlineKey, variant: d.variant } }, lang, h.panchang.tithi).headline;
          return (
            <Card key={d.day} className={cn("w-32 shrink-0 p-4 md:w-auto", i === 0 && "bg-foreground text-background")}>
              <p className={cn("text-[13px]", i === 0 ? "text-background/60" : "text-muted")}>
                {i === 0 ? t.today : formatDate(toDate(d.day), { weekday: "short", day: "numeric", timeZone: "UTC" }, dateLang)}
              </p>
              <p className="tabular mt-1 text-3xl font-medium">{d.score}</p>
              <div className={cn("mt-2 h-1 overflow-hidden rounded-full", i === 0 ? "bg-background/20" : "bg-subtle")}>
                <div className={cn("h-full rounded-full", i === 0 ? "bg-background" : "bg-foreground")} style={{ width: `${d.score}%` }} />
              </div>
              <p className={cn("mt-2 line-clamp-2 text-xs", i === 0 ? "text-background/70" : "text-muted")}>{d.chandrashtama ? t.chandrashtama : wk}</p>
            </Card>
          );
        })}
      </div>

      {/* Birth chart */}
      <SectionTitle>{t.birthChart}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="flex flex-col items-center gap-4 p-6">
          <Segmented
            value={chart}
            onChange={setChart}
            options={[
              { value: "d1", label: t.d1 },
              { value: "d9", label: t.d9 },
            ]}
            className="w-full"
          />
          <KundliChart key={chart} ascRashi={chart === "d1" ? ref : d9Ref} planets={chart === "d1" ? d1 : d9} label={chart === "d1" ? t.d1 : t.d9} />
          <dl className="grid w-full grid-cols-2 gap-3 text-sm">
            <Fact label={t.lagna} value={h.natal.lagna ? `${n.rashi(h.natal.lagna.rashi).split(" · ")[0]} ${Math.floor(h.natal.lagna.degree)}°` : "—"} />
            <Fact label={t.rashi} value={n.rashi(h.natal.moonRashi).split(" · ")[0]} />
            <Fact label={t.nakshatra} value={`${n.nakshatra(h.natal.nakshatra.index)} · ${h.natal.nakshatra.pada}`} />
            <Fact label={t.surya} value={n.rashi(h.natal.sunRashi).split(" · ")[0]} />
          </dl>
          {!h.natal.timeKnown && <p className="text-center text-xs text-muted">{t.chandraLagna}</p>}
        </Card>
        <Card className="p-2 sm:p-3">
          <CardLabel className="px-3 pt-3 pb-1">{t.planets}</CardLabel>
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">{t.graha}</th>
                  <th className="px-2 py-2 font-medium">{t.rashi.split(" (")[0]}</th>
                  <th className="px-2 py-2 text-right font-medium">{t.degree}</th>
                  <th className="px-2 py-2 font-medium">{t.nakshatra}</th>
                  <th className="px-2 py-2 text-right font-medium">{t.house}</th>
                  <th className="px-3 py-2 font-medium">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {h.natal.positions.map((p) => (
                  <tr key={p.graha} className="transition-colors hover:bg-subtle">
                    <td className="rounded-l-2xl px-3 py-2.5 font-medium">{n.graha(p.graha)}</td>
                    <td className="px-2 py-2.5">{n.rashi(p.rashi).split(" · ")[0]}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {Math.floor(p.degree)}°{String(Math.floor((p.degree % 1) * 60)).padStart(2, "0")}′
                    </td>
                    <td className="px-2 py-2.5">
                      {n.nakshatra(p.nakshatra.index)} · {p.nakshatra.pada}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{p.house}</td>
                    <td className="rounded-r-2xl px-3 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        {p.dignity && <Badge strong>{dignityText(p.dignity, lang)}</Badge>}
                        {p.retrograde && p.graha !== "Rahu" && p.graha !== "Ketu" && <Badge>{t.retro}</Badge>}
                        {p.combust && <Badge>{t.combust}</Badge>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!h.natal.timeKnown && <p className="px-3 pb-3 text-xs text-muted">{t.timeNeeded}</p>}
        </Card>
      </div>

      {/* Yogas */}
      <SectionTitle>{t.yogas}</SectionTitle>
      {h.yogas.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {h.yogas.map((y, i) => {
            const yt = yogaText(y.key, lang);
            return (
              <motion.div key={y.key} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <Card className={cn("h-full p-5", y.kind === "yoga" && "bg-foreground text-background")}>
                  <p className="font-semibold">{yt.name}</p>
                  <p className={cn("mt-1.5 text-sm", prose, y.kind === "yoga" ? "text-background/70" : "text-muted")}>{yt.text}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="p-6 text-[15px] text-muted">{t.noYogas}</Card>
      )}

      {/* Dasha timeline */}
      <SectionTitle>{t.dasha}</SectionTitle>
      <Card className="p-6">
        <CardLabel>{t.timeline}</CardLabel>
        <div className="mt-4 flex h-14 gap-1 overflow-hidden rounded-2xl">
          {h.dasha.timeline.map((p) => {
            const current = now >= p.start && now < p.end;
            return (
              <div
                key={p.start}
                title={`${n.graha(p.graha)} · ${monthYear(p.start)} – ${monthYear(p.end)}`}
                className={cn("flex min-w-0 items-center justify-center px-1 text-xs font-medium", current ? "bg-foreground text-background" : "bg-subtle text-muted")}
                style={{ width: `${((p.end - p.start) / timelineSpan) * 100}%` }}
              >
                <span className="truncate">{n.grahaShort(p.graha)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-6 mb-2 text-[13px] text-muted">
          {t.antar} · {n.graha(h.dasha.maha.graha)} {t.maha}
        </p>
        <ul className="grid gap-1 sm:grid-cols-3">
          {h.dasha.antars.map((p) => {
            const current = now >= p.start && now < p.end;
            const past = now >= p.end;
            return (
              <li key={p.start} className={cn("flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm", current ? "bg-foreground text-background" : past ? "text-muted" : "bg-subtle")}>
                <span className="font-medium">{n.graha(p.graha)}</span>
                <span className={cn("text-xs tabular-nums", current ? "text-background/70" : "text-muted")}>{monthYear(p.start)}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <p className={cn("mt-8 text-xs text-muted", prose)}>
        {t.disclaimer} {t.source}: {h.source}.
      </p>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent title={t.birthDetails}>
          <BirthForm initial={h.birth} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Reveal className="mt-12 mb-4">
      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{children}</h2>
    </Reveal>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
      {sub && <dd className="truncate text-xs text-muted tabular-nums">{sub}</dd>}
    </div>
  );
}

function Badge({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", strong ? "bg-foreground text-background" : "bg-subtle text-muted")}>{children}</span>;
}

function TimesCard({ title, items, dark }: { title: string; items: { label: string; w: { start: string; end: string; live: boolean } | null }[]; dark?: boolean }) {
  return (
    <Card className={cn("p-5", dark && "bg-foreground text-background")}>
      <p className={cn("text-[13px] font-medium", dark ? "text-background/60" : "text-muted")}>{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items
          .filter((x) => x.w)
          .map((x) => (
            <li key={x.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                {x.w!.live && <span className={cn("size-2 animate-pulse rounded-full", dark ? "bg-background" : "bg-foreground")} />}
                {x.label}
              </span>
              <span className="tabular font-medium">
                {x.w!.start}–{x.w!.end}
              </span>
            </li>
          ))}
      </ul>
    </Card>
  );
}

function CurrentPlace({ place, title }: { place: Place; title: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Place | null>(place);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-subtle px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground">
        <MapPin className="size-3.5" /> {place.name}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={title} description="Sunrise, sunset, muhurtas and Rahu Kaal depend on where you are.">
          <PlacePicker id="current-place" value={value} onChange={setValue} />
          <Button
            size="lg"
            className="mt-5 w-full"
            disabled={!value || pending}
            onClick={() =>
              value &&
              startTransition(async () => {
                await saveCurrentPlace(value);
                setOpen(false);
              })
            }
          >
            Save location
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
