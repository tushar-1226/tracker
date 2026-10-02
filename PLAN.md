# Track — Personal Life Tracker

A minimal, black & white, animation-rich personal dashboard for tracking daily life:
habits, budget & money, gym, learning, books, notes, journal — with a progress
engine (streaks, XP, levels, achievements) that shows *real* progress over time.

---

## 1. Goals

- **One place for daily life** — log anything in under 10 seconds.
- **Show real progress** — trends, streaks, personal records, achievements, not just checkboxes.
- **Beautiful & calm** — strictly monochrome, light/dark, smooth scroll, custom cursor, subtle motion.
- **Fast & private** — your data in your own database; works great on desktop and phone.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router)**, TypeScript, React Server Components | Server Actions for mutations, fast pages |
| Package manager | **pnpm** | Already installed (v11) |
| Styling | **Tailwind CSS v4** + CSS variables | Token-based B&W theme |
| Components | **shadcn/ui** (restyled monochrome) + Radix primitives | Accessible dialogs, popovers, menus |
| Theme | **next-themes** | Light / dark / system, no flash |
| Smooth scroll | **Lenis** (`lenis/react`) | Buttery scroll |
| Animation | **Motion** (`motion/react`, formerly Framer Motion) | Page transitions, layout animations, number tickers |
| Cursor | Custom cursor component (Motion springs) | Dot + ring, magnetic buttons, hover states |
| Database | **SQLite via libSQL** locally → **Turso** in production | Zero-setup locally, free hosted tier |
| ORM | **Drizzle ORM** + drizzle-kit migrations | Type-safe, lightweight |
| Auth | **jose** session cookie + bcrypt, following the Next.js 16 auth guide (single owner account) | Keeps your data private, no extra dependency |
| Validation | **Zod** + **react-hook-form** | Shared schemas client/server |
| Charts | **Recharts** (styled monochrome) + custom SVG heatmaps | Trends, rings, contribution graphs |
| Dates | **date-fns** | Streak math, week/month ranges |
| Rich notes | **Tiptap** (markdown-ish editor) | Notes & journal |
| Command palette | **cmdk** | `⌘K` quick-log anything |
| State (client) | **Zustand** (only for UI state: cursor, palette, quick-add) | Server is source of truth |
| Testing | **Vitest** (logic) + **Playwright** (flows) | Streak/XP math must be correct |
| Deploy | **Vercel** + Turso | Free, simple |

---

## 3. Design System (B&W Minimal)

### Colors — only grayscale
```css
:root {            /* light */
  --bg: #ffffff;  --surface: #f6f6f6;  --border: #e5e5e5;
  --muted: #8a8a8a;  --fg: #0a0a0a;  --accent: #000000;
}
.dark {
  --bg: #0a0a0a;  --surface: #131313;  --border: #262626;
  --muted: #7a7a7a;  --fg: #fafafa;  --accent: #ffffff;
}
```
- Data emphasis uses **opacity & pattern**, never color (e.g. heatmap = 5 gray steps; budget overspend = solid fill vs outline; negative money = strikethrough/parentheses).
- Theme toggle animates with a circular **View Transitions API** reveal from the click point.

### Typography
- **Geist Sans** for UI, **Geist Mono** for numbers/stats (tabular figures).
- Big, confident numbers on dashboards (e.g. `48px` mono for streaks / net worth).
- Scale: 12 / 14 / 16 / 20 / 28 / 40 / 64.

### Layout
- Left rail sidebar (icons + labels, collapsible) on desktop; bottom tab bar on mobile.
- Generous whitespace, 1px borders, `rounded-2xl` cards, no shadows (or a single very soft one in light mode).
- Bento-grid dashboard.

### Motion principles
- **Lenis** smooth scroll globally (disabled inside scrollable modals / editor).
- Page transitions: fade + 8px slide-up, 250ms, `ease-[0.22,1,0.36,1]`.
- Lists: staggered reveal on enter (30ms stagger).
- Numbers: count-up tickers when stats come into view.
- Habit check: satisfying scale + stroke-draw checkmark.
- Achievement unlock: full-screen minimal toast with a drawn badge outline.
- Respect `prefers-reduced-motion` → disable Lenis, cursor, and large transitions.

### Custom cursor
- Small solid dot (6px) + trailing ring (32px) using spring physics, `mix-blend-mode: difference` so it auto-inverts on B&W.
- States: grows on links/buttons, shows text label on cards ("Open", "Log"), I-beam on inputs, hidden on touch devices.
- **Magnetic** effect on primary buttons and the quick-add FAB.

