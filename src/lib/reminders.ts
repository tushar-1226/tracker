export type ReminderKind = "habit" | "journal" | "workout" | "study" | "reading" | "spending" | "summary" | "horoscope" | "custom";

/** How late a reminder may still fire (covers a server restart or a missed tick). */
export const SEND_WINDOW_MIN = 30;

export const KIND_DEFAULTS: Record<Exclude<ReminderKind, "habit" | "custom">, { title: string; body: string; url: string; time: string }> = {
  journal: { title: "How was today?", body: "Take a minute to write it down.", url: "/journal", time: "21:30" },
  workout: { title: "Time to train", body: "Your workout is waiting.", url: "/gym", time: "18:00" },
  study: { title: "Focus time", body: "A 25-minute session keeps the streak alive.", url: "/learning", time: "19:00" },
  reading: { title: "Read a few pages", body: "Even 10 pages counts.", url: "/books", time: "22:00" },
  spending: { title: "Log today’s spending", body: "Keep your budget honest.", url: "/money?add=expense", time: "21:00" },
  // The body is filled in at send time with last week's numbers.
  summary: { title: "Your week in review", body: "", url: "/progress", time: "09:00" },
  horoscope: { title: "Today’s horoscope", body: "", url: "/horoscope", time: "07:00" },
};

export const KIND_LABEL: Record<ReminderKind, string> = {
  habit: "Habit",
  journal: "Journal",
  workout: "Workout",
  study: "Study",
  reading: "Reading",
  spending: "Log spending",
  summary: "Weekly summary",
  horoscope: "Horoscope",
  custom: "Custom",
};

export const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** The local calendar day, minute-of-day and weekday for an instant in a time zone. */
export function localClock(now: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday };
}

/** Whether a reminder should fire now: right weekday, inside the send window, not yet sent today. */
export function isDue(
  r: { time: string; days: number[]; enabled: boolean; lastSentDate: string | null },
  clock: { day: string; minutes: number; weekday: number },
) {
  if (!r.enabled || r.lastSentDate === clock.day) return false;
  if (r.days.length && !r.days.includes(clock.weekday)) return false;
  const at = toMinutes(r.time);
  return clock.minutes >= at && clock.minutes < at + SEND_WINDOW_MIN;
}
