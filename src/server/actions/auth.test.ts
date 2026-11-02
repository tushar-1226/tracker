import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const state = vi.hoisted(() => ({ db: undefined as unknown, sessions: [] as string[] }));
vi.mock("@/db", () => ({ db: new Proxy({}, { get: (_, p) => (state.db as Record<string | symbol, unknown>)[p] }) }));
vi.mock("@/lib/auth/session", () => ({
  createSession: async (id: string) => void state.sessions.push(id),
  deleteSession: async () => {},
}));

const pg = drizzle(new PGlite(), { schema });
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
/** redirect() throws; the thrown error carries the destination. */
const redirectedTo = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return String((e as { digest?: string }).digest ?? e);
  }
  return null;
};

describe("auth actions", () => {
  beforeAll(async () => {
    state.db = pg;
    await migrate(pg, { migrationsFolder: "./drizzle" });
  });

  it("keeps what was typed (but not the password) when validation fails", async () => {
    const { signup } = await import("./auth");
    const r = await signup(undefined, form({ name: "Asha", email: "asha@example.com", password: "short" }));
    expect(r?.errors?.password).toBeTruthy();
    expect(r?.values).toEqual({ name: "Asha", email: "asha@example.com" });
    expect(JSON.stringify(r)).not.toContain("short");
  });

  it("creates the first account, signs in and redirects", async () => {
    const { signup } = await import("./auth");
    const to = await redirectedTo(signup(undefined, form({ name: "Asha", email: " Asha@Example.com ", password: "correct horse" })));
    expect(to).toContain("NEXT_REDIRECT");
    expect(to).toContain("/");
    expect(state.sessions).toHaveLength(1);
    const [u] = await pg.select().from(schema.users);
    expect(u.email).toBe("asha@example.com");
    expect(u.passwordHash).not.toContain("correct horse");
  });

  it("refuses a second account", async () => {
    const { signup } = await import("./auth");
    const r = await signup(undefined, form({ name: "B", email: "b@example.com", password: "another pass" }));
    expect(r?.message).toMatch(/already exists/);
  });

  it("logs in regardless of email case, and rejects a wrong password", async () => {
    const { login } = await import("./auth");
    const before = state.sessions.length;
    expect(await redirectedTo(login(undefined, form({ email: "ASHA@example.com", password: "correct horse" })))).toContain("NEXT_REDIRECT");
    expect(state.sessions).toHaveLength(before + 1);
    const bad = await login(undefined, form({ email: "asha@example.com", password: "nope" }));
    expect(bad?.message).toBe("Wrong email or password");
    expect(bad?.values?.email).toBe("asha@example.com");
    expect(state.sessions).toHaveLength(before + 1);
  });

  it("shows a friendly message instead of crashing when the database fails", async () => {
    const { login } = await import("./auth");
    const real = state.db;
    state.db = new Proxy({}, { get: () => { throw new Error("connection refused"); } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await login(undefined, form({ email: "asha@example.com", password: "correct horse" }));
    state.db = real;
    spy.mockRestore();
    expect(r?.message).toMatch(/Something went wrong/);
  });
});
