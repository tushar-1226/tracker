// Applies drizzle/ migrations. Used by `pnpm db:migrate` and the Vercel build (`vercel-build`).
// Prefers the direct (unpooled) connection Neon provides, since migrations shouldn't go through a pooler.
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const NAMES = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DATABASE_URL", "POSTGRES_URL"];
const name = NAMES.find((n) => process.env[n]);
if (!name) {
  console.error(`Migration failed: no database URL. Set one of ${NAMES.join(", ")} (on Vercel: Storage → Neon → connect to this project, for the Production environment too).`);
  process.exit(1);
}
const url = process.env[name];
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error(`Migration failed: ${name} is not a postgres:// URL (it starts with "${url.split(":")[0]}:"). Remove the old Turso/SQLite value and use the Postgres one.`);
  process.exit(1);
}

let host = "?";
try {
  host = new URL(url).host;
} catch {
  console.error(`Migration failed: ${name} is not a valid URL.`);
  process.exit(1);
}
console.log(`Migrating ${host} (from ${name})…`);

const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15_000 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
} catch (e) {
  const parts = e instanceof AggregateError ? e.errors : [e];
  console.error(`Migration failed on ${host}:`);
  for (const p of [e, ...parts, e?.cause]) if (p?.message) console.error(` - ${p.code ?? ""} ${p.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
