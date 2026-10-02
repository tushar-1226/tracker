"use client";

import { format } from "date-fns";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Renders in the viewer's local time zone; the server pass shows a neutral fallback. */
export function Greeting({ name }: { name: string }) {
  const now = useSyncExternalStore(subscribe, () => new Date().setSeconds(0, 0), () => null);
  const date = now === null ? null : new Date(now);
  const hour = date?.getHours();
  const part =
    hour === undefined ? "Hello" : hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <p className="text-sm text-muted">{date ? format(date, "EEEE, d MMMM") : " "}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-5xl">
        {part}, {name.split(" ")[0]}.
      </h1>
    </div>
  );
}
