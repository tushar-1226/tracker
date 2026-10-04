import { TONE, type Tone } from "./scale";

export type TooltipRow = { name: string; value: string; tone: Tone };

/** Values lead, labels follow; rows keyed with a short line in the series tone. */
export function ChartTooltip({
  x,
  y,
  width,
  title,
  rows,
}: {
  x: number;
  y: number;
  width: number;
  title: string;
  rows: TooltipRow[];
}) {
  const flip = x > width - 170;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 rounded-full bg-subtle px-3 py-2 text-xs shadow-lg shadow-black/5"
      style={{ left: x, top: y, transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
    >
      <p className="mb-1.5 text-muted">{title}</p>
      {rows.map((r) => (
        <p key={r.name} className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded-full" style={{ background: TONE[r.tone] }} />
          <span className="font-medium">{r.value}</span>
          <span className="text-muted">{r.name}</span>
        </p>
      ))}
    </div>
  );
}
