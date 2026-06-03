import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatPeriod } from "@/lib/period";

/** Previous / next month navigation for the budget page. */
export function MonthNav({ year, month }: { year: number; month: number }) {
  const t = useTranslations("budget");
  const locale = useLocale();
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/budget?year=${prev.year}&month=${prev.month}`}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        aria-label={t("prevMonth")}
      >
        <span className="material-symbols-rounded text-[20px]">chevron_left</span>
      </Link>
      <span className="min-w-44 text-center text-sm font-medium capitalize">
        {formatPeriod(year, month, locale)}
      </span>
      <Link
        href={`/budget?year=${next.year}&month=${next.month}`}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        aria-label={t("nextMonth")}
      >
        <span className="material-symbols-rounded text-[20px]">chevron_right</span>
      </Link>
    </div>
  );
}
