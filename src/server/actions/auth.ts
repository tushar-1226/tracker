"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/auth/session";
import { hasAnyUser } from "@/server/queries/users";
import {
  type AuthFormState,
  loginSchema,
  signupSchema,
} from "@/lib/validators/auth";

const TRY_AGAIN = "Something went wrong on our side. Please try again in a moment.";

/** Postgres unique_violation, which drizzle may wrap in a DrizzleQueryError. */
const isUniqueViolation = (e: unknown) =>
  [e, (e as { cause?: unknown })?.cause].some((x) => (x as { code?: string } | undefined)?.code === "23505");

const typed = (formData: FormData) => ({
  name: typeof formData.get("name") === "string" ? (formData.get("name") as string) : undefined,
  email: typeof formData.get("email") === "string" ? (formData.get("email") as string) : undefined,
});

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = typed(formData);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };

  const { email, password } = parsed.data;
  try {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return { message: "Wrong email or password", values };
    }
    await createSession(user.id);
  } catch (e) {
    console.error("login failed:", e);
    return { message: TRY_AGAIN, values };
  }
  // redirect() works by throwing, so it must stay outside the try/catch.
  redirect("/");
}

/** Track is a personal app: signup is only allowed to create the first (owner) account. */
export async function signup(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = typed(formData);
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };

  const { name, email, password } = parsed.data;
  try {
    if (await hasAnyUser()) return { message: "An account already exists. Log in instead.", values };
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: await bcrypt.hash(password, 12) })
      .returning({ id: users.id });
    await createSession(user.id);
  } catch (e) {
    if (isUniqueViolation(e)) return { message: "An account with this email already exists. Log in instead.", values };
    console.error("signup failed:", e);
    return { message: TRY_AGAIN, values };
  }
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
