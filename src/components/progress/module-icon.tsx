import { BookOpen, Dumbbell, GraduationCap, ListChecks, type LucideIcon, NotebookPen, PiggyBank, Sparkles } from "lucide-react";
import type { ModuleKey } from "@/lib/progress/modules";

export const MODULE_ICON: Record<ModuleKey | "meta", LucideIcon> = {
  habits: ListChecks,
  fitness: Dumbbell,
  learning: GraduationCap,
  reading: BookOpen,
  mind: NotebookPen,
  money: PiggyBank,
  meta: Sparkles,
};
