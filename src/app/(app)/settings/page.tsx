import { and, asc, count, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/module/page-header";
import { InstallCard, NotificationsCard } from "@/components/settings/notifications-card";
import { RemindersCard } from "@/components/settings/reminders-card";
import { db } from "@/db";
import { habits, pushSubscriptions, reminders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [rows, habitRows, [{ devices }]] = await Promise.all([
    db.select().from(reminders).where(eq(reminders.userId, user.id)).orderBy(asc(reminders.time)),
    db.select({ id: habits.id, name: habits.name }).from(habits).where(and(eq(habits.userId, user.id), isNull(habits.archivedAt))).orderBy(asc(habits.position)),
    db.select({ devices: count() }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)),
  ]);

  return (
    <>
      <PageHeader title="Settings" description="Notifications, the installed app and reminders." />
      <div className="grid gap-4 md:grid-cols-2">
        <NotificationsCard deviceCount={devices} />
        <InstallCard />
      </div>
      <div className="mt-4">
        <RemindersCard
          timeZone={user.settings.timeZone ?? "your time zone"}
          habits={habitRows}
          reminders={rows.map((r) => ({ id: r.id, kind: r.kind, refId: r.refId, title: r.title, body: r.body, url: r.url, time: r.time, days: r.days, enabled: r.enabled }))}
        />
      </div>
    </>
  );
}
