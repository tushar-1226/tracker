"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { resources, skills, studySessions, tils } from "@/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { isDay } from "@/lib/dates";
import { studyXp } from "@/lib/growth";
import { getToday } from "@/server/today";
import { grantXp, revokeXp } from "@/server/xp";

type FormState = { ok?: boolean; errors?: Record<string, string[]>; message?: string } | undefined;
const fail = (e: z.ZodError): FormState => ({ errors: z.flattenError(e).fieldErrors as Record<string, string[]> });
const optional = z
  .string()
  .optional()
  .transform((v) => v?.trim() || null);

async function ownSkill(userId: string, id: string) {
  const s = await db.query.skills.findFirst({ where: and(eq(skills.id, id), eq(skills.userId, userId)) });
  if (!s) throw new Error("Skill not found");
  return s;
}

const skillSchema = z.object({
  name: z.string().trim().min(1, { error: "Name the skill" }).max(50),
  icon: z.string().trim().max(40).default("sparkles"),
  targetHours: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v > 0 && v <= 100_000), { error: "Enter hours" }),
});

export async function saveSkill(_s: FormState, fd: FormData): Promise<FormState> {
  const { userId } = await verifySession();
  const parsed = skillSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error);
  const id = fd.get("id");
  if (typeof id === "string" && id) {
    await ownSkill(userId, id);
    await db.update(skills).set(parsed.data).where(eq(skills.id, id));
  } else {
    await db.insert(skills).values({ ...parsed.data, userId });
  }
  refresh();
  return { ok: true };
}

export async function archiveSkill(id: string) {
  const { userId } = await verifySession();
  await ownSkill(userId, id);
  await db.update(skills).set({ archivedAt: new Date() }).where(eq(skills.id, id));
  refresh();
}

const sessionSchema = z.object({
  skillId: z.string().min(1, { error: "Pick a skill" }),
  minutes: z.coerce.number().int({ error: "Whole minutes" }).min(1, { error: "At least a minute" }).max(1440),
  date: z.string().refine(isDay, { error: "Pick a date" }),
  summary: optional.pipe(z.string().max(280).nullable()),
});

async function insertSession(userId: string, data: z.infer<typeof sessionSchema>) {
  await ownSkill(userId, data.skillId);
  await db.transaction(async (tx) => {
    const [row] = await tx.insert(studySessions).values({ ...data, userId }).returning({ id: studySessions.id });
    const xp = studyXp(data.minutes);
    if (xp > 0) await grantXp(tx, userId, "study", row.id, xp);
  });
}

export async function logSession(_s: FormState, fd: FormData): Promise<FormState> {
  const { userId } = await verifySession();
  const parsed = sessionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error);
  await insertSession(userId, parsed.data);
  refresh();
  return { ok: true };
}

/** Called by the focus timer when a session ends. */
export async function logFocusSession(skillId: string, minutes: number, summary: string) {
  const { userId } = await verifySession();
  const data = sessionSchema.parse({ skillId, minutes: Math.round(minutes), date: await getToday(), summary });
  await insertSession(userId, data);
  refresh();
}

export async function deleteSession(id: string) {
  const { userId } = await verifySession();
  await db.transaction(async (tx) => {
    await revokeXp(tx, userId, "study", id);
    await tx.delete(studySessions).where(and(eq(studySessions.id, id), eq(studySessions.userId, userId)));
  });
  refresh();
}

export async function addTil(text: string, skillId: string | null) {
  const { userId } = await verifySession();
  const clean = z.string().trim().min(1).max(500).parse(text);
  if (skillId) await ownSkill(userId, skillId);
  await db.insert(tils).values({ userId, text: clean, skillId, date: await getToday() });
  refresh();
}

export async function deleteTil(id: string) {
  const { userId } = await verifySession();
  await db.delete(tils).where(and(eq(tils.id, id), eq(tils.userId, userId)));
  refresh();
}

const resourceSchema = z.object({
  title: z.string().trim().min(1, { error: "Add a title" }).max(140),
  url: optional.pipe(z.url({ error: "Enter a full link (https://…)" }).nullable()),
  kind: z.enum(["course", "book", "video", "article", "other"]),
  skillId: optional,
});

export async function saveResource(_s: FormState, fd: FormData): Promise<FormState> {
  const { userId } = await verifySession();
  const parsed = resourceSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error);
  if (parsed.data.skillId) await ownSkill(userId, parsed.data.skillId);
  await db.insert(resources).values({ ...parsed.data, userId });
  refresh();
  return { ok: true };
}

export async function setResourceStatus(id: string, status: "todo" | "doing" | "done") {
  const { userId } = await verifySession();
  await db
    .update(resources)
    .set({ status: z.enum(["todo", "doing", "done"]).parse(status) })
    .where(and(eq(resources.id, id), eq(resources.userId, userId)));
  refresh();
}

export async function deleteResource(id: string) {
  const { userId } = await verifySession();
  await db.delete(resources).where(and(eq(resources.id, id), eq(resources.userId, userId)));
  refresh();
}
