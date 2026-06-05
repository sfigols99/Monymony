"use client";

import { useState } from "react";

/** One point in the trend: a (short) label, its value, a formatted label, current. */
export type TrendBar = {
  label: string;
  value: number;
  valueLabel: string;
  current?: boolean;
};

const W = 600;
const H = 190;
const PAD_X = 28;
const PAD_TOP = 26;
const PAD_BOTTOM = 30;

/**
 * Interactive pure-SVG line chart for the monthly spend trend (no dependencies).
 * Points scale to the largest value; the current month is emphasized, and
 * hovering a month reveals its value with a guide line.
 */
export function TrendChart({ data }: { data: TrendBar[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const n = data.length;
  const max = Math.max(...data.map((d) => d.value), 1);
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const baseY = PAD_TOP + innerH;

  const x = (i: number) => (n > 1 ? PAD_X + (i * innerW) / (n - 1) : W / 2);
  const y = (v: number) => PAD_TOP + innerH - (v / max) * innerH;
  const step = n > 1 ? innerW / (n - 1) : innerW;

  const pts = data.map((d, i) => ({ ...d, cx: x(i), cy: y(d.value) }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.cx} ${p.cy}`).join(" ");
  const area = `M${pts[0].cx} ${baseY} ${pts.map((p) => `L${p.cx} ${p.cy}`).join(" ")} L${pts[n - 1].cx} ${baseY} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="h-auto select-none"
      role="img"
    >
      <path d={area} className="fill-indigo-500/10" />
      <path
        d={line}
        fill="none"
        className="stroke-indigo-500"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {pts.map((p, i) => {
        const active = p.current || hovered === i;
        return (
          <g key={i}>
            {active && (
              <line
                x1={p.cx}
                x2={p.cx}
                y1={PAD_TOP}
                y2={baseY}
                className="stroke-neutral-200 dark:stroke-neutral-700"
                strokeDasharray="3 3"
              />
            )}
            <circle
              cx={p.cx}
              cy={p.cy}
              r={active ? 5 : 3}
              strokeWidth={2}
              className="stroke-indigo-500 fill-white dark:fill-neutral-900"
            />
            {active && p.value > 0 && (
              <text
                x={p.cx}
                y={p.cy - 12}
                textAnchor="middle"
                className="fill-neutral-700 text-[11px] font-medium tabular-nums dark:fill-neutral-200"
              >
                {p.valueLabel}
              </text>
            )}
            <text
              x={p.cx}
              y={H - 10}
              textAnchor="middle"
              className={`text-[11px] capitalize ${
                active ? "fill-neutral-700 font-semibold dark:fill-neutral-200" : "fill-neutral-400"
              }`}
            >
              {p.label}
            </text>
            {/* Transparent hover target spanning this point's column. */}
            <rect
              x={p.cx - step / 2}
              y={0}
              width={step}
              height={H}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          </g>
        );
      })}
    </svg>
  );
}
