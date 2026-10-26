import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { Card, CardLabel } from "@/components/ui/card";
import { type HoroscopeLang, names } from "@/lib/astro/i18n";
import type { CoupleToday } from "@/server/couple";

const TONE = {
  bright: "A good day to spend time together or plan something.",
  steady: "An ordinary, steady day. Keep plans simple.",
  gentle: "One of you may feel low on energy. Go easy, and keep big talks for another day.",
} as const;

const hm = (ms: number, tz: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);

/** "Together today": both readings against today's sky, from the saved partner. */
export function CoupleCard({ couple, lang }: { couple: CoupleToday | null; lang: HoroscopeLang }) {
  if (!couple) {
    return (
      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <CardLabel>Together today</CardLabel>
          <p className="mt-1 text-[15px] text-muted">Save your partner to see both of your days side by side.</p>
        </div>
        <Link href="/horoscope/compatibility" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background shadow-soft">
          <HeartHandshake className="size-4" /> Add partner
        </Link>
      </Card>
    );
  }
  const n = names(lang);
  const people = [couple.you, couple.partner];
  return (
    <Card className="mt-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardLabel>Together today</CardLabel>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {couple.together}
            <span className="text-base font-normal text-muted"> / 100</span>
          </p>
          <p className="mt-1 max-w-md text-[15px] text-muted">{TONE[couple.tone]}</p>
        </div>
        <Link href="/horoscope/compatibility" className="text-sm text-muted underline-offset-4 hover:underline">
          Full compatibility
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {people.map((p) => (
          <div key={p.name} className="rounded-2xl bg-subtle/60 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium">{p.name}</p>
              <p className="tabular text-lg font-medium">{p.score}</p>
            </div>
            <p className="mt-1 text-[15px]">{p.headline}</p>
            <p className="mt-2 text-xs text-muted">
              Dasha {n.graha(p.mahaGraha)}–{n.graha(p.antarGraha)}
              {p.chandrashtama ? " · Chandrashtama today" : ""}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        Shared Rahu Kaal {hm(couple.rahuKaal.start, couple.tz)}–{hm(couple.rahuKaal.end, couple.tz)}: avoid starting something new together.
      </p>
    </Card>
  );
}
