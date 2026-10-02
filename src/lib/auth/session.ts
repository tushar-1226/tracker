import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_MS, encrypt } from "./jwt";

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  const token = await encrypt({ userId });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
