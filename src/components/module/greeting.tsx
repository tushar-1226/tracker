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
      <p className="text-[15px] text-muted">{date ? format(date, "EEEE, d MMMM") : " "}</p>
      <h1 className="mt-1 text-[2.5rem] leading-[1.05] font-semibold tracking-tight md:text-6xl">
        {part},<br className="sm:hidden" /> {name.split(" ")[0]}
        <span className="text-muted">.</span>
      </h1>
    </div>
  );
}
