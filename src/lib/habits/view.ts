import type { Day } from "@/lib/dates";
import type { Frequency, HabitLike, HabitType, LogMap } from "./stats";

/** Serializable habit shape passed from server to client components. */
export type HabitView = {
  id: string;
  name: string;
  icon: string;
  type: HabitType;
  target: number;
  unit: string | null;
  frequency: Frequency;
  startDate: Day;
  logs: Record<Day, number>;
};

export const logMap = (h: Pick<HabitView, "logs">): LogMap => new Map(Object.entries(h.logs));

export const asHabitLike = (h: HabitView): HabitLike => h;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function frequencyLabel(f: Frequency) {
  if (f.kind === "daily") return "Every day";
  if (f.kind === "weekly") return `${f.times}× a week`;
  const days = [...f.days].sort();
  if (days.join() === "1,2,3,4,5") return "Weekdays";
  if (days.join() === "0,6") return "Weekends";
  // Monday-first order reads more naturally.
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_NAMES[d]).join(", ");
}

export function targetLabel(h: Pick<HabitView, "type" | "target" | "unit">) {
  if (h.type === "check") return null;
  if (h.type === "quit") return "Stay clean";
  return `${h.target} ${h.unit ?? (h.type === "duration" ? "min" : "")}`.trim();
}

/** "1 day", "3 days", "1 week"… */
export function unitLabel(n: number, unit: string) {
  return n === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

export const HABIT_TYPE_LABEL: Record<HabitType, string> = {
  check: "Yes / No",
  count: "Count",
  duration: "Duration",
  quit: "Quit",
};
