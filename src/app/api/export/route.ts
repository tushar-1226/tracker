import { cookies } from "next/headers";
import { SESSION_COOKIE, decrypt } from "@/lib/auth/jwt";
import { exportUserData } from "@/server/data-transfer";

export async function GET() {
  const session = await decrypt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session?.userId) return new Response("Unauthorized", { status: 401 });
  const data = await exportUserData(session.userId);
  const day = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="track-export-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
