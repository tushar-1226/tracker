import { describe, expect, it } from "vitest";
import { KARANAS, karanaOf, navamsaOf, tithiOf, zonedToUtc } from "@/lib/astro/constants";
import { ascendant, ayanamsa, ephemerisSource, grahaPositions, natalChart, panchang } from "./ephemeris";

const at = (d: Date, g: string) => grahaPositions(d).find((p) => p.graha === g)!;
const DELHI = { name: "New Delhi", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" };

describe("Swiss Ephemeris setup", () => {
  it("uses the ephemeris files", () => expect(ephemerisSource).toContain("files"));
  it("Lahiri ayanamsa for 2026 is ~24°14′", () => {
    expect(ayanamsa(new Date("2026-10-04T00:00:00Z"))).toBeCloseTo(24.23, 1);
  });
});

describe("time zones", () => {
  it("handles IST and DST", () => {
    expect(zonedToUtc("2026-10-04", "05:30", "Asia/Kolkata").toISOString()).toBe("2026-10-04T00:00:00.000Z");
    expect(zonedToUtc("2026-07-01", "12:00", "America/New_York").toISOString()).toBe("2026-07-01T16:00:00.000Z");
  });
});

describe("sankrantis and 2026 transits", () => {
  it("Makara Sankranti on 14 January", () => {
    expect(at(new Date("2026-01-14T00:00:00Z"), "Sun").rashi).toBe(8);
    expect(at(new Date("2026-01-15T00:00:00Z"), "Sun").rashi).toBe(9);
  });
  it("Rahu Kumbha, Ketu Simha, Saturn Meena (R), Jupiter Karka on 4 Oct 2026", () => {
    const d = new Date("2026-10-04T00:00:00Z");
    expect(at(d, "Rahu").rashi).toBe(10);
    expect(at(d, "Ketu").rashi).toBe(4);
    expect(at(d, "Saturn")).toMatchObject({ rashi: 11, retrograde: true });
    expect(at(d, "Jupiter").rashi).toBe(3);
    expect(at(d, "Venus").retrograde).toBe(true);
  });
  it("marks dignity: Jupiter exalted in Karka", () => {
    expect(at(new Date("2026-10-04T00:00:00Z"), "Jupiter").dignity).toBe("exalted");
  });
});

describe("panchang", () => {
  const p = panchang("2026-10-04", DELHI);
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }).format(d);

  it("gives Delhi sunrise/sunset for 4 Oct 2026", () => {
    expect(fmt(p.sunrise)).toBe("06:15"); // upper limb + refraction, as published sunrise tables
    expect(fmt(p.sunset)).toBe("18:03");
  });
  it("tithi end time is exact to the minute", () => {
    const tAt = (d: Date) => {
      const pos = grahaPositions(d);
      return tithiOf(pos[0].longitude, pos[1].longitude).number;
    };
    expect(tAt(new Date(p.tithi.ends.getTime() - 60_000))).toBe(p.tithi.number);
    expect(tAt(new Date(p.tithi.ends.getTime() + 60_000))).toBe((p.tithi.number % 30) + 1);
  });
  it("nakshatra end time is exact", () => {
    const nAt = (d: Date) => at(d, "Moon").nakshatra.index;
    expect(nAt(new Date(p.nakshatra.ends.getTime() - 60_000))).toBe(p.nakshatra.index);
    expect(nAt(new Date(p.nakshatra.ends.getTime() + 60_000))).toBe((p.nakshatra.index + 1) % 27);
  });
  it("kaal windows sit inside daylight; Rahu Kaal is the last eighth on Sunday", () => {
    expect(p.vara.name).toBe("Ravivara");
    expect(Math.abs(p.rahuKaal.end.getTime() - p.sunset.getTime())).toBeLessThan(1000);
    expect(p.yamaganda.start > p.sunrise && p.gulika.end < p.sunset).toBe(true);
    expect(p.brahmaMuhurta.end < p.sunrise).toBe(true);
  });
});

describe("lagna", () => {
  it("equals the Sun's longitude at sunrise", () => {
    const p = panchang("2026-10-04", DELHI);
    const diff = Math.abs(((ascendant(p.sunrise, DELHI.lat, DELHI.lon) - at(p.sunrise, "Sun").longitude + 540) % 360) - 180);
    expect(diff).toBeLessThan(1.5);
  });
  it("falls back to the Moon sign without a birth time", () => {
    const c = natalChart({ date: "1995-06-15", time: null, place: DELHI });
    expect(c.lagna).toBeNull();
    expect(c.houseRef).toBe(c.moonRashi);
  });
});

describe("navamsa & karana rules", () => {
  it("navamsa starts fire signs from Aries and earth signs from Capricorn", () => {
    expect(navamsaOf(0.1)).toBe(0); // Aries → Aries
    expect(navamsaOf(30.1)).toBe(9); // Taurus → Capricorn
    expect(navamsaOf(120.1)).toBe(0); // Leo → Aries
    expect(navamsaOf(29.9)).toBe(8); // last pada of Aries → Sagittarius
  });
  it("karanas follow the fixed/movable cycle", () => {
    expect(KARANAS[karanaOf(0, 3)]).toBe("Kimstughna");
    expect(KARANAS[karanaOf(0, 7)]).toBe("Bava");
    expect(KARANAS[karanaOf(0, 343)]).toBe("Shakuni");
    expect(KARANAS[karanaOf(0, 357)]).toBe("Naga");
  });
});
