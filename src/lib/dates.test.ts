import { describe, expect, it } from "vitest";
import { formatDate, toDate } from "./dates";

describe("formatDate", () => {
  const d = toDate("2026-09-04");

  it("formats without depending on ICU", () => {
    expect(formatDate(d, { month: "short", year: "numeric", timeZone: "UTC" })).toBe("Sep 2026");
    expect(formatDate(d, { weekday: "short", day: "numeric", timeZone: "UTC" })).toBe("Fri 4");
    expect(formatDate(d, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })).toBe("Fri, 4 Sep 2026");
    expect(formatDate(d, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })).toBe("Friday, 4 September");
  });

  it("speaks Hindi", () => {
    expect(formatDate(d, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }, "hi")).toBe("शुक्रवार, 4 सितंबर");
  });
});
