import {
  Apple,
  Bed,
  Bike,
  BookOpen,
  Brain,
  CigaretteOff,
  Circle,
  Code,
  Coffee,
  Droplet,
  Dumbbell,
  Footprints,
  Heart,
  Leaf,
  type LucideIcon,
  Moon,
  Music,
  PenLine,
  Pill,
  SmartphoneNfc,
  Sparkles,
  Sun,
  Timer,
  WineOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const HABIT_ICONS: Record<string, LucideIcon> = {
  circle: Circle,
  droplet: Droplet,
  dumbbell: Dumbbell,
  footprints: Footprints,
  bike: Bike,
  "book-open": BookOpen,
  brain: Brain,
  "pen-line": PenLine,
  code: Code,
  music: Music,
  sun: Sun,
  moon: Moon,
  bed: Bed,
  apple: Apple,
  leaf: Leaf,
  pill: Pill,
  coffee: Coffee,
  heart: Heart,
  timer: Timer,
  sparkles: Sparkles,
  "cigarette-off": CigaretteOff,
  "wine-off": WineOff,
  phone: SmartphoneNfc,
};

export function HabitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = HABIT_ICONS[name] ?? Circle;
  return <Icon className={cn("size-4", className)} />;
}
