import "server-only";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function hasAnyUser() {
  const [row] = await db.select({ n: count() }).from(users);
  return row.n > 0;
}
