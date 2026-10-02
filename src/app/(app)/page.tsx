import { BookOpen, Dumbbell, Flame, GraduationCap, ListChecks, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Ring } from "@/components/charts/ring";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Greeting } from "@/components/module/greeting";
import { StatCard } from "@/components/module/stat-card";
import { XpBar } from "@/components/module/xp-bar";
import { Card, CardLabel } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/dal";
import { levelFromXp } from "@/lib/progress/levels";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const { level, current, needed, progress } = levelFromXp(user.xp);
  // Real values arrive with each module (Phase 1+).
  const lifeScore = 0;

  return (
    <>
      <Reveal className="mb-10">
        <Greeting name={user.name} />
      </Reveal>

      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StaggerItem>
          <Card className="flex h-full flex-col items-center justify-center gap-4 py-8">
            <Ring value={lifeScore / 100}>
              <NumberTicker value={lifeScore} className="tabular text-5xl font-medium" />
              <span className="text-xs text-muted">/ 100</span>
            </Ring>
            <CardLabel>Life score today</CardLabel>
          </Card>
        </StaggerItem>

        <StaggerItem className="md:col-span-2">
          <Card className="flex h-full flex-col justify-between gap-10">
            <div className="flex items-start justify-between">
              <div>
                <CardLabel>Level</CardLabel>
                <p className="tabular mt-2 text-7xl font-medium md:text-8xl">
                  <NumberTicker value={level} />
                </p>
              </div>
              <div className="text-right">
                <CardLabel>Total XP</CardLabel>
                <NumberTicker value={user.xp} className="tabular mt-2 block text-2xl" />
              </div>
            </div>
            <div className="space-y-2">
              <XpBar value={progress} />
              <div className="flex justify-between text-xs text-muted">
                <span className="tabular">
                  {current} / {needed} XP
                </span>
                <span>Level {level + 1}</span>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <StatCard href="/habits" icon={ListChecks} label="Habits" value={0} unit="of 0 done" hint="Add your first habit" />
        </StaggerItem>
        <StaggerItem>
          <StatCard href="/money" icon={Wallet} label="Spent today" value={0} prefix="₹" hint="No transactions yet" />
        </StaggerItem>
        <StaggerItem>
          <StatCard href="/habits" icon={Flame} label="Best streak" value={0} unit="days" hint="Start one today" />
        </StaggerItem>
        <StaggerItem>
          <StatCard href="/gym" icon={Dumbbell} label="Workouts" value={0} unit="this week" hint="Log your first session" />
        </StaggerItem>
        <StaggerItem>
          <StatCard href="/learning" icon={GraduationCap} label="Learning" value={0} unit="min" hint="Today's study time" />
        </StaggerItem>
        <StaggerItem>
          <StatCard href="/books" icon={BookOpen} label="Reading" value={0} unit="pages" hint="Pages read today" />
        </StaggerItem>
      </Stagger>
    </>
  );
}
