import type { ModuleKey } from "./modules";

export type AchievementMetrics = {
  habitChecks: number;
  bestHabitStreak: number;
  perfectDays: number;
  workouts: number;
  prs: number;
  benchE1rmKg: number;
  studyHours: number;
  skillsOver10h: number;
  tils: number;
  booksFinished: number;
  pagesRead: number;
  monthsSaved: number;
  budgetMonths: number;
  journalEntries: number;
  journalStreak: number;
  level: number;
  daysActive: number;
};

export type Achievement = {
  key: string;
  module: ModuleKey | "meta";
  /** One name per tier, or one name for all. */
  title: string | [string, string, string];
  describe: (threshold: number) => string;
  metric: keyof AchievementMetrics;
  thresholds: number[];
};

export const TIER_NAMES = ["Bronze", "Silver", "Gold"] as const;
export const TIER_XP = [25, 50, 100] as const;

export const ACHIEVEMENTS: Achievement[] = [
  { key: "habit-checks", module: "habits", title: ["First Step", "Regular", "Creature of Habit"], describe: (n) => `Check off habits ${n} time${n === 1 ? "" : "s"}`, metric: "habitChecks", thresholds: [1, 100, 1000] },
  { key: "habit-streak", module: "habits", title: ["Week Warrior", "Monthly Momentum", "Unbreakable"], describe: (n) => `Reach a ${n}-day habit streak`, metric: "bestHabitStreak", thresholds: [7, 30, 100] },
  { key: "perfect-days", module: "habits", title: "Perfect Days", describe: (n) => `Finish every habit on ${n} day${n === 1 ? "" : "s"}`, metric: "perfectDays", thresholds: [1, 10, 50] },
  { key: "workouts", module: "fitness", title: ["First Rep", "Gym Regular", "Iron Year"], describe: (n) => `Finish ${n} workout${n === 1 ? "" : "s"}`, metric: "workouts", thresholds: [1, 50, 150] },
  { key: "prs", module: "fitness", title: "PR Hunter", describe: (n) => `Set ${n} personal record${n === 1 ? "" : "s"}`, metric: "prs", thresholds: [1, 10, 50] },
  { key: "bench", module: "fitness", title: ["Plate Club", "Century", "Heavy Hitter"], describe: (n) => `Bench press an estimated ${n} kg 1-rep max`, metric: "benchE1rmKg", thresholds: [60, 100, 140] },
  { key: "study-hours", module: "learning", title: ["First Hour", "Ten Hours In", "Centurion"], describe: (n) => `Study for ${n} hour${n === 1 ? "" : "s"}`, metric: "studyHours", thresholds: [1, 10, 100] },
  { key: "polymath", module: "learning", title: "Polymath", describe: (n) => `Put 10+ hours into ${n} skills`, metric: "skillsOver10h", thresholds: [2, 3, 5] },
  { key: "tils", module: "learning", title: "Curious Mind", describe: (n) => `Write ${n} “today I learned” notes`, metric: "tils", thresholds: [10, 50, 200] },
  { key: "books", module: "reading", title: ["Bookworm", "A Book a Month", "Library"], describe: (n) => `Finish ${n} book${n === 1 ? "" : "s"}`, metric: "booksFinished", thresholds: [1, 12, 50] },
  { key: "pages", module: "reading", title: "Page Turner", describe: (n) => `Read ${n.toLocaleString("en-IN")} pages`, metric: "pagesRead", thresholds: [1000, 10000, 50000] },
  { key: "saver", module: "money", title: ["In the Green", "Half-Year Saver", "Year of Saving"], describe: (n) => `Save money in ${n} month${n === 1 ? "" : "s"}`, metric: "monthsSaved", thresholds: [1, 6, 12] },
  { key: "budget", module: "money", title: "Budget Master", describe: (n) => `Stay within budget for ${n} month${n === 1 ? "" : "s"}`, metric: "budgetMonths", thresholds: [1, 3, 12] },
  { key: "journal", module: "mind", title: ["Dear Diary", "Reflective", "Year in Words"], describe: (n) => `Write ${n} journal entries`, metric: "journalEntries", thresholds: [7, 30, 365] },
  { key: "journal-streak", module: "mind", title: "Daily Pages", describe: (n) => `Journal ${n} days in a row`, metric: "journalStreak", thresholds: [7, 30, 100] },
  { key: "level", module: "meta", title: ["Rising", "Seasoned", "Legend"], describe: (n) => `Reach level ${n}`, metric: "level", thresholds: [5, 10, 25] },
  { key: "days-active", module: "meta", title: ["Showing Up", "Committed", "365"], describe: (n) => `Log something on ${n} different days`, metric: "daysActive", thresholds: [7, 30, 365] },
];

export const titleFor = (a: Achievement, tier: number) => (Array.isArray(a.title) ? a.title[tier] : a.title);

/** Tiers reached (0 = none, 1 = bronze … 3 = gold). */
export function tiersReached(a: Achievement, m: AchievementMetrics) {
  return a.thresholds.filter((t) => m[a.metric] >= t).length;
}
