import { z } from "zod";
import { isDay, isValidTimeZone } from "@/lib/dates";
import { isTime } from "@/lib/reminders";

export const placeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  tz: z.string().refine(isValidTimeZone, { error: "Unknown time zone" }),
});

export const birthSchema = z.object({
  date: z.string().refine((d) => isDay(d) && d >= "1900-01-01", { error: "Pick the birth date" }),
  time: z.string().refine(isTime).nullable(),
  place: placeSchema,
});
