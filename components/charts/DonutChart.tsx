"use client";

import { useState } from "react";

/** Segment of the donut: label, value, color and pre-formatted labels. */
export type DonutSegment = {
  label: string;
  value: number;
  color: string;
  valueLabel: string;
  percentLabel: string;
};

/**
 * Interactive pure-SVG donut chart (no dependencies). Hovering a slice or a
 * legend row dims the others and shows that slice's detail in the center;
 * otherwise the center shows the total.
 */
export function DonutChart({
  segments,
  centerLabel,
  centerValueLabel,
  size = 168,
  thickness = 26,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValueLabel: string;
  size?: number;
  thickness?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const center = hovered != null ? segments[hovered] : null;
  let acc = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              strokeWidth={thickness}
              className="stroke-neutral-100 dark:stroke-neutral-800"
            />
            {total > 0 &&
              segments.map((seg, i) => {
                const len = (seg.value / total) * c;
                const dim = hovered != null && hovered !== i;
                const el = (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${len} ${c - len}`}
                    strokeDashoffset={-acc}
                    opacity={dim ? 0.3 : 1}
                    style={{ cursor: "pointer", transition: "opacity .15s" }}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
                acc += len;
                return el;
              })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {center ? (
            <>
              <span className="max-w-[7rem] truncate text-xs text-neutral-400">
                {center.label}
              </span>
              <span className="text-lg font-bold">{center.valueLabel}</span>
              <span className="text-xs text-neutral-400">{center.percentLabel}</span>
            </>
          ) : (
            <>
              <span className="text-xs text-neutral-400">{centerLabel}</span>
              <span className="text-lg font-bold">{centerValueLabel}</span>
            </>
          )}
        </div>
      </div>

      <ul className="min-w-[12rem] flex-1 space-y-0.5">
        {segments.map((s, i) => (
          <li
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={`flex cursor-default items-center justify-between gap-3 rounded-md px-1.5 py-1 text-sm transition ${
              hovered === i ? "bg-neutral-100 dark:bg-neutral-800" : ""
            } ${hovered != null && hovered !== i ? "opacity-50" : ""}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 text-neutral-500">
              {s.valueLabel}{" "}
              <span className="text-neutral-400">{s.percentLabel}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
