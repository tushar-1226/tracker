export type ModuleKey = "habits" | "fitness" | "learning" | "reading" | "mind" | "money";

export const MODULES: { key: ModuleKey; label: string; href: string; sources: string[] }[] = [
  { key: "habits", label: "Habits", href: "/habits", sources: ["habit", "habit-day"] },
  { key: "fitness", label: "Fitness", href: "/gym", sources: ["workout", "workout-pr"] },
  { key: "learning", label: "Learning", href: "/learning", sources: ["study"] },
  { key: "reading", label: "Reading", href: "/books", sources: ["book"] },
  { key: "mind", label: "Mind", href: "/journal", sources: ["journal"] },
  { key: "money", label: "Money", href: "/budget", sources: ["budget-day", "budget-month"] },
];

const BY_SOURCE = new Map(MODULES.flatMap((m) => m.sources.map((s) => [s, m.key] as const)));

/** Which module an XP source belongs to; achievements and goals count only toward the overall level. */
export const moduleOf = (source: string): ModuleKey | null => BY_SOURCE.get(source) ?? null;

export const SOURCE_LABEL: Record<string, string> = {
  habit: "Habit done",
  "habit-day": "Perfect day",
  workout: "Workout",
  "workout-pr": "Personal record",
  study: "Study session",
  book: "Finished a book",
  journal: "Journal entry",
  "budget-day": "Under daily budget",
  "budget-month": "Monthly budget hit",
  achievement: "Achievement",
  goal: "Goal reached",
};
