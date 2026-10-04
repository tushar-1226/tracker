"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="text-[15px] text-muted">Something went wrong{error.digest ? ` · ref ${error.digest}` : ""}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-6xl">Let’s try that again.</h1>
      <p className="mt-4 max-w-sm text-[15px] text-muted">Your data is safe. If it keeps happening, reload the app.</p>
      <div className="mt-8 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Today</Link>
        </Button>
      </div>
    </div>
  );
}
