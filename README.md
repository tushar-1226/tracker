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
jose sessions · Motion · Lenis · cmdk · next-themes · Swiss Ephemeris (`sweph`) for the horoscope.

## Horoscope

The Vedic horoscope uses the Swiss Ephemeris through the `sweph` native addon (built during `pnpm install`;
allowed in `pnpm-workspace.yaml`). The ephemeris files live in `/ephe` and are bundled with the server build.
The Swiss Ephemeris is licensed under the AGPL (or a commercial licence from Astrodienst).

## Mobile app & notifications

Track is an installable PWA built for phones and tablets.

- **Install:** open Settings → "Install the app". Android/desktop get an install button;
  on iPhone/iPad use Safari → Share → *Add to Home Screen* (needed for notifications on iOS 16.4+).
- **Notifications:** Settings → Notifications → *Turn on* (once per device), then add reminders
  there or on any habit's page. Reminders fire at your local time and are skipped when the
  thing is already done. Tapping one opens the right screen; habit reminders have a *Mark done* button on Android.

### Requirements

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in `.env.local`
  (generate with `npx web-push generate-vapid-keys`). Restart the server after changing them.
- **HTTPS.** Service workers and push only work on `https://` or `localhost`. To try it on your
  phone during development, expose the dev server through a tunnel, e.g.
  `npx cloudflared tunnel --url http://localhost:3000`, and open the https URL on the phone.

### Scheduling

- `next start` / `next dev` run the reminder scheduler in-process every minute (`src/instrumentation.ts`).
- On serverless hosts (e.g. Vercel), call `GET /api/cron/reminders` every minute with
  `Authorization: Bearer $CRON_SECRET` from any cron service. Set `DISABLE_REMINDER_SCHEDULER=1`
  to turn the in-process scheduler off.

## Deploying to Vercel

Track uses the native `sweph` addon for horoscope calculations. Set the Vercel
project's Node.js version to **24.x** (Project Settings → Build and Deployment →
Node.js Version). The `engines.node` entry in `package.json` also pins new
deployments to that runtime. Keep the function runtime on Node.js, not Edge.

1. Create a hosted libSQL database (e.g. [Turso](https://turso.tech)) and run
   `DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… pnpm db:migrate` once. A `file:` database does not work on Vercel.
2. In the Vercel project settings add `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SESSION_SECRET`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` and `DISABLE_REMINDER_SCHEDULER=1`.
3. Point an external cron service at `/api/cron/reminders` every minute (see *Scheduling*); Vercel's free cron runs at most once a day.
