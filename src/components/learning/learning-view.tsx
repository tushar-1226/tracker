"use client";

import { Archive, ExternalLink, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useActionState, useState, useTransition } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/column-chart";
import { HABIT_ICONS, HabitIcon } from "@/components/habits/icons";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Chips } from "@/components/ui/chips";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { type Day, addDays, eachDay, toDate, formatDate } from "@/lib/dates";
import { nextMilestone } from "@/lib/growth";
import { cn } from "@/lib/utils";
import {
  addTil,
  archiveSkill,
  deleteResource,
  deleteSession,
  deleteTil,
  logSession,
  saveResource,
  saveSkill,
  setResourceStatus,
} from "@/server/actions/learning";
import { FocusTimer } from "./focus-timer";

type Skill = { id: string; name: string; icon: string; targetHours: number | null };
type Session = { id: string; skillId: string; date: Day; minutes: number; summary: string | null };
type Til = { id: string; text: string; date: Day; skillId: string | null };
type Resource = { id: string; title: string; url: string | null; kind: string; status: "todo" | "doing" | "done"; skillId: string | null };
type FormState = { ok?: boolean; errors?: Record<string, string[]>; message?: string } | undefined;

const dayLabel = (d: Day, today: Day) =>
  d === today ? "Today" : d === addDays(today, -1) ? "Yesterday" : formatDate(toDate(d), { day: "numeric", month: "short", timeZone: "UTC" });
const hours = (min: number) => Math.round((min / 60) * 10) / 10;

