"use client";

import { useState } from "react";

/** One bar in the trend: a (short) label, its value, a formatted label, current. */
export type TrendBar = {
  label: string;
  value: number;
  valueLabel: string;
  current?: boolean;
};

/**
 * Interactive CSS bar chart for the monthly spend trend (no dependencies). Bars
 * scale to the largest value; the current month is highlighted, and hovering a
 * bar reveals its value and emphasizes it.
 */
export function TrendChart({ data }: { data: TrendBar[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-44 items-end justify-between gap-2">
      {data.map((d, i) => {
        const active = d.current || hovered === i;
        const showValue = active && d.value > 0;
        return (
          <div
            key={i}
            className="flex h-full flex-1 cursor-default flex-col items-center justify-end gap-1"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className={`text-[10px] tabular-nums ${
                showValue ? "font-medium text-neutral-600 dark:text-neutral-300" : "text-transparent"
              }`}
            >
              {d.valueLabel}
            </span>
            <div
              className={`w-full max-w-10 rounded-t transition-colors ${
                active ? "bg-indigo-600" : "bg-indigo-400/60 dark:bg-indigo-500/50"
              }`}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }}
              title={`${d.label}: ${d.valueLabel}`}
            />
            <span
              className={`text-[11px] capitalize ${
                active
                  ? "font-semibold text-neutral-700 dark:text-neutral-200"
                  : "text-neutral-400"
              }`}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
