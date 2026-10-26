"use client";

import { ArrowLeft, HeartHandshake, LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Ring } from "@/components/charts/ring";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import type { Place } from "@/lib/astro/constants";
import { type HoroscopeLang, names } from "@/lib/astro/i18n";
import type { KootaKey, Verdict } from "@/lib/astro/matching";
import { formatDate } from "@/lib/dates";
import { savePartner } from "@/server/actions/horoscope";
import { type CompatibilityResult, type PersonSummary, checkCompatibility } from "@/server/actions/compatibility";
import { PlacePicker } from "./birth-form";

type Birth = { date: string; time: string | null; place: Place };
type Draft = { name: string; date: string; time: string; unknownTime: boolean; place: Place | null };

const draftFrom = (name: string, birth: Birth | null): Draft => ({
  name,
  date: birth?.date ?? "",
  time: birth?.time ?? "",
  unknownTime: birth ? birth.time === null : false,
  place: birth?.place ?? null,
});

const KOOTAS: Record<KootaKey, { label: string; about: string }> = {
  varna: { label: "Varna", about: "Ego and spiritual outlook" },
  vashya: { label: "Vashya", about: "Mutual attraction and influence" },
  tara: { label: "Tara", about: "Health and luck together" },
  yoni: { label: "Yoni", about: "Physical and instinctive match" },
  maitri: { label: "Graha Maitri", about: "Mental wavelength and friendship" },
  gana: { label: "Gana", about: "Temperament" },
  bhakoot: { label: "Bhakoot", about: "Emotional bond, prosperity" },
  nadi: { label: "Nadi", about: "Health and family wellbeing" },
};

const VERDICTS: Record<Verdict, { title: string; text: string }> = {
  excellent: { title: "Excellent match", text: "A very harmonious pairing on the classical scale." },
  good: { title: "Good match", text: "Well suited, with room to work on the smaller differences." },
  average: { title: "Acceptable match", text: "Workable, but a few areas need understanding and effort." },
  low: { title: "Challenging match", text: "Traditionally below the threshold. Chart details and the people matter more than the number." },
};