---

## 4. Modules (Features)

### 4.1 Dashboard (`/`)
- Greeting + date + **Life Score** (0–100, today) and current **Level/XP bar**.
- Today's habits (one-tap check), today's spend vs daily budget, workout today?, reading progress, learning minutes.
- Weekly overview chart, active streaks, recent achievements, "On this day" journal memory.
- Quick-add (`⌘K` or `+` FAB): log expense, habit, workout, note, book pages, study session.

### 4.2 Habits (`/habits`)
- Habit types: **boolean** (did it), **count** (8 glasses water), **duration** (30 min meditation), **negative/quit** (no sugar — counts days clean).
- Frequency: daily, specific weekdays, X times per week.
- GitHub-style **contribution heatmap** per habit + combined.
- Current streak, best streak, completion rate (7d/30d/all), "streak freeze" tokens earned by consistency.
- Reorder via drag-and-drop, archive habits.

### 4.3 Money (`/money`) — accounts & net worth
- Accounts: cash, bank, card, savings, investments, loans.
- Transactions: income / expense / transfer, category, tags, note, date.
- Recurring transactions (salary, rent, subscriptions) auto-generated.
- **Net worth over time** chart, monthly income vs expense, savings rate.
- Subscriptions view (what you pay monthly/yearly).
- Currency setting (₹ default, configurable).

### 4.4 Budget (`/budget`)
- Monthly budget per category with progress bars (outline → filled → hatched when over).
- Daily safe-to-spend number = (remaining budget ÷ days left).
- Savings goals (e.g. "New laptop ₹80k") with progress and ETA based on your saving pace.
- Month-over-month comparison.

### 4.5 Gym / Fitness (`/gym`)
- Exercise library (name, muscle group, type: strength/cardio/bodyweight).
- **Workout logger**: sets × reps × weight, rest timer, notes; templates (Push / Pull / Legs).
- **Personal records** auto-detected (heaviest, most reps, estimated 1RM via Epley).
- Progress charts per exercise (est. 1RM over time), weekly volume per muscle group.
- Body metrics: weight, body fat %, measurements; progress photos (optional, stored privately).
- Workout heatmap & weekly frequency.

### 4.6 Learning (`/learning`)
- Topics/skills (e.g. "Rust", "System Design", "Guitar") with target hours.
- Log study sessions (duration, what you learned, resource link) — includes a **focus timer** (Pomodoro).
- Resources list (courses, videos, articles) with status.
- "TIL" (Today I Learned) quick entries.
- Hours per skill chart, learning streak, skill level milestones (10h, 50h, 100h…).

### 4.7 Books (`/books`)
- Library: want to read / reading / finished / abandoned.
- Search & auto-fill metadata from **Open Library API** (title, author, cover — covers rendered grayscale).
- Log pages read per day → reading speed, ETA to finish.
- Rating, review, highlights & quotes.
- Yearly reading goal (e.g. 24 books) with pace indicator.

### 4.8 Notes (`/notes`)
- Tiptap editor, markdown shortcuts, tags, pin, search (full-text).
- Link notes to anything (a book, a skill, a workout).

### 4.9 Journal / Daily Log (`/journal`)
- One entry per day: mood (1–5), energy, sleep hours, gratitude, free text.
- Mood/sleep trends and correlation hints ("You sleep 1.2h more on gym days").

### 4.10 Goals (`/goals`)
- Long-term goals with milestones; can be linked to metrics (e.g. "Bench 100kg" auto-tracks from gym PRs, "Save ₹1L" from savings goal, "Read 24 books" from books).

### 4.11 Achievements & Progress (`/progress`)
- See section 5. Trophy case, level history, yearly "Wrapped"-style review.

### 4.12 Settings (`/settings`)
- Theme, currency, week start day, units (kg/lb), cursor on/off, reduced motion, data **export/import (JSON/CSV)**.

---

## 5. Progress Engine (the "real progress" part)

### XP & Levels
Every meaningful action awards XP:

| Action | XP |
|---|---|
| Complete habit | 10 |
| Full day of habits (all done) | +25 bonus |
| Log workout | 30 (+20 if PR) |
| 25 min study session | 15 |
| Finish a book | 100 |
| Journal entry | 10 |
| Stay under daily budget | 10 |
| Hit monthly budget | 150 |

