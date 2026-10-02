import "server-only";
import { cookies } from "next/headers";
import { type Day, isValidTimeZone, todayIn } from "@/lib/dates";

export const TZ_COOKIE = "tz";

/** The viewer's IANA time zone, synced from the browser by <TimezoneSync />. */
export async function getTimeZone() {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return tz && isValidTimeZone(tz) ? tz : "UTC";
}

export async function getToday(): Promise<Day> {
  return todayIn(await getTimeZone());
}