function PersonForm({ title, draft, onChange, id }: { title: string; draft: Draft; onChange: (d: Draft) => void; id: string }) {
  return (
    <Card className="space-y-4 p-6">
      <CardLabel>{title}</CardLabel>
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input id={`${id}-name`} value={draft.name} maxLength={40} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-date`}>Birth date</Label>
          <Input id={`${id}-date`} type="date" value={draft.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => onChange({ ...draft, date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-time`}>Birth time</Label>
          <Input id={`${id}-time`} type="time" value={draft.time} disabled={draft.unknownTime} onChange={(e) => onChange({ ...draft, time: e.target.value })} />
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={draft.unknownTime} onChange={(e) => onChange({ ...draft, unknownTime: e.target.checked })} /> Don’t know
          </label>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-place`}>Birth place</Label>
        <PlacePicker id={`${id}-place`} value={draft.place} onChange={(place) => onChange({ ...draft, place })} />
      </div>
    </Card>
  );
}

function PersonCard({ p, lang }: { p: PersonSummary; lang: HoroscopeLang }) {
  const n = names(lang);
  const until = (ms: number) => formatDate(ms, { month: "short", year: "numeric", timeZone: "UTC" }, lang === "hi" ? "hi" : "en");
  return (
    <Card className="space-y-4 p-6">
      <div>
        <CardLabel>{p.name}</CardLabel>
        <p className="mt-1 text-xl font-semibold">{n.rashi(p.moonRashi).split(" · ")[0]} Moon</p>
        <p className="text-sm text-muted">
          {n.nakshatra(p.nakshatra.index)} · pada {p.nakshatra.pada}
          {p.lagna !== null ? ` · ${n.rashi(p.lagna).split(" · ")[0]} Lagna` : " · no Lagna (time unknown)"}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[13px] text-muted">Mahadasha</dt>
          <dd className="font-medium">
            {n.graha(p.dasha.maha.graha as never)} <span className="font-normal text-muted">→ {until(p.dasha.maha.end)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Antardasha</dt>
          <dd className="font-medium">
            {n.graha(p.dasha.antar.graha as never)} <span className="font-normal text-muted">→ {until(p.dasha.antar.end)}</span>
          </dd>
        </div>
      </dl>
      <div className="rounded-2xl bg-subtle/60 p-4">
        <p className="text-[13px] text-muted">Today · {p.today.score}/100</p>
        <p className="mt-0.5 font-medium">{p.today.headline}</p>
      </div>
    </Card>
  );
}

export function CompatibilityView({ me, partner, lang }: { me: { name: string; birth: Birth | null }; partner: { name: string; birth: Birth } | null; lang: HoroscopeLang }) {
  const [a, setA] = useState<Draft>(() => draftFrom(me.name, me.birth));
  const [b, setB] = useState<Draft>(() => draftFrom(partner?.name ?? "", partner?.birth ?? null));
  const [groom, setGroom] = useState<"a" | "b">("a");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const toInput = (d: Draft, who: string) => {
    if (!d.name.trim()) return `Add ${who} name`;
    if (!d.date) return `Add ${who} birth date`;
    if (!d.unknownTime && !d.time) return `Add ${who} birth time, or tick “Don’t know”`;
    if (!d.place) return `Choose ${who} birth place`;
    return { name: d.name, birth: { date: d.date, time: d.unknownTime ? null : d.time, place: d.place } };
  };

  const submit = () => {
    const A = toInput(a, "your");
    const B = toInput(b, "your partner’s");
    if (typeof A === "string") return setError(A);
    if (typeof B === "string") return setError(B);
    setError(null);
    startTransition(async () => {
      const r = await checkCompatibility({ a: A, b: B, groom });
      if ("error" in r) return setError(r.error);
      setResult(r);
      requestAnimationFrame(() => document.getElementById("match-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });
  };

  const m = result?.match;
  const v = m && VERDICTS[m.verdict];

  return (
    <>
      <PageHeader
        title="Compatibility"
        description="Kundli matching · Ashtakoota Guna Milan"
        actions={
          <Button variant="outline" asChild>
            <Link href="/horoscope">
              <ArrowLeft /> Horoscope
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PersonForm id="me" title="You" draft={a} onChange={setA} />
        <PersonForm id="partner" title="Your partner" draft={b} onChange={setB} />
      </div>

      <Card className="mt-4 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <CardLabel>Traditional groom side</CardLabel>
          <Segmented
            value={groom}
            onChange={setGroom}
            options={[
              { value: "a", label: a.name.trim() || "You" },
              { value: "b", label: b.name.trim() || "Partner" },
            ]}
          />
          <p className="max-w-md text-xs text-muted">Four of the eight checks (Varna, Vashya, Tara, Gana) are directional in the classical method. Pick who is counted as the groom; the other is the bride.</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {error && <p className="text-xs">— {error}</p>}
          <Button size="lg" onClick={submit} disabled={pending} className="w-full sm:w-auto">
            {pending ? <LoaderCircle className="animate-spin" /> : <HeartHandshake />} Check compatibility
          </Button>
        </div>
      </Card>

      {result && m && v && (
        <div id="match-result" className="mt-10 scroll-mt-6 space-y-4">
          <Reveal>
            <Card className="flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
              <Ring value={m.total / 36} size={168} stroke={11}>
                <NumberTicker value={m.total} className="tabular text-5xl font-medium" />
                <span className="text-xs text-muted">/ 36</span>
              </Ring>
              <div className="min-w-0">
                <CardLabel>
                  {result.a.name} & {result.b.name}
                </CardLabel>
                <h2 className="mt-1.5 text-3xl font-semibold tracking-tight md:text-[2.5rem] md:leading-tight">{v.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{v.text}</p>
                {(m.doshas.length > 0 || !m.manglik.balanced) && (
                  <ul className="mt-4 space-y-1 text-sm">
                    {m.doshas.includes("nadi") && <li>— Nadi dosha: same Nadi scores 0 of 8. Traditionally weighed heavily.</li>}
                    {m.doshas.includes("bhakoot") && <li>— Bhakoot dosha: the Moon signs fall 2/12, 5/9 or 6/8 apart and the lords don’t offset it.</li>}
                    {!m.manglik.balanced && (
                      <li>
                        — Manglik: only {m.manglik.groom ? (result.groom === "a" ? result.a.name : result.b.name) : result.groom === "a" ? result.b.name : result.a.name} has Mars in a sensitive house (1, 2, 4, 7, 8 or 12). Often balanced by remedies or a Manglik partner.
                      </li>
                    )}
                  </ul>
                )}
                {m.doshas.length === 0 && m.manglik.balanced && <p className="mt-4 text-sm">— No Nadi or Bhakoot dosha, and Manglik status is balanced.</p>}
              </div>
            </Card>
          </Reveal>

          <Card className="p-6">
            <CardLabel>The eight kootas</CardLabel>
            <ul className="mt-4 divide-y divide-border/60">
              {m.kootas.map((k, i) => (
                <li key={k.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[11rem_1fr_auto]">
                  <div>
                    <p className="font-medium">{KOOTAS[k.key].label}</p>
                    <p className="text-xs text-muted">{KOOTAS[k.key].about}</p>
                  </div>
                  <div className="order-last col-span-2 sm:order-none sm:col-span-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
                      <motion.div
                        className="h-full rounded-full bg-foreground"
                        initial={{ width: 0 }}
                        animate={{ width: `${(k.score / k.max) * 100}%` }}
                        transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">{k.note}</p>
                  </div>
                  <p className="tabular text-right text-sm font-medium">
                    {k.score} <span className="text-muted">/ {k.max}</span>
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <PersonCard p={result.a} lang={lang} />
            <PersonCard p={result.b} lang={lang} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={saved}
              onClick={() => {
                const B = toInput(b, "your partner’s");
                if (typeof B === "string") return;
                startTransition(async () => {
                  await savePartner(B);
                  setSaved(true);
                });
              }}
            >
              <HeartHandshake /> {saved ? `${b.name.trim()} saved as partner` : `Save ${b.name.trim() || "partner"} as my partner`}
            </Button>
            <p className="text-xs text-muted">Saved partners show up in “Together today” on the horoscope page.</p>
          </div>

          <p className="text-xs leading-relaxed text-muted">
            Computed from each person’s Moon sign and nakshatra (Lahiri, Swiss Ephemeris). Classical exceptions that cancel doshas are only partly modelled, so treat this as guidance, not a verdict on a relationship. Nothing is saved unless you tap “Save as my partner”.
          </p>
        </div>
      )}
    </>
  );
}
