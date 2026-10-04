import { cookies } from "next/headers";
import { SESSION_COOKIE, decrypt } from "@/lib/auth/jwt";
import { type ExportFile, importUserData } from "@/server/data-transfer";

const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await decrypt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session?.userId) return new Response("Unauthorized", { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return Response.json({ error: "File is too large." }, { status: 413 });
  }
  let file: ExportFile;
  try {
    file = await request.json();
  } catch {
    return Response.json({ error: "Couldn’t read that file as JSON." }, { status: 400 });
  }
  try {
    const counts = await importUserData(session.userId, file);
    return Response.json({ ok: true, counts });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
