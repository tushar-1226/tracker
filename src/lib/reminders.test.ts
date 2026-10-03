import { describe, expect, it } from "vitest";
import { isDue, localClock } from "./reminders";

describe("localClock", () => {
  it("converts an instant to local day, minutes and weekday", () => {
    // 2026-10-02 16:00 UTC = 21:30 in Kolkata (Friday)
    const c = localClock(new Date("2026-10-02T16:00:00Z"), "Asia/Kolkata");
    expect(c).toEqual({ day: "2026-10-02", minutes: 21 * 60 + 30, weekday: 5 });
  });
  it("crosses midnight correctly", () => {
    const c = localClock(new Date("2026-10-02T20:00:00Z"), "Asia/Kolkata"); // 01:30 Sat
    expect(c.day).toBe("2026-10-03");
    expect(c.weekday).toBe(6);
  });
});

describe("isDue", () => {
  const clock = { day: "2026-10-02", minutes: 21 * 60 + 35, weekday: 5 };
  const r = { time: "21:30", days: [] as number[], enabled: true, lastSentDate: null as string | null };

  it("fires inside the window", () => expect(isDue(r, clock)).toBe(true));
  it("not before the time", () => expect(isDue({ ...r, time: "21:40" }, clock)).toBe(false));
  it("not after the window", () => expect(isDue({ ...r, time: "20:30" }, clock)).toBe(false));
  it("only once a day", () => expect(isDue({ ...r, lastSentDate: "2026-10-02" }, clock)).toBe(false));
  it("respects weekdays", () => {
    expect(isDue({ ...r, days: [1, 3, 5] }, clock)).toBe(true);
    expect(isDue({ ...r, days: [1, 3] }, clock)).toBe(false);
  });
  it("respects enabled", () => expect(isDue({ ...r, enabled: false }, clock)).toBe(false));
});
