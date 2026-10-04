import { TONE, type Tone } from "./scale";

/** Legend that mirrors the mark: rect for bars, line for lines. */
export function Legend({ items, mark }: { items: { name: string; tone: Tone }[]; mark: "rect" | "line" }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
      {items.map((i) => (
        <span key={i.name} className="flex items-center gap-1.5">
          <span
            className={mark === "rect" ? "size-2.5 rounded-[3px]" : "h-0.5 w-3.5 rounded-full"}
            style={{ background: TONE[i.tone] }}
          />
          {i.name}
        </span>
      ))}
    </div>
  );
}
