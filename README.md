# track.

A minimal black & white tracker for habits, money, gym, learning, books, notes and life.
See [PLAN.md](PLAN.md) for the full roadmap.

## Setup

```bash
pnpm install
cp .env.example .env.local      # then set SESSION_SECRET (openssl rand -base64 32)
pnpm db:migrate                 # creates local.db
pnpm dev
```

Open http://localhost:3000 — the first visit creates your (single, private) account.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` / `pnpm lint` | Type and lint checks |
| `pnpm db:generate` | Generate a migration after editing `src/db/schema` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Browse the database |

## Stack

Next.js 16 (App Router) · Tailwind v4 · Drizzle + libSQL/SQLite (Turso in production) ·
jose sessions · Motion · Lenis · cmdk · next-themes.
