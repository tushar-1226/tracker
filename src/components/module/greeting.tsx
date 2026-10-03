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
    <div className="border-b-2 border-foreground pb-6">
      <div className="flex items-baseline justify-between gap-4 border-b pb-2 text-[10px] font-semibold tracking-[0.2em] uppercase">
        <span>(01)</span>
        <span className="text-muted">{date ? format(date, "EEEE, d MMMM yyyy") : "\u00a0"}</span>
      </div>
      <h1 className="mt-6 text-[2.75rem] leading-[0.88] font-bold tracking-[-0.055em] uppercase md:text-[6.5rem]">
        {part},
        <br />
        {name.split(" ")[0]}.
      </h1>
    </div>
  );
}
