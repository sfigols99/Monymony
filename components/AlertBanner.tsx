import { formatEuro, formatPercent } from "@/lib/format";
import { type TriggeredAlert } from "@/lib/alerts";

/** Banner listing currently-triggered alerts. Renders nothing when empty. */
export function AlertBanner({ alerts }: { alerts: TriggeredAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
      <div className="mb-2 flex items-center gap-2 text-red-700 dark:text-red-300">
        <span className="material-symbols-rounded text-[20px]">warning</span>
        <h2 className="text-sm font-semibold">
          {alerts.length === 1
            ? "1 alerta activada"
            : `${alerts.length} alertas activadas`}
        </h2>
      </div>
      <ul className="space-y-1">
        {alerts.map((a) => (
          <li key={a.id} className="text-sm text-red-700 dark:text-red-300">
            <span className="font-medium">{a.name}</span> —{" "}
            {a.categoryName ?? "Todo el hogar"}: {formatEuro(a.spent)} de{" "}
            {formatEuro(a.limit)} ({formatPercent(a.usedPercent)})
          </li>
        ))}
      </ul>
    </div>
  );
}
