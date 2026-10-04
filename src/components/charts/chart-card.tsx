"use client";

import { Table2, LineChart as ChartIcon } from "lucide-react";
import { useState } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TableData = { columns: string[]; rows: (string | number)[][] };

/** Card shell for a chart with a chart/table toggle, so no value is hover-only. */
export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  className,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  legend?: React.ReactNode;
  table: TableData;
  className?: string;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <CardLabel>{title}</CardLabel>
          {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
        </div>
        <button
          type="button"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          aria-label={view === "chart" ? "Show as table" : "Show as chart"}
          className="-mt-1 -mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-foreground"
        >
          {view === "chart" ? <Table2 className="size-4" /> : <ChartIcon className="size-4" />}
        </button>
      </div>
      {legend && view === "chart" && <div className="mb-4">{legend}</div>}
      {view === "chart" ? (
        <div className="flex-1">{children}</div>
      ) : (
        <div className="max-h-72 overflow-auto" data-lenis-prevent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                {table.columns.map((c, i) => (
                  <th key={c} className={cn("pb-2 font-medium", i > 0 && "text-right")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t">
                  {r.map((cell, j) => (
                    <td key={j} className={cn("py-2", j > 0 && "text-right tabular-nums")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
