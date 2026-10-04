import type { Metadata } from "next";
import { connection } from "next/server";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { hasAnyUser } from "@/server/queries/users";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  await connection();
  const mode = (await hasAnyUser()) ? "login" : "signup";

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <ThemeToggle className="absolute top-4 right-4 z-10" />

      <section className="relative m-3 hidden overflow-hidden rounded-[2.25rem] bg-foreground p-12 text-background shadow-lift lg:flex lg:flex-col lg:justify-between">
        <p className="text-xl font-semibold tracking-tight">
          track<span className="opacity-50">.</span>
        </p>
        <div>
          <h2 className="text-6xl leading-[1.02] font-semibold tracking-tight">
            Small days,
            <br />
            tracked honestly,
            <br />
            <span className="opacity-50">add up.</span>
          </h2>
          <p className="mt-8 max-w-sm border-t border-background/30 pt-4 text-xs font-medium text-muted opacity-60">
            Habits, money, gym, learning, books and notes — one quiet place to see real progress.
          </p>
        </div>
        <Grid />
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <AuthForm mode={mode} />
      </section>
    </div>
  );
}

/** Decorative contribution grid in grayscale. */
function Grid() {
  const cells = Array.from({ length: 7 * 26 }, (_, i) => {
    const v = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    return Math.abs(v);
  });
  return (
    <div className="grid w-fit grid-flow-col grid-rows-7 gap-1" aria-hidden>
      {cells.map((v, i) => (
        <span key={i} className="size-2.5 rounded-[3px] bg-background" style={{ opacity: 0.08 + v * 0.7 }} />
      ))}
    </div>
  );
}
