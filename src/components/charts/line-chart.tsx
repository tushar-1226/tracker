"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { ChartTooltip } from "./tooltip";
import { TONE, type Tone, niceTicks } from "./scale";
import { useWidth } from "./use-width";

export type LineSeries = { name: string; tone: Tone; values: (number | null)[]; area?: boolean };

const PAD = { top: 12, right: 12, bottom: 26, left: 52 };

/** Line/area chart with a snapping crosshair, one tooltip for every series, and keyboard support. */
export function LineChart({
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
  series: LineSeries[];
  format: (v: number) => string;
  formatAxis?: (v: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = labels.length;

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const ticks = niceTicks(Math.min(0, ...all), Math.max(1, ...all));
  const [yMin, yMax] = [ticks[0], ticks[ticks.length - 1]];
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const every = Math.max(1, Math.ceil(n / Math.max(1, innerW / 56)));

  const pathFor = (values: (number | null)[]) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) return void (pen = false);
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const areaFor = (values: (number | null)[]) => {
    const pts = values.map((v, i) => (v === null ? null : ([x(i), y(v)] as const))).filter((p) => p !== null);
    if (pts.length < 2) return "";
    const base = y(Math.max(0, yMin));
    return `M${pts[0][0]},${base}` + pts.map(([px, py]) => `L${px},${py}`).join("") + `L${pts[pts.length - 1][0]},${base}Z`;
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    setActive(Math.min(n - 1, Math.max(0, Math.round((px / Math.max(1, innerW)) * (n - 1)))));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else return;
    e.preventDefault();
  };

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
          className="touch-pan-y overflow-visible outline-none"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px] tabular-nums">
                {formatAxis(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % every === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-muted text-[10px]">
                {l}
              </text>
            ) : null,
          )}

          {series.map((s) =>
            s.area ? <path key={`a-${s.name}`} d={areaFor(s.values)} fill={TONE[s.tone]} opacity={0.08} /> : null,
          )}
          {series.map((s) => (
            <motion.path
              key={s.name}
              d={pathFor(s.values)}
              fill="none"
              stroke={TONE[s.tone]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}

          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--foreground)" strokeOpacity={0.25} />
              {series.map((s) => {
                const v = s.values[active];
                return v === null ? null : (
                  <circle key={s.name} cx={x(active)} cy={y(v)} r={4} fill={TONE[s.tone]} stroke="var(--surface)" strokeWidth={2} />
                );
              })}
            </g>
          )}
        </svg>
      )}
      {active !== null && width > 0 && (
        <ChartTooltip
          x={x(active)}
          y={PAD.top + innerH / 2}
          width={width}
          title={titles[active]}
          rows={series.map((s) => ({
            name: s.name,
            tone: s.tone,
            value: s.values[active] === null ? "—" : format(s.values[active]!),
          }))}
        />
      )}
    </div>
  );
}