- Level curve: `xpForLevel(n) = 100 * n^1.5` → early levels fast, later levels meaningful.
- Each module also has its own level (Fitness Lv 7, Reading Lv 4…) shown as a radial "skill wheel".

### Life Score (daily, 0–100)
Weighted average of today's completion across enabled modules (habits %, budget adherence, workout done/rest day planned, learning minutes vs target, journal written). Shown as a ring + 30-day trend line.

### Streaks
- Per habit, per module (gym weekly streak = hit X workouts/week), and global "showed up" streak.
- Streak freezes: earn 1 per 7-day streak, auto-applied on a missed day.

### Achievements (examples)
- **Habits:** First Step (1st check), Week Warrior (7-day streak), Unbreakable (100-day streak), Perfect Month.
- **Gym:** First Rep, 50 Workouts, Plate Club (bench 60kg), Iron Year (150 workouts in a year), New PR ×10.
- **Money:** In the Green (first month saved >0), Saver 20% (savings rate), Budget Master (3 months on budget), Net worth milestones.
- **Learning:** 10 / 100 / 1000 hours, Polymath (5 skills >10h).
- **Books:** Bookworm (first finish), 12 in a year, 10,000 pages.
- **Meta:** Level 10/25/50, 365 days logged.
- Tiered (bronze/silver/gold rendered as outline / half-fill / solid in B&W).
- Defined declaratively in code (`achievements.ts`) with a `check(ctx)` function; evaluated after each mutation in a server action and on a daily job.

### Insights
- Weekly summary card (every Monday): best day, total spend, workouts, hours learned, streaks kept/lost.
- Simple correlations across modules (mood vs sleep vs gym vs spend).
- Year in Review page (`/progress/2026`).

---

## 6. Data Model (Drizzle, simplified)

```
users            id, name, email, settings(json), xp, level, createdAt

habits           id, userId, name, icon, type(bool|count|duration|quit), target,
                 unit, frequency(json), order, archivedAt, createdAt
habit_logs       id, habitId, date, value, note          -- unique(habitId, date)

accounts         id, userId, name, type, currency, openingBalance, archivedAt
categories       id, userId, name, kind(income|expense), icon
transactions     id, userId, accountId, categoryId, type(income|expense|transfer),
                 amount, toAccountId, date, note, tags(json), recurringId
recurring_rules  id, userId, template(json), rrule, nextRunAt
budgets          id, userId, categoryId, month(YYYY-MM), limit
savings_goals    id, userId, name, target, saved, deadline

exercises        id, userId, name, muscleGroup, kind(strength|cardio|bodyweight)
workouts         id, userId, date, templateName, durationMin, note
workout_sets     id, workoutId, exerciseId, setIndex, reps, weight, distance, timeSec, isPR
workout_templates id, userId, name, exercises(json)
body_metrics     id, userId, date, weight, bodyFat, measurements(json)

skills           id, userId, name, targetHours, archivedAt
study_sessions   id, skillId, date, minutes, summary, resourceId
resources        id, skillId, title, url, kind, status
til_entries      id, userId, date, text, skillId?

books            id, userId, title, author, coverUrl, totalPages, status,
                 startedAt, finishedAt, rating, review
reading_logs     id, bookId, date, pagesRead, currentPage
highlights       id, bookId, page, text

notes            id, userId, title, content(json), tags(json), pinned,
                 linkedType?, linkedId?, updatedAt
journal_entries  id, userId, date, mood, energy, sleepHours, gratitude, content  -- unique(userId, date)

goals            id, userId, title, metric(json)?, target, deadline, status
goal_milestones  id, goalId, title, doneAt

xp_events        id, userId, source, sourceId, amount, createdAt   -- audit trail, enables recompute
achievements_unlocked  id, userId, achievementKey, tier, unlockedAt
```
Dates stored as `YYYY-MM-DD` strings for day-level records (avoids timezone bugs in streaks).

---

## 7. Project Structure

