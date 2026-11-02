import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Runs the real migration and the real queries on an in-process Postgres (PGlite),
// so dialect problems show up in CI instead of on the first deploy.
const state = vi.hoisted(() => ({ db: undefined as unknown, userId: "" }));

vi.mock("@/db", () => ({ db: new Proxy({}, { get: (_, p) => (state.db as Record<string | symbol, unknown>)[p] }) }));
vi.mock("@/lib/auth/dal", () => ({
  getCurrentUser: async () => (state.db as typeof pg).query.users.findFirst({ where: (u, { eq }) => eq(u.id, state.userId) }),
  verifySession: async () => ({ userId: state.userId }),
}));
vi.mock("@/server/today", () => ({
  getTimeZone: async () => "UTC",
  getToday: async () => "2026-11-02",
  requestTime: () => Date.now(),
}));

const pg = drizzle(new PGlite(), { schema });

describe("postgres", () => {
  beforeAll(async () => {
    state.db = pg;
    await migrate(pg, { migrationsFolder: "./drizzle" });
    const [u] = await pg.insert(schema.users).values({ name: "T", email: "t@example.com", passwordHash: "x" }).returning();
    state.userId = u.id;
  });

  it("applies the migration with working defaults", async () => {
    const u = await pg.query.users.findFirst();
    expect(u?.settings).toEqual({});
    expect(u?.createdAt).toBeInstanceOf(Date);
    expect(await pg.query.users.findFirst().then(() => true)).toBe(true);
  });

  it("runs the money queries and aggregates", async () => {
    const m = await import("@/server/queries/money");
    await m.ensureMoneySetup(state.userId);
    const accounts = await m.listAccounts(state.userId);
    const categories = await m.listCategories(state.userId);
    expect(accounts.length).toBeGreaterThan(0);
    const expense = categories.find((c) => c.kind === "expense")!;
    const accountId = accounts[0].id;
    await pg.insert(schema.transactions).values([
      { userId: state.userId, type: "expense", amount: 250_00, accountId, categoryId: expense.id, date: "2026-11-01", note: "Chai Tea" },
      { userId: state.userId, type: "expense", amount: 100_00, accountId, categoryId: expense.id, date: "2026-11-02" },
      { userId: state.userId, type: "income", amount: 5_000_00, accountId, date: "2026-10-30" },
    ]);

    const monthly = await m.monthlyTotals(state.userId, "2026-10", "2026-11");
    expect(JSON.stringify(monthly)).toContain("35000");
    expect(await m.categorySpend(state.userId, "2026-11")).toEqual([{ categoryId: expense.id, total: 350_00 }]);
    expect(await m.dailyExpenses(state.userId, "2026-11")).toHaveLength(2);
    expect(await m.spentOn(state.userId, "2026-11-01")).toBe(250_00);
    await m.netWorthSeries(state.userId, 0, "2026-10", "2026-11");
    // case-insensitive search, like SQLite's
    expect(await m.listTransactions(state.userId, { q: "chai" })).toHaveLength(1);

    const { getPeriodSummary } = await import("@/server/summary");
    const s = await getPeriodSummary(state.userId, "2026-11-01", "2026-11-30");
    expect(JSON.stringify(s)).toContain("35000");
  });

  it("runs the gym, notes, books and learning queries", async () => {
    const gym = await import("@/server/queries/gym");
    await gym.ensureGymSetup(state.userId);
    expect((await gym.listExercises(state.userId)).length).toBeGreaterThan(10);
    await gym.listTemplates(state.userId);
    await gym.listDatedSets(state.userId);
    await pg.insert(schema.notes).values({ userId: state.userId, title: "Groceries", text: "Milk and EGGS", tags: ["home"] });
    const { listNotes } = await import("@/server/queries/notes");
    expect(await listNotes(state.userId, { q: "eggs" })).toHaveLength(1);
    const { listBooks } = await import("@/server/queries/books");
    await listBooks(state.userId);
    const { listSessions, listSkills } = await import("@/server/queries/learning");
    await listSkills(state.userId);
    await listSessions(state.userId);
  });

  it("grants and revokes XP idempotently", async () => {
    const { grantXp, revokeXp } = await import("@/server/xp");
    const xp = async () => (await pg.query.users.findFirst({ where: (u, { eq }) => eq(u.id, state.userId) }))!.xp;
    const before = await xp();
    await db.transaction(async (tx) => {
      await grantXp(tx, state.userId, "test", "k", 40);
      await grantXp(tx, state.userId, "test", "k", 40);
    });
    expect(await xp()).toBe(before + 40);
    await db.transaction((tx) => revokeXp(tx, state.userId, "test", "k"));
    expect(await xp()).toBe(before);
    await db.transaction((tx) => revokeXp(tx, state.userId, "test", "missing").then(() => revokeXp(tx, state.userId, "test", "k")));
    expect(await xp()).toBe(before);
  });

  it("builds the progress snapshot", async () => {
    const { getProgress } = await import("@/server/progress");
    const snapshot = await getProgress();
    expect(snapshot.user.id).toBe(state.userId);
  });

  it("exports and re-imports every table", async () => {
    const { exportUserData, importUserData } = await import("@/server/data-transfer");
    const first = JSON.parse(JSON.stringify(await exportUserData(state.userId)));
    expect(first.tables.transactions).toHaveLength(3);
    await importUserData(state.userId, first);
    const second = JSON.parse(JSON.stringify(await exportUserData(state.userId)));
    expect(second.tables).toEqual(first.tables);
  });
});
