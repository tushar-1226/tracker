import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import * as schema from "./schema";

// Postgres returns bigint (sum/count) and numeric as strings; every one of ours fits a JS number.
types.setTypeParser(types.builtins.INT8, Number);
types.setTypeParser(types.builtins.NUMERIC, Number);

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — see .env.example (a postgres:// URL, e.g. from Neon).");
  // Serverless functions each hold their own pool, so keep it small.
  const pool = new Pool({ connectionString: url, max: process.env.VERCEL ? 3 : 10, idleTimeoutMillis: 10_000 });
  return drizzle(pool, { schema });
}

type Db = ReturnType<typeof connect>;
// Survives dev-server hot reloads so each reload doesn't leak a pool.
const globalForDb = globalThis as unknown as { __trackDb?: Db };

/** Connects on first use, so `next build` never needs a database. */
export const db = new Proxy({} as Db, {
  get(_, prop) {
    globalForDb.__trackDb ??= connect();
    const instance = globalForDb.__trackDb;
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
