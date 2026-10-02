import {
  BookOpen,
  Dumbbell,
  Flag,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  NotebookPen,
  PiggyBank,
  Settings,
  StickyNote,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  phase: number;
};

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Today",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutGrid, description: "Your day at a glance", phase: 1 },
      { href: "/habits", label: "Habits", icon: ListChecks, description: "Build streaks, one day at a time", phase: 1 },
      { href: "/journal", label: "Journal", icon: NotebookPen, description: "Mood, sleep and reflections", phase: 4 },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/money", label: "Money", icon: Wallet, description: "Accounts, transactions and net worth", phase: 2 },
      { href: "/budget", label: "Budget", icon: PiggyBank, description: "Monthly limits and savings goals", phase: 2 },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/gym", label: "Gym", icon: Dumbbell, description: "Workouts, PRs and body progress", phase: 3 },
      { href: "/learning", label: "Learning", icon: GraduationCap, description: "Skills, study hours and TILs", phase: 4 },
      { href: "/books", label: "Books", icon: BookOpen, description: "Your library and reading goal", phase: 4 },
      { href: "/notes", label: "Notes", icon: StickyNote, description: "Ideas worth keeping", phase: 4 },
    ],
  },
  {
    title: "Progress",
    items: [
      { href: "/goals", label: "Goals", icon: Flag, description: "Long-term goals and milestones", phase: 5 },
      { href: "/progress", label: "Progress", icon: Trophy, description: "Levels, XP and achievements", phase: 5 },
      { href: "/settings", label: "Settings", icon: Settings, description: "Preferences and data", phase: 6 },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
