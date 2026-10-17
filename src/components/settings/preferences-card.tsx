"use client";

import { Download, LoaderCircle, LogOut, Minus, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { ThemePicker } from "@/components/layout/theme-toggle";
import type { UserSettings } from "@/db/schema";
import { CURRENCIES, currencySymbol } from "@/lib/money/math";
import { logout } from "@/server/actions/auth";
import { changePassword, updateName, updatePreferences } from "@/server/actions/settings";

/** Preferences save the moment they change. */
export function PreferencesCard({ settings }: { settings: UserSettings }) {
  const [prefs, setPrefs] = useState({
    currency: settings.currency ?? "INR",
    units: settings.units ?? "kg",
    weekStartsOn: settings.weekStartsOn ?? 1,
    cursor: settings.cursor !== false,
    workoutTarget: settings.workoutTarget ?? 3,
    learningTarget: settings.learningTarget ?? 30,
    readingGoal: settings.readingGoal ?? 12,
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [, startTransition] = useTransition();

  const set = <K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setStatus("saving");
    startTransition(async () => {
      await updatePreferences({ [key]: value });
      setStatus("saved");
    });
  };

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b px-6 py-5">
        <CardLabel>Preferences</CardLabel>
        <span className="text-xs text-muted" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
        </span>
      </div>
      <div className="divide-y">
        <Row label="App theme" hint="Choose a mood for your whole workspace.">
          <ThemePicker />
        </Row>
        <Row label="Currency" hint="Used across money, budget and goals.">
          <select
            aria-label="Currency"
            value={prefs.currency}
            onChange={(e) => set("currency", e.target.value as (typeof CURRENCIES)[number])}
            className="h-10 rounded-full bg-subtle px-4 text-sm outline-none focus:ring-2 focus:ring-foreground/15"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {currencySymbol(c)} · {c}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Weight units" hint="Gym, PRs and body weight.">
          <Segmented value={prefs.units} onChange={(v) => set("units", v)} options={[{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]} className="w-40" />
        </Row>
        <Row label="Week starts on" hint="Streaks, weekly targets and summaries.">
          <Segmented
            value={String(prefs.weekStartsOn) as "0" | "1"}
            onChange={(v) => set("weekStartsOn", Number(v) as 0 | 1)}
            options={[{ value: "1", label: "Monday" }, { value: "0", label: "Sunday" }]}
            className="w-56"
          />
        </Row>
        <Row label="Workouts per week" hint="Your weekly gym target.">
          <Stepper label="workouts per week" value={prefs.workoutTarget} min={1} max={14} onChange={(v) => set("workoutTarget", v)} />
        </Row>
        <Row label="Daily learning" hint="Minutes that count as a full learning day.">
          <Stepper label="daily learning minutes" value={prefs.learningTarget} min={5} max={600} step={5} unit="min" onChange={(v) => set("learningTarget", v)} />
        </Row>
        <Row label="Reading goal" hint="Books to finish this year.">
          <Stepper label="reading goal" value={prefs.readingGoal} min={1} max={500} unit="books" onChange={(v) => set("readingGoal", v)} />
        </Row>
        <Row label="Custom cursor" hint="The dot-and-ring cursor on desktop.">
          <button
            type="button"
            role="switch"
            aria-checked={prefs.cursor}
            aria-label="Custom cursor"
            onClick={() => set("cursor", !prefs.cursor)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${prefs.cursor ? "bg-foreground" : "bg-subtle"}`}
          >
            <span className={`absolute top-1 size-5 rounded-full shadow-sm transition-all duration-300 ease-out-expo ${prefs.cursor ? "left-[calc(100%-1.5rem)] bg-background" : "left-1 bg-surface"}`} />
          </button>
        </Row>
      </div>
    </Card>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function Stepper({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-full bg-subtle p-1">
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} className="inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface disabled:opacity-30">
        <Minus className="size-4" />
      </button>
      <span className="tabular min-w-20 text-center text-sm">
        {value}
        {unit && <span className="ml-1 text-xs text-muted">{unit}</span>}
      </span>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} className="inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface disabled:opacity-30">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function AccountCard({ name, email }: { name: string; email: string }) {
  const [value, setValue] = useState(name);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex h-full flex-col gap-5">
      <CardLabel>Account</CardLabel>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && value !== name) startTransition(() => updateName(value));
        }}
      >
        <Label htmlFor="acct-name-input">Name</Label>
        <div className="flex gap-2">
          <Input id="acct-name-input" value={value} onChange={(e) => setValue(e.target.value)} maxLength={50} />
          <Button type="submit" variant="outline" disabled={pending || !value.trim() || value === name}>
            Save
          </Button>
        </div>
        <p className="text-xs text-muted">{email}</p>
      </form>
      <form
        className="space-y-2 border-t pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await changePassword(pw.current, pw.next);
            setMsg(res.error ?? "Password changed.");
            if (res.ok) setPw({ current: "", next: "" });
          });
        }}
      >
        <Label>Change password</Label>
        <Input type="password" autoComplete="current-password" placeholder="Current password" aria-label="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <Input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" aria-label="New password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="outline" disabled={pending || !pw.current || !pw.next}>
            {pending ? <LoaderCircle className="animate-spin" /> : "Update password"}
          </Button>
          {msg && <span className="text-xs">{msg}</span>}
        </div>
      </form>
      <form action={logout} className="mt-auto border-t pt-5">
        <Button type="submit" variant="ghost">
          <LogOut /> Log out
        </Button>
      </form>
    </Card>
  );
}

export function DataCard() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runImport = () =>
    startTransition(async () => {
      if (!file) return;
      const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text() });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(body.error ?? "Import failed.");
      } else {
        const total = Object.values(body.counts as Record<string, number>).reduce((a, b) => a + b, 0);
        setMsg(`Imported ${total.toLocaleString("en-IN")} records.`);
        router.refresh();
      }
      setFile(null);
    });

  return (
    <Card className="flex h-full flex-col gap-5">
      <CardLabel>Your data</CardLabel>
      <p className="text-sm text-muted">Everything you track, in one JSON file. Keep a backup, or move to another server.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <a href="/api/export" download>
            <Download /> Export
          </a>
        </Button>
        <Button variant="outline" onClick={() => input.current?.click()} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Upload />} Import
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Choose export file"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
      {msg && <p className="border-t pt-3 text-xs">{msg}</p>}
      <Dialog open={!!file} onOpenChange={(o) => !o && setFile(null)}>
        <DialogContent title="Replace all data?" description={`Importing “${file?.name}” replaces everything in this account — habits, money, workouts, notes, all of it. Export first if you want a backup.`}>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={runImport} disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : "Replace & import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
