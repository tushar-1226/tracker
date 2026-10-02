import { describe, expect, it } from "vitest";
import {
  accountBalances,
  addMonths,
  daysInMonth,
  formatMoney,
  goalEta,
  monthlyEquivalent,
  occurrence,
  occurrencesUntil,
  parseAmount,
  safeToSpend,
} from "./math";

describe("parse & format", () => {
  it("parses user input into paise", () => {
    expect(parseAmount("1,234.5")).toBe(123450);
    expect(parseAmount("₹ 99")).toBe(9900);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });

  it("formats in Indian grouping", () => {
    expect(formatMoney(12345600)).toBe("₹1,23,456");
    expect(formatMoney(12350)).toBe("₹123.50");
    expect(formatMoney(-5000, "INR", { sign: true })).toBe("-₹50");
  });
});

describe("balances", () => {
  it("applies income, expense and transfers", () => {
    const b = accountBalances(
      [
        { id: "bank", openingBalance: 10000 },
        { id: "card", openingBalance: -2000 },
      ],
      [
        { type: "income", amount: 5000, accountId: "bank", toAccountId: null },
        { type: "expense", amount: 1000, accountId: "card", toAccountId: null },
        { type: "transfer", amount: 3000, accountId: "bank", toAccountId: "card" },
      ],
    );
    expect(b.get("bank")).toBe(12000);
    expect(b.get("card")).toBe(0);
  });
});

describe("months", () => {
  it("adds months across years", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
  it("knows month lengths", () => {
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-02")).toBe(28);
  });
});

describe("recurring", () => {
  it("clamps monthly dates to the month end but keeps the anchor", () => {
    expect(occurrence("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(occurrence("2026-01-31", "monthly", 2)).toBe("2026-03-31");
  });

  it("lists due occurrences and the next one", () => {
    const r = occurrencesUntil("2026-09-01", "monthly", "2026-09-01", "2026-11-15");
    expect(r.dates).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(r.next).toBe("2026-12-01");
  });

  it("starts from the stored next date", () => {
    const r = occurrencesUntil("2026-09-03", "weekly", "2026-09-17", "2026-09-30");
    expect(r.dates).toEqual(["2026-09-17", "2026-09-24"]);
    expect(r.next).toBe("2026-10-01");
  });

  it("normalises to a monthly cost", () => {
    expect(monthlyEquivalent(1200, "yearly")).toBe(100);
    expect(monthlyEquivalent(1200, "weekly")).toBe(5200);
  });
});

describe("budget & goals", () => {
  it("splits what is left across remaining days including today", () => {
    expect(safeToSpend(31000, "2026-10-01", "2026-10")).toBe(1000);
    expect(safeToSpend(-500, "2026-10-01", "2026-10")).toBe(0);
  });

  it("estimates months to a goal from the last 90 days", () => {
    const c = [
      { amount: 3000, date: "2026-09-01" },
      { amount: 3000, date: "2026-08-01" },
      { amount: 3000, date: "2026-07-15" },
      { amount: 99999, date: "2025-01-01" },
    ];
    expect(goalEta(9000, 15000, c, "2026-10-02")).toBe(2);
    expect(goalEta(0, 100, [], "2026-10-02")).toBeNull();
  });
});
