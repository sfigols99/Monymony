/** One bar in the trend: a (short) label, its value and whether it's current. */
export type TrendBar = { label: string; value: number; valueLabel: string; current?: boolean };

/**
 * A small CSS bar chart for the monthly spend trend (no dependencies,
 * server-rendered). Bars are scaled to the largest value; the current month is
 * highlighted.
 */
export function TrendChart({ data }: { data: TrendBar[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-44 items-end justify-between gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] tabular-nums text-neutral-400">
            {d.value > 0 ? d.valueLabel : ""}
          </span>
          <div
            className={`w-full max-w-10 rounded-t ${
              d.current ? "bg-indigo-600" : "bg-indigo-400/60 dark:bg-indigo-500/50"
            }`}
            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }}
            title={d.valueLabel}
          />
          <span
            className={`text-[11px] capitalize ${
              d.current ? "font-semibold text-neutral-700 dark:text-neutral-200" : "text-neutral-400"
            }`}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
