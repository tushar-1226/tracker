"use client";

import { Bell, BellOff, Pencil } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { type ReminderView, ReminderForm, daysLabel } from "@/components/settings/reminders-card";
import { setReminderEnabled } from "@/server/actions/notifications";

/** Reminder for one habit: shows the schedule, opens the reminder form, toggles it. */
export function HabitReminder({ habit, reminder }: { habit: { id: string; name: string }; reminder: ReminderView | null }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const edit = () => {
    setKey((k) => k + 1);
    setOpen(true);
  };

  return (
    <Card className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <CardLabel>Reminder</CardLabel>
        {reminder?.enabled ? <Bell className="size-4" /> : <BellOff className="size-4 text-muted" />}
      </div>
      {reminder ? (
        <div>
          <p className="tabular text-4xl font-medium">{reminder.time}</p>
          <p className="mt-1 text-xs text-muted">
            {daysLabel(reminder.days)} · {reminder.enabled ? "skipped if already done" : "paused"}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">Get a notification at a set time — only if it isn’t done yet.</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant={reminder ? "outline" : "primary"} onClick={edit}>
          {reminder ? <Pencil /> : <Bell />} {reminder ? "Edit" : "Set reminder"}
        </Button>
        {reminder && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(() => setReminderEnabled(reminder.id, !reminder.enabled))}>
            {reminder.enabled ? "Pause" : "Resume"}
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted">
        Notifications must be on for this device — <Link href="/settings" className="underline underline-offset-2">Settings</Link>.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <ReminderForm
          key={key}
          lockKind
          habits={[habit]}
          draft={reminder ?? { kind: "habit", refId: habit.id, title: habit.name, time: "08:00" }}
          onDone={() => setOpen(false)}
        />
      </Dialog>
    </Card>
  );
}
