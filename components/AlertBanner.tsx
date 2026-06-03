import { getTranslations } from "next-intl/server";
import { formatEuro, formatPercent } from "@/lib/format";
import { type TriggeredAlert } from "@/lib/alerts";

/** Banner listing currently-triggered alerts. Renders nothing when empty. */
export async function AlertBanner({ alerts }: { alerts: TriggeredAlert[] }) {
  if (alerts.length === 0) return null;

  const t = await getTranslations("alerts");

  return (
    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
      <div className="mb-2 flex items-center gap-2 text-red-700 dark:text-red-300">
        <span className="material-symbols-rounded text-[20px]">warning</span>
        <h2 className="text-sm font-semibold">
          {alerts.length === 1
            ? t("bannerOne")
            : t("bannerMany", { count: alerts.length })}
        </h2>
      </div>
      <ul className="space-y-1">
        {alerts.map((a) => (
          <li key={a.id} className="text-sm text-red-700 dark:text-red-300">
            {t("bannerLine", {
              name: a.name,
              scope: a.budgetName ?? a.categoryName ?? t("wholeHousehold"),
              spent: formatEuro(a.spent),
              limit: formatEuro(a.limit),
              percent: formatPercent(a.usedPercent),
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
