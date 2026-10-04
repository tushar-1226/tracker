import "server-only";
import { eq, getTableColumns, getTableName } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import * as t from "@/db/schema";

/** Every per-user table, parents before children (insert order; deletes run in reverse). */
const TABLES = [
  t.categories,
  t.accounts,
  t.recurringRules,
  t.transactions,
  t.budgets,
  t.savingsGoals,
  t.goalContributions,
  t.habits,
  t.habitLogs,
  t.exercises,
  t.workouts,
  t.workoutSets,
  t.workoutTemplates,
  t.bodyMetrics,
  t.skills,
  t.studySessions,
  t.resources,
  t.tils,
  t.books,
  t.readingLogs,
  t.highlights,
  t.notes,
  t.journalEntries,
  t.goals,
  t.goalMilestones,
  t.achievementsUnlocked,
  t.reminders,
  t.xpEvents,
] as const satisfies (SQLiteTable & { userId: unknown })[];

export const EXPORT_VERSION = 1;

export type ExportFile = {
  app: "track";
  version: number;
  exportedAt: string;
  user: { name: string; settings: t.UserSettings; xp: number };
  tables: Record<string, Record<string, unknown>[]>;
};

export async function exportUserData(userId: string): Promise<ExportFile> {
  const user = await db.query.users.findFirst({ where: eq(t.users.id, userId) });
  if (!user) throw new Error("User not found");
  const tables: ExportFile["tables"] = {};
  for (const table of TABLES) {
    tables[getTableName(table)] = await db.select().from(table).where(eq(table.userId, userId));
  }
  return {
    app: "track",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    // Never export the password hash.
    user: { name: user.name, settings: { ...user.settings, timeZone: undefined }, xp: user.xp },
    tables,
  };
}

/** Converts JSON values back into what each column expects (timestamps were serialised as ISO strings). */
function revive(table: SQLiteTable, row: Record<string, unknown>, userId: string) {
  const out: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(getTableColumns(table))) {
    if (!(key in row)) continue;
    const v = row[key];
    out[key] = col.columnType === "SQLiteTimestamp" && typeof v === "string" ? new Date(v) : v;
  }
  out.userId = userId; // always import into the signed-in account
  return out;
}

/** Replaces all of the user's data with the contents of an export. */
export async function importUserData(userId: string, file: ExportFile) {
  if (file?.app !== "track" || typeof file.version !== "number" || file.version > EXPORT_VERSION || typeof file.tables !== "object") {
    throw new Error("This doesn’t look like a Track export.");
  }
  const counts: Record<string, number> = {};
  await db.transaction(async (tx) => {
    for (const table of [...TABLES].reverse()) await tx.delete(table).where(eq(table.userId, userId));
    for (const table of TABLES) {
      const name = getTableName(table);
      const rows = Array.isArray(file.tables[name]) ? file.tables[name] : [];
      counts[name] = rows.length;
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50).map((r) => revive(table, r, userId));
        if (chunk.length) await tx.insert(table).values(chunk as never);
      }
    }
    const current = await tx.query.users.findFirst({ where: eq(t.users.id, userId) });
    await tx
      .update(t.users)
      .set({
        xp: Math.max(0, Math.round(Number(file.user?.xp) || 0)),
        settings: { ...(file.user?.settings ?? {}), timeZone: current?.settings.timeZone },
      })
      .where(eq(t.users.id, userId));
  });
  return counts;
}
