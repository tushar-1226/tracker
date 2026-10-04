"use client";

import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Chips } from "@/components/ui/chips";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KIND_DEFAULTS, KIND_LABEL, type ReminderKind } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import { deleteReminder, saveReminder, setReminderEnabled } from "@/server/actions/notifications";

export type ReminderView = {
  id: string;
  kind: ReminderKind;
  refId: string | null;
  title: string;
  body: string | null;
  url: string;
  time: string;
  days: number[];
  enabled: boolean;
};

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function daysLabel(days: number[]) {
  if (!days.length || days.length === 7) return "Every day";
  const sorted = [...days].sort();
  if (sorted.join() === "1,2,3,4,5") return "Weekdays";
  if (sorted.join() === "0,6") return "Weekends";
  return WEEK.filter((d) => days.includes(d)).map((d) => DAY[d]).join(" ");
}

export function RemindersCard({
  reminders,
  habits,
  timeZone,
}: {
  reminders: ReminderView[];
  habits: { id: string; name: string }[];
  timeZone: string;
}) {
  const [form, setForm] = useState<{ open: boolean; draft?: Partial<ReminderView>; key: number }>({ open: false, key: 0 });
  const open = (draft?: Partial<ReminderView>) => setForm((f) => ({ open: true, draft, key: f.key + 1 }));
  const presets: ReminderKind[] = ["horoscope", "journal", "workout", "study", "reading", "spending", "summary", "habit", "custom"];

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b p-6">
        <div>
          <CardLabel>Reminders</CardLabel>
          <p className="mt-1 text-sm text-muted">Sent at your local time ({timeZone}). Skipped automatically when it’s already done.</p>
        </div>
        <Button onClick={() => open()}>
          <Plus /> Add reminder
        </Button>
      </div>

      {reminders.length ? (
        <ul className="divide-y">
          {reminders.map((r) => (
            <ReminderRow key={r.id} r={r} onEdit={() => open(r)} />
          ))}
        </ul>
      ) : (
        <div className="p-6">
          <p className="text-sm text-muted">Quick start:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => open({ kind: k })}
                className="h-10 rounded-full bg-subtle px-4 text-xs font-medium text-muted transition-colors hover:bg-foreground hover:text-background"
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}>
        <ReminderForm key={form.key} draft={form.draft} habits={habits} onDone={() => setForm((f) => ({ ...f, open: false }))} />
      </Dialog>
    </Card>
  );
}

