import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { resources, skills, studySessions, tils } from "@/db/schema";

export async function listSkills(userId: string) {
  return db
    .select()
    .from(skills)
    .where(and(eq(skills.userId, userId), isNull(skills.archivedAt)))
    .orderBy(asc(skills.position), asc(skills.createdAt));
}

export async function listSessions(userId: string) {
  return db
    .select({
      id: studySessions.id,
      skillId: studySessions.skillId,
      date: studySessions.date,
      minutes: studySessions.minutes,
      summary: studySessions.summary,
    })
    .from(studySessions)
    .where(eq(studySessions.userId, userId))
    .orderBy(desc(studySessions.date), desc(studySessions.createdAt));
}

export async function listTils(userId: string, limit = 30) {
  return db
    .select({ id: tils.id, text: tils.text, date: tils.date, skillId: tils.skillId })
    .from(tils)
    .where(eq(tils.userId, userId))
    .orderBy(desc(tils.date), desc(tils.createdAt))
    .limit(limit);
}

export async function listResources(userId: string) {
  return db
    .select({ id: resources.id, title: resources.title, url: resources.url, kind: resources.kind, status: resources.status, skillId: resources.skillId })
    .from(resources)
    .where(eq(resources.userId, userId))
    .orderBy(asc(resources.status), desc(resources.createdAt));
}
