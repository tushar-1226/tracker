import { runReminders } from "@/server/reminders";

/** For serverless deploys: call every minute with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const sent = await runReminders();
  return Response.json({ sent });
}
