"use client";

import { LoaderCircle, Play, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Ring } from "@/components/charts/ring";
import { Magnetic } from "@/components/motion/magnetic";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Chips } from "@/components/ui/chips";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { formatDuration } from "@/lib/fitness";
import { logFocusSession } from "@/server/actions/learning";

type Focus = { skillId: string; minutes: number; startedAt: number; endsAt: number };

// The running timer lives in localStorage so it survives reloads and navigation,
// with an in-memory fallback when storage is unavailable.
const KEY = "track.focus";
const listeners = new Set<() => void>();
let memory: string | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function getSnapshot() {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}
function write(focus: Focus | null) {
  memory = focus ? JSON.stringify(focus) : null;
  try {
    if (memory) localStorage.setItem(KEY, memory);
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}
const nowMs = () => Date.now();
const begin = (skillId: string, minutes: number): Focus => {
  const startedAt = Date.now();
  return { skillId, minutes, startedAt, endsAt: startedAt + minutes * 60_000 };
};

export function FocusTimer({ skills }: { skills: { id: string; name: string }[] }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const focus: Focus | null = raw ? JSON.parse(raw) : null;
  const [chosen, setSkillId] = useState(skills[0]?.id ?? "");
  // Falls back to the first skill if the chosen one is gone (or none existed at mount).
  const skillId = skills.some((s) => s.id === chosen) ? chosen : (skills[0]?.id ?? "");
  const [length, setLength] = useState<"25" | "50" | "90">("25");
  const [now, setNow] = useState(0);
  const [summary, setSummary] = useState("");
  const [stopped, setStopped] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!focus) return;
    const tick = () => setNow(nowMs());
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [focus?.endsAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = focus ? Math.max(0, focus.endsAt - now) : 0;
  const done = !!focus && now > 0 && remaining === 0;
  const elapsedMin = focus ? Math.floor(((stopped ?? Math.min(now, focus.endsAt)) - focus.startedAt) / 60_000) : 0;
  const skillName = skills.find((s) => s.id === focus?.skillId)?.name;

  useEffect(() => {
    if (!focus || !now) return;
    document.title = done ? "Focus done · track." : `${formatDuration(Math.ceil(remaining / 1000))} · ${skillName ?? "Focus"}`;
    return () => {
      document.title = "Learning · track.";
    };
  }, [focus, now, done, remaining, skillName]);

  useEffect(() => {
    if (done && navigator.userActivation?.hasBeenActive) navigator.vibrate?.([200, 100, 200]);
  }, [done]);

  const save = (minutes: number) =>
    startTransition(async () => {
      await logFocusSession(focus!.skillId, minutes, summary);
      write(null);
      setSummary("");
      setStopped(null);
    });
  const discard = () => {
    write(null);
    setStopped(null);
  };

  if (!skills.length) {
    return (
      <Card className="flex h-full flex-col justify-center text-center">
        <CardLabel>Focus timer</CardLabel>
        <p className="mt-2 text-sm text-muted">Add a skill to start a focus session.</p>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col items-center gap-5 text-center">
      <CardLabel className="self-start">Focus timer</CardLabel>
      <AnimatePresence mode="wait" initial={false}>
        {!focus ? (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex w-full flex-col items-center gap-5">
            <Chips value={skillId} onChange={setSkillId} options={skills.map((s) => ({ value: s.id, label: s.name }))} className="justify-center" />
            <Segmented
              value={length}
              onChange={setLength}
              options={[
                { value: "25", label: "25 min" },
                { value: "50", label: "50 min" },
                { value: "90", label: "90 min" },
              ]}
              className="w-full max-w-xs"
            />
            <Magnetic>
              <Button size="lg" onClick={() => write(begin(skillId, Number(length)))} disabled={!skillId} data-cursor-label="Focus">
                <Play /> Start focus
              </Button>
            </Magnetic>
          </motion.div>
        ) : done || stopped !== null ? (
          <motion.form
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full flex-col items-center gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save(done ? focus.minutes : elapsedMin);
            }}
          >
            <p className="text-2xl font-semibold tracking-tight">{done ? "Session complete" : `${elapsedMin} min so far`}</p>
            <p className="text-sm text-muted">{skillName}</p>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What did you work on? (optional)" aria-label="Session summary" />
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={discard}>
                Discard
              </Button>
              <Button type="submit" className="flex-1" disabled={pending || (!done && elapsedMin < 1)}>
                {pending ? <LoaderCircle className="animate-spin" /> : `Log ${done ? focus.minutes : elapsedMin} min`}
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div key="run" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
            <Ring value={now ? 1 - remaining / (focus.minutes * 60_000) : 0} size={190} stroke={8}>
              <span className="tabular text-4xl font-medium" role="timer">
                {now ? formatDuration(Math.ceil(remaining / 1000)) : "—"}
              </span>
              <span className="mt-1 text-xs text-muted">{skillName}</span>
            </Ring>
            <Button variant="outline" onClick={() => setStopped(nowMs())}>
              <Square /> Stop
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
