/**
 * Day-level dates are plain "YYYY-MM-DD" strings in the user's local calendar.
 * All arithmetic goes through UTC so DST and server time zone never shift a day.
 */
export type Day = string;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function isDay(value: unknown): value is Day {
  if (typeof value !== "string" || !DAY_RE.test(value)) return false;
  return toDate(value).toISOString().startsWith(value);
}

export function toDate(day: Day) {
  return new Date(`${day}T00:00:00Z`);
}

export function fromDate(date: Date): Day {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: Day, n: number): Day {
  return fromDate(new Date(toDate(day).getTime() + n * MS_PER_DAY));
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: Day, b: Day) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / MS_PER_DAY);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(day: Day) {
  return toDate(day).getUTCDay();
}

/** First day of the week containing `day`. */
export function startOfWeek(day: Day, weekStartsOn: 0 | 1 = 1): Day {
  const offset = (dayOfWeek(day) - weekStartsOn + 7) % 7;
  return addDays(day, -offset);
}

/** Inclusive list of days from `start` to `end`. */
export function eachDay(start: Day, end: Day): Day[] {
  const out: Day[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's date in the given IANA time zone. */
export function todayIn(timeZone: string): Day {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const NAMES = {
  en: {
    weekday: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    weekdayShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  hi: {
    weekday: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
    weekdayShort: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
    month: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
    monthShort: ["जन॰", "फ़र॰", "मार्च", "अप्रैल", "मई", "जून", "जुल॰", "अग॰", "सित॰", "अक्तू॰", "नव॰", "दिस॰"],
  },
};

export type DateFormat = {
  weekday?: "short" | "long";
  day?: "numeric";
  month?: "short" | "long";
  year?: "numeric";
  /** Read the date in UTC (calendar days) instead of the viewer's zone. */
  timeZone?: "UTC";
};

/**
 * Locale-free date formatting ("Fri, 4 Sep 2026"). Intl output differs between Node's
 * and the browser's ICU (en-IN "Sept" vs "Sep"), which breaks hydration.
 */
export function formatDate(date: Date | number, f: DateFormat, lang: "en" | "hi" = "en") {
  const d = typeof date === "number" ? new Date(date) : date;
  const utc = f.timeZone === "UTC";
  const n = NAMES[lang];
  const wd = utc ? d.getUTCDay() : d.getDay();
  const m = utc ? d.getUTCMonth() : d.getMonth();
  const date_ = [
    f.day ? String(utc ? d.getUTCDate() : d.getDate()) : "",
    f.month ? (f.month === "long" ? n.month : n.monthShort)[m] : "",
    f.year ? String(utc ? d.getUTCFullYear() : d.getFullYear()) : "",
  ].filter(Boolean).join(" ");
  if (!f.weekday) return date_;
  const w = (f.weekday === "long" ? n.weekday : n.weekdayShort)[wd];
  return date_ ? `${w}${f.month ? "," : ""} ${date_}` : w;
}
