import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, decrypt } from "@/lib/auth/jwt";

// Optimistic auth check only; pages re-verify through the DAL.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage = pathname === "/login";

  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // Public: API routes (self-authenticating), static assets, and PWA files the browser
  // fetches without a session (service worker, manifest, icons).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|apple-icon|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