```
track/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (app)/
│  │  │  ├─ layout.tsx            # sidebar, Lenis, cursor, page transitions
│  │  │  ├─ page.tsx              # dashboard
│  │  │  ├─ habits/  money/  budget/  gym/  learning/
│  │  │  ├─ books/  notes/  journal/  goals/  progress/  settings/
│  │  │  ├─ layout.tsx               # fonts, ThemeProvider
│  │  └─ globals.css              # tokens
│  ├─ components/
│  │  ├─ ui/                      # shadcn (restyled)
│  │  ├─ motion/                  # SmoothScroll, Cursor, Magnetic, PageTransition,
│  │  │                           # Reveal, NumberTicker, DrawCheck
│  │  ├─ charts/                  # Heatmap, Ring, LineTrend, BarStack (monochrome)
│  │  ├─ layout/                  # Sidebar, MobileNav, CommandPalette, ThemeToggle
│  │  └─ <module>/                # habit-card, workout-logger, txn-form, ...
│  ├─ db/
│  │  ├─ schema/                  # one file per module
│  │  ├─ index.ts                 # libsql client
│  │  └─ seed.ts                  # demo data
│  ├─ server/
│  │  ├─ actions/                 # server actions per module
│  │  └─ queries/                 # read functions per module
│  ├─ lib/
│  │  ├─ progress/                # xp.ts, levels.ts, streaks.ts, life-score.ts,
│  │  │                           # achievements.ts, insights.ts
│  │  ├─ fitness.ts               # 1RM, volume, PR detection
│  │  ├─ money.ts                 # balances, savings rate, safe-to-spend
│  │  ├─ validators/              # zod schemas
│  │  └─ utils.ts
│  └─ proxy.ts                  # optimistic auth redirect (Next 16 "middleware")
├─ drizzle/                       # migrations
├─ tests/                         # vitest + playwright
├─ drizzle.config.ts
└─ .env.local                     # DATABASE_URL, AUTH_SECRET, ...
```

---

## 8. Build Roadmap (phases)

### Phase 0 — Foundation (Day 1–2) ✅ done
- `pnpm create next-app` (TS, Tailwind, App Router, `src/`), ESLint + Prettier.
- Tokens + fonts + `next-themes` + animated theme toggle.
- shadcn init, restyle to monochrome.
- `SmoothScroll` (Lenis), `Cursor`, `Magnetic`, `PageTransition`, `Reveal`, `NumberTicker`.
- App shell: sidebar, mobile nav, command palette skeleton.
- Drizzle + libSQL setup, session auth, `proxy.ts` + DAL protected `(app)` routes.

### Phase 1 — Habits + Dashboard (Day 3–5)
- Habit CRUD, daily check-in, heatmap, streak logic (+ unit tests).
- Dashboard v1 with today's habits and stats.

### Phase 2 — Money & Budget (Day 6–9)
- Accounts, categories, transactions, recurring rules.
- Budgets per category, safe-to-spend, savings goals.
- Charts: income vs expense, net worth, category breakdown.

### Phase 3 — Gym (Day 10–13)
- Exercise library (seeded), workout logger with rest timer, templates.
- PR detection, 1RM charts, volume per muscle, body metrics.

### Phase 4 — Learning, Books, Notes, Journal (Day 14–18)
- Skills + study sessions + focus timer + TIL.
- Books with Open Library search, reading logs, yearly goal.
- Notes with Tiptap, tags, search, linking.
- Journal with mood/sleep tracking.

### Phase 5 — Progress Engine (Day 19–22)
- XP events, levels, per-module levels, Life Score.
- Achievement definitions + unlock evaluation + unlock animation.
- Goals linked to metrics. Trophy case page.

### Phase 6 — Insights & Polish (Day 23–26)
- Weekly summary, correlations, Year in Review.
- Micro-interactions pass, empty states, loading skeletons, reduced-motion audit.
- Keyboard shortcuts, export/import, PWA (installable on phone).

### Phase 7 — Ship (Day 27–28)
- Playwright flows, Lighthouse pass, deploy to Vercel + Turso.

---

## 9. Quality Checklist
- [ ] Streak / XP / budget math covered by unit tests (timezones, week boundaries, month rollover).
- [ ] Every log action works in ≤ 2 clicks / via `⌘K`.
- [ ] Optimistic UI on check-ins (instant feedback, rollback on error).
- [ ] No layout shift on theme switch; no hydration flashes.
- [ ] Cursor & Lenis disabled on touch / reduced motion.
- [ ] WCAG contrast AA in both themes (easy with pure B&W).
- [ ] Data export works before anything else gets complex — your data is yours.

---

## 10. Future Ideas
- AI weekly review (summarise your week, suggest focus).
- Apple Health / Google Fit import for steps & sleep.
- Bank SMS / CSV statement import for transactions.
- Widgets / PWA push reminders for habits.
- Shareable achievement cards (B&W poster style).