function ReminderRow({ r, onEdit }: { r: ReminderView; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className={cn("flex items-center gap-2 px-4 py-3 md:gap-4 md:px-6 md:py-4", pending && "opacity-60", !r.enabled && "text-muted")}>
      {/* The whole left side edits, so phones keep room for the title. */}
      <button type="button" onClick={onEdit} aria-label={`Edit ${r.title}`} className="flex min-w-0 flex-1 items-center gap-3 text-left md:gap-4">
        <span className="tabular shrink-0 text-xl font-medium md:w-16 md:text-2xl">{r.time}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{r.title}</span>
          <span className="block truncate text-xs text-muted">
            {KIND_LABEL[r.kind]} · {daysLabel(r.days)}
          </span>
        </span>
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={r.enabled}
        aria-label={`${r.enabled ? "Disable" : "Enable"} ${r.title}`}
        onClick={() => startTransition(() => setReminderEnabled(r.id, !r.enabled))}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", r.enabled ? "bg-foreground" : "bg-subtle")}
      >
        <span className={cn("absolute top-1 size-5 rounded-full shadow-sm transition-all duration-300 ease-out-expo", r.enabled ? "left-[calc(100%-1.5rem)] bg-background" : "left-1 bg-surface")} />
      </button>
      <button type="button" aria-label={`Edit ${r.title}`} onClick={onEdit} className="hidden size-10 items-center justify-center rounded-full hover:bg-subtle md:inline-flex">
        <Pencil className="size-4" />
      </button>
      <button type="button" aria-label={`Delete ${r.title}`} onClick={() => startTransition(() => deleteReminder(r.id))} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-subtle">
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

export function ReminderForm({
  draft,
  habits,
  onDone,
  lockKind,
}: {
  draft?: Partial<ReminderView>;
  habits: { id: string; name: string }[];
  onDone: () => void;
  lockKind?: boolean;
}) {
  const initialKind = draft?.kind ?? "journal";
  const defaults = (k: ReminderKind) => (k === "habit" || k === "custom" ? null : KIND_DEFAULTS[k]);
  const [kind, setKind] = useState<ReminderKind>(initialKind);
  const [refId, setRefId] = useState(draft?.refId ?? habits[0]?.id ?? "");
  const [title, setTitle] = useState(draft?.title ?? defaults(initialKind)?.title ?? "");
  const [body, setBody] = useState(draft?.body ?? defaults(initialKind)?.body ?? "");
  const [time, setTime] = useState(draft?.time ?? defaults(initialKind)?.time ?? "09:00");
  const [days, setDays] = useState<number[]>(draft?.days ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pickKind = (k: ReminderKind) => {
    setKind(k);
    const d = defaults(k);
    if (d && !draft?.id) {
      setTitle(d.title);
      setBody(d.body);
      setTime(d.time);
    }
    if (k === "workout" && !draft?.id) setDays([1, 3, 5]);
    if (k === "summary" && !draft?.id) setDays([1]);
  };
  const habitName = habits.find((h) => h.id === refId)?.name;

  const submit = () => {
    const finalTitle = kind === "habit" && !title.trim() ? (habitName ?? "") : title;
    if (kind === "habit" && !refId) return setError("Pick a habit");
    if (!finalTitle.trim()) return setError("Add a title");
    setError(null);
    startTransition(async () => {
      await saveReminder({
        id: draft?.id,
        kind,
        refId: kind === "habit" ? refId : null,
        title: finalTitle,
        body: body.trim() || (kind === "habit" ? "Keep your streak going." : null),
        url: kind === "habit" ? `/habits/${refId}` : (defaults(kind)?.url ?? draft?.url ?? "/"),
        time,
        days,
      });
      onDone();
    });
  };

  return (
    <DialogContent title={draft?.id ? "Edit reminder" : "New reminder"}>
      <div className="space-y-5">
        {!lockKind && (
          <div className="space-y-2">
            <Label>Remind me to</Label>
            <Chips
              value={kind}
              onChange={pickKind}
              options={(Object.keys(KIND_LABEL) as ReminderKind[]).filter((k) => k !== "habit" || habits.length).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
            />
          </div>
        )}
        {kind === "habit" && !lockKind && (
          <div className="space-y-2">
            <Label>Habit</Label>
            <Chips value={refId} onChange={setRefId} options={habits.map((h) => ({ value: h.id, label: h.name }))} />
          </div>
        )}
        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <div className="space-y-2">
            <Label htmlFor="rem-time">Time</Label>
            <Input id="rem-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="tabular text-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rem-title">Title</Label>
            <Input id="rem-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "habit" ? habitName : "Reminder"} maxLength={80} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rem-body">Message</Label>
          <Input id="rem-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional" maxLength={160} />
        </div>
        <div className="space-y-2">
          <Label>Days · {daysLabel(days)}</Label>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                  className={cn("h-11 rounded-full text-[11px] font-semibold transition-colors", on ? "bg-foreground text-background" : "bg-subtle hover:bg-foreground/10")}
                >
                  {DAY[d].slice(0, 2)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">Leave all off for every day.</p>
        </div>
        {error && <p className="text-xs">— {error}</p>}
        <Button size="lg" className="w-full" onClick={submit} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : draft?.id ? "Save reminder" : "Create reminder"}
        </Button>
      </div>
    </DialogContent>
  );
}
