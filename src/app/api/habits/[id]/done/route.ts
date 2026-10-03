import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { habits, users } from "@/db/schema";
import { SESSION_COOKIE, decrypt } from "@/lib/auth/jwt";
import { isValidTimeZone, todayIn } from "@/lib/dates";
import { applyHabitValue } from "@/server/habit-core";

/** "Mark done" from a notification action. Uses the session cookie the service worker sends. */
export async function POST(_req: Request, ctx: RouteContext<"/api/habits/[id]/done">) {
  const session = await decrypt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session?.userId) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const habit = await db.query.habits.findFirst({ where: and(eq(habits.id, id), eq(habits.userId, session.userId)) });
  if (!habit || habit.type === "quit") return new Response("Not found", { status: 404 });
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId), columns: { settings: true } });
  const tz = user?.settings.timeZone;
  const today = todayIn(tz && isValidTimeZone(tz) ? tz : "UTC");

  await applyHabitValue(session.userId, habit, today, Math.max(1, habit.target));
  return Response.json({ ok: true, name: habit.name });
}
