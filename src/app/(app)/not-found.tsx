import Link from "next/link";
import { Button } from "@/components/ui/button";

/** In-app 404: keeps the header and dock around it. */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="text-[15px] text-muted">404</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-6xl">Nothing here.</h1>
      <p className="mt-4 max-w-sm text-[15px] text-muted">That page doesn’t exist — or it belonged to something you deleted.</p>
      <Button asChild className="mt-8">
        <Link href="/">Back to today</Link>
      </Button>
    </div>
  );
}