export function LearningView({
  today,
  skills,
  sessions,
  tils,
  resources,
  stats,
  openLog,
}: {
  today: Day;
  skills: Skill[];
  sessions: Session[];
  tils: Til[];
  resources: Resource[];
  stats: { todayMin: number; weekMin: number; streak: number; totalMin: number };
  openLog: boolean;
}) {
  const [skillForm, setSkillForm] = useState<{ open: boolean; skill?: Skill; key: number }>({ open: false, key: 0 });
  const [logOpen, setLogOpen] = useState(openLog);
  const [logKey, setLogKey] = useState(0);
  const minutesBySkill = new Map<string, number>();
  const lastBySkill = new Map<string, Day>();
  for (const s of sessions) {
    minutesBySkill.set(s.skillId, (minutesBySkill.get(s.skillId) ?? 0) + s.minutes);
    if (!lastBySkill.has(s.skillId)) lastBySkill.set(s.skillId, s.date);
  }
  const skillName = (id: string | null) => skills.find((s) => s.id === id)?.name;

  const days = eachDay(addDays(today, -13), today);
  const perDay = days.map((d) => sessions.filter((s) => s.date === d).reduce((a, s) => a + s.minutes, 0));

  return (
    <>
      <PageHeader
        title="Learning"
        description="Skills, study hours and things you learned."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSkillForm((f) => ({ open: true, key: f.key + 1 }))}>
              New skill
            </Button>
            <Button
              onClick={() => {
                setLogKey((k) => k + 1);
                setLogOpen(true);
              }}
              disabled={!skills.length}
            >
              <Plus /> Log session
            </Button>
          </div>
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Today" value={stats.todayMin} unit="min" />
        <Stat label="This week" value={hours(stats.weekMin)} unit="hours" decimals={1} />
        <Stat label="Streak" value={stats.streak} unit={stats.streak === 1 ? "day" : "days"} />
        <Stat label="All time" value={hours(stats.totalMin)} unit="hours" decimals={1} />
      </Stagger>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Reveal>
          <FocusTimer skills={skills} />
        </Reveal>
        <Reveal delay={0.05} className="md:col-span-2">
          <ChartCard
            title="Study time"
            subtitle="Last 14 days"
            className="h-full"
            table={{ columns: ["Day", "Minutes"], rows: days.map((d, i) => [dayLabel(d, today), perDay[i]]).reverse() }}
          >
            <ColumnChart
              ariaLabel="Minutes studied per day over the last 14 days"
              labels={days.map((d) => String(Number(d.slice(8))))}
              titles={days.map((d) => dayLabel(d, today))}
              series={[{ name: "Minutes", tone: "fg", values: perDay }]}
              format={(v) => `${v} min`}
              formatAxis={(v) => String(v)}
              height={240}
            />
          </ChartCard>
        </Reveal>
      </div>

      <Reveal className="mt-10 mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Skills</h2>
      </Reveal>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {skills.map((s, i) => {
          const h = hours(minutesBySkill.get(s.id) ?? 0);
          const goal = s.targetHours ? { next: s.targetHours, prev: 0, progress: h / s.targetHours } : nextMilestone(h);
          const last = lastBySkill.get(s.id);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="group flex flex-col gap-5 rounded-3xl bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-subtle">
                    <HabitIcon name={s.icon} />
                  </span>
                  <span>
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-xs text-muted">{last ? `Last studied ${dayLabel(last, today).toLowerCase()}` : "Not started"}</span>
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Edit ${s.name}`}
                  onClick={() => setSkillForm((f) => ({ open: true, skill: s, key: f.key + 1 }))}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-subtle hover:text-foreground focus:opacity-100"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
              <div>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight">{h}</span>
                  <span className="text-sm text-muted">/ {goal.next} h {s.targetHours ? "goal" : "milestone"}</span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hairline">
                  <motion.div
                    className="h-full rounded-full bg-foreground"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(1, goal.progress) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
        <button
          type="button"
          onClick={() => setSkillForm((f) => ({ open: true, key: f.key + 1 }))}
          className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-3xl bg-foreground/[0.035] text-sm text-muted transition-colors hover:bg-subtle hover:text-foreground"
        >
          <Plus className="size-5" />
          {skills.length ? "Add skill" : "Add your first skill — e.g. Rust, Guitar, System Design"}
        </button>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Reveal>
          <TilCard tils={tils} skills={skills} today={today} skillName={skillName} />
        </Reveal>
        <Reveal delay={0.05}>
          <ResourcesCard resources={resources} skills={skills} skillName={skillName} />
        </Reveal>
      </div>

      <Reveal className="mt-4">
        <Card>
          <CardLabel>Recent sessions</CardLabel>
          {sessions.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Sessions you log or finish with the focus timer appear here.</p>
          ) : (
            <ul className="-mx-2 mt-3">
              {sessions.slice(0, 10).map((s) => (
                <SessionRow key={s.id} session={s} skill={skillName(s.skillId)} today={today} />
              ))}
            </ul>
          )}
        </Card>
      </Reveal>

      <Dialog open={skillForm.open} onOpenChange={(open) => setSkillForm((f) => ({ ...f, open }))}>
        <SkillForm key={skillForm.key} skill={skillForm.skill} onDone={() => setSkillForm((f) => ({ ...f, open: false }))} />
      </Dialog>
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <LogForm key={logKey} skills={skills} today={today} onDone={() => setLogOpen(false)} />
      </Dialog>
    </>
  );
}

function Stat({ label, value, unit, decimals = 0 }: { label: string; value: number; unit: string; decimals?: number }) {
  return (
    <StaggerItem>
      <Card className="flex h-full flex-col justify-between gap-6">
        <CardLabel>{label}</CardLabel>
        <p className="flex items-baseline gap-1.5">
          <NumberTicker value={value} decimals={Number.isInteger(value) ? 0 : decimals} className="tabular text-4xl font-medium" />
          <span className="text-sm text-muted">{unit}</span>
        </p>
      </Card>
    </StaggerItem>
  );
}

function SessionRow({ session, skill, today }: { session: Session; skill?: string; today: Day }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className={cn("group flex items-center gap-4 rounded-2xl px-2 py-2.5 transition-colors hover:bg-subtle", pending && "opacity-40")}>
      <span className="w-20 shrink-0 text-xs text-muted">{dayLabel(session.date, today)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{session.summary || skill}</span>
        {session.summary && <span className="block text-xs text-muted">{skill}</span>}
      </span>
      <span className="text-sm tabular-nums">{session.minutes} min</span>
      <button
        type="button"
        aria-label="Delete session"
        onClick={() => startTransition(() => deleteSession(session.id))}
        className="inline-flex size-7 items-center justify-center rounded-full text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

function TilCard({ tils, skills, today, skillName }: { tils: Til[]; skills: Skill[]; today: Day; skillName: (id: string | null) => string | undefined }) {
  const [text, setText] = useState("");
  const [skillId, setSkillId] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Card className="h-full">
      <CardLabel>Today I learned</CardLabel>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          startTransition(async () => {
            await addTil(text, skillId || null);
            setText("");
          });
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="One thing you learned…" aria-label="Today I learned" maxLength={500} />
        <Button type="submit" size="icon" className="size-11 shrink-0" aria-label="Add" disabled={pending || !text.trim()}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
        </Button>
      </form>
      {skills.length > 0 && text && (
        <Chips value={skillId} onChange={(v) => setSkillId(v === skillId ? "" : v)} options={skills.map((s) => ({ value: s.id, label: s.name }))} className="mt-2" />
      )}
      <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto" data-lenis-prevent>
        {tils.map((t) => (
          <TilRow key={t.id} til={t} today={today} skill={skillName(t.skillId)} />
        ))}
        {!tils.length && <li className="text-sm text-muted">Small notes add up. Write one a day.</li>}
      </ul>
    </Card>
  );
}

function TilRow({ til, today, skill }: { til: Til; today: Day; skill?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className={cn("group flex gap-3 border-l-2 border-foreground/15 pl-3", pending && "opacity-40")}>
      <span className="flex-1">
        <span className="block text-sm">{til.text}</span>
        <span className="block text-xs text-muted">
          {dayLabel(til.date, today)}
          {skill && ` · ${skill}`}
        </span>
      </span>
      <button
        type="button"
        aria-label="Delete note"
        onClick={() => startTransition(() => deleteTil(til.id))}
        className="inline-flex size-7 items-center justify-center rounded-full text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

const NEXT_STATUS = { todo: "doing", doing: "done", done: "todo" } as const;
const STATUS_LABEL = { todo: "To do", doing: "In progress", done: "Done" } as const;

function ResourcesCard({ resources, skills, skillName }: { resources: Resource[]; skills: Skill[]; skillName: (id: string | null) => string | undefined }) {
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<"course" | "book" | "video" | "article" | "other">("course");
  const [skillId, setSkillId] = useState("");
  const [pending, startTransition] = useTransition();
  const [state, action, saving] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await saveResource(prev, fd);
    if (res?.ok) setAdding(false);
    return res;
  }, undefined);

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between">
        <CardLabel>Resources</CardLabel>
        <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)}>
          {adding ? <X /> : <Plus />} {adding ? "Cancel" : "Add"}
        </Button>
      </div>
      {adding && (
        <form action={action} className="mt-3 space-y-3 rounded-2xl bg-subtle p-3">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="skillId" value={skillId} />
          <Input name="title" placeholder="Title" aria-label="Resource title" autoFocus />
          <Input name="url" placeholder="Link (optional)" aria-label="Resource link" />
          {(state?.errors?.title || state?.errors?.url) && <p className="text-xs text-muted">— {state.errors.title?.[0] ?? state.errors.url?.[0]}</p>}
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: "course", label: "Course" },
              { value: "book", label: "Book" },
              { value: "video", label: "Video" },
              { value: "article", label: "Article" },
            ]}
          />
          {skills.length > 0 && <Chips value={skillId} onChange={(v) => setSkillId(v === skillId ? "" : v)} options={skills.map((s) => ({ value: s.id, label: s.name }))} />}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : "Save resource"}
          </Button>
        </form>
      )}
      <ul className="mt-3 max-h-80 overflow-y-auto" data-lenis-prevent>
        {resources.map((r) => (
          <li key={r.id} className="group flex items-center gap-3 rounded-xl px-1 py-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => setResourceStatus(r.id, NEXT_STATUS[r.status]))}
              className={cn(
                "h-6 shrink-0 rounded-full bg-subtle px-2.5 text-[10px] font-medium transition-colors",
                r.status === "done" ? "bg-foreground text-background" : r.status === "doing" ? "bg-foreground/15" : "text-muted",
              )}
              title="Change status"
            >
              {STATUS_LABEL[r.status]}
            </button>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-sm", r.status === "done" && "text-muted line-through")}>{r.title}</span>
              <span className="block text-xs text-muted capitalize">
                {r.kind}
                {r.skillId && ` · ${skillName(r.skillId)}`}
              </span>
            </span>
            {r.url && (
              <a href={r.url} target="_blank" rel="noreferrer" aria-label={`Open ${r.title}`} className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:text-foreground">
                <ExternalLink className="size-3.5" />
              </a>
            )}
            <button
              type="button"
              aria-label={`Delete ${r.title}`}
              onClick={() => startTransition(() => deleteResource(r.id))}
              className="inline-flex size-7 items-center justify-center rounded-full text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
        {!resources.length && !adding && <li className="py-6 text-center text-sm text-muted">Courses, books and videos you’re working through.</li>}
      </ul>
    </Card>
  );
}

function SkillForm({ skill, onDone }: { skill?: Skill; onDone: () => void }) {
  const [icon, setIcon] = useState(skill?.icon ?? "sparkles");
  const [archiving, startArchive] = useTransition();
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await saveSkill(prev, fd);
    if (res?.ok) onDone();
    return res;
  }, undefined);
  return (
    <DialogContent title={skill ? "Edit skill" : "New skill"} description={skill ? undefined : "Something you want to get better at."}>
      <form action={action} className="space-y-5">
        {skill && <input type="hidden" name="id" value={skill.id} />}
        <input type="hidden" name="icon" value={icon} />
        <div className="space-y-2">
          <Label htmlFor="skill-name">Name</Label>
          <Input id="skill-name" name="name" defaultValue={skill?.name} placeholder="e.g. Rust" autoFocus={!skill} />
          {state?.errors?.name && <p className="text-xs text-muted">— {state.errors.name[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="skill-target">Goal in hours (optional)</Label>
          <Input id="skill-target" name="targetHours" inputMode="decimal" defaultValue={skill?.targetHours ?? ""} placeholder="e.g. 100" />
          <p className="text-xs text-muted">Without a goal, progress tracks milestones: 1, 5, 10, 25, 50, 100 hours…</p>
        </div>
        <div className="space-y-2">
          <Label>Icon</Label>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.entries(HABIT_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                aria-label={key}
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className={cn("flex aspect-square items-center justify-center rounded-2xl transition-colors", icon === key ? "bg-foreground text-background" : "border-transparent hover:bg-subtle")}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {skill && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={archiving}
              onClick={() =>
                startArchive(async () => {
                  await archiveSkill(skill.id);
                  onDone();
                })
              }
            >
              <Archive /> Archive
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : skill ? "Save" : "Create skill"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function LogForm({ skills, today, onDone }: { skills: Skill[]; today: Day; onDone: () => void }) {
  const [skillId, setSkillId] = useState(skills[0]?.id ?? "");
  const [minutes, setMinutes] = useState("30");
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await logSession(prev, fd);
    if (res?.ok) onDone();
    return res;
  }, undefined);
  return (
    <DialogContent title="Log a study session">
      <form action={action} className="space-y-5">
        <input type="hidden" name="skillId" value={skillId} />
        <div className="space-y-2">
          <Label>Skill</Label>
          <Chips value={skillId} onChange={setSkillId} options={skills.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="log-minutes">Minutes</Label>
          <div className="flex gap-1.5">
            {["15", "30", "45", "60", "90"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={cn("h-11 flex-1 rounded-full bg-subtle text-xs font-medium transition-colors", minutes === m ? "bg-foreground text-background" : "text-muted hover:text-foreground")}
              >
                {m}
              </button>
            ))}
            <Input id="log-minutes" name="minutes" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-20 text-center" />
          </div>
          {state?.errors?.minutes && <p className="text-xs text-muted">— {state.errors.minutes[0]}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="log-date">Date</Label>
            <Input id="log-date" name="date" type="date" defaultValue={today} max={today} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="log-summary">What you did</Label>
            <Input id="log-summary" name="summary" placeholder="Optional" maxLength={280} />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : "Log session"}
        </Button>
      </form>
    </DialogContent>
  );
}
