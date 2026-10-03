"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { ChartTooltip } from "./tooltip";
import { TONE, type Tone, niceTicks } from "./scale";
import { useWidth } from "./use-width";

const PAD = { top: 12, right: 8, bottom: 26, left: 52 };
const BAR_MAX = 24;
const GAP = 2;

/** Path for a column with a 4px rounded top and a square base. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Grouped columns; each group is a hover/focus target listing every series. */
export function ColumnChart({
  labels,
  titles = labels,
  series,
  format,
  formatAxis = format,
  height = 220,
  ariaLabel,
}: {
  labels: string[];
  titles?: string[];
  series: { name: string; tone: Tone; values: number[] }[];
  format: (v: number) => string;
  formatAxis?: (v: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = labels.length;
  const ticks = niceTicks(0, Math.max(1, ...series.flatMap((s) => s.values)));
  const yMax = ticks[ticks.length - 1];
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const band = innerW / Math.max(1, n);
  const barW = Math.min(BAR_MAX, (band * 0.7 - GAP * (series.length - 1)) / series.length);
  const groupW = barW * series.length + GAP * (series.length - 1);
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--hairline)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px] tabular-nums">
                {formatAxis(t)}
              </text>
            </g>
          ))}
          {labels.map((label, i) => {
            const gx = PAD.left + band * i + (band - groupW) / 2;
            return (
              <g
                key={i}
                tabIndex={0}
                role="button"
                aria-label={`${titles[i]}: ${series.map((s) => `${s.name} ${format(s.values[i])}`).join(", ")}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} fill="transparent" />
                {active === i && (
                  <rect x={PAD.left + band * i + 2} y={PAD.top} width={band - 4} height={innerH} rx={8} fill="var(--foreground)" opacity={0.04} />
                )}
                {series.map((s, j) => {
                  const v = s.values[i];
                  const h = Math.max(0, PAD.top + innerH - y(v));
                  return h > 0 ? (
                    <motion.path
                      key={s.name}
                      d={columnPath(gx + j * (barW + GAP), y(v), barW, h)}
                      fill={TONE[s.tone]}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                      style={{ transformOrigin: "bottom", transformBox: "fill-box" }}
                    />
                  ) : null;
                })}
                <text x={PAD.left + band * i + band / 2} y={height - 6} textAnchor="middle" className="fill-muted text-[10px]">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {active !== null && width > 0 && (
        <ChartTooltip
          x={PAD.left + band * active + band / 2}
          y={PAD.top + innerH / 2}
          width={width}
          title={titles[active]}
          rows={series.map((s) => ({ name: s.name, tone: s.tone, value: format(s.values[active]) }))}
        />
      )}
    </div>
  );
}
