import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <p className="text-[15px] text-muted">404</p>
      <h1 className="mt-2 text-5xl font-semibold tracking-tight md:text-7xl">Nothing here.</h1>
      <Link href="/" className="mt-10 inline-flex h-12 items-center rounded-full bg-foreground px-6 text-[15px] font-medium text-background shadow-soft transition-opacity hover:opacity-90">
        Back to track.
      </Link>
    </main>
  );
}
