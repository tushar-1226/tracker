/**
 * Runs the reminder scheduler inside long-running Node servers (`next start`, `next dev`).
 * Serverless hosts don't keep a process alive; call /api/cron/reminders every minute instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.DISABLE_REMINDER_SCHEDULER === "1") return;
  const { runReminders } = await import("./server/reminders");
  const tick = () => runReminders().catch((e) => console.error("reminders:", e));
  // Align to the start of each minute so "21:30" fires at 21:30, not 21:30:47.
  setTimeout(() => {
    void tick();
    setInterval(tick, 60_000);
  }, 60_000 - (Date.now() % 60_000));
}
