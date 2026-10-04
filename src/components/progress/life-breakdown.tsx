import type { LifeParts } from "@/lib/progress/life-score";
import { MODULES } from "@/lib/progress/modules";
import { MODULE_ICON } from "./module-icon";

/** One mini meter per module that counts toward today's score. */
export function LifeBreakdown({ parts }: { parts: LifeParts }) {
  const used = MODULES.filter((m) => parts[m.key] !== null && parts[m.key] !== undefined);
  if (!used.length) return <p className="mt-1 text-xs text-muted">Start tracking anything to get a score</p>;
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-2">
      {used.map((m) => {
        const Icon = MODULE_ICON[m.key];
        const v = parts[m.key]!;
        return (
          <li key={m.key} className="flex items-center gap-1.5" title={`${m.label}: ${Math.round(v * 100)}%`}>
            <Icon className="size-3 text-muted" aria-hidden />
            <span className="sr-only">{m.label}</span>
            <span className="h-1 w-8 overflow-hidden rounded-full bg-hairline">
              <span className="block h-full rounded-full bg-foreground" style={{ width: `${v * 100}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
