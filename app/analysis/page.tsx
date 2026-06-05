import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActiveHousehold } from "@/lib/household";
import { getMonthlyBudget, normalizePeriod } from "@/lib/budget";
import { formatEuro, formatPercent } from "@/lib/format";
import { MonthNav } from "@/components/MonthNav";

/** Tailwind color for a usage bar: red over budget, amber near it, else indigo. */
function barColor(usedPercent: number, over: boolean) {
  if (over) return "bg-red-500";
  if (usedPercent >= 80) return "bg-amber-500";
  return "bg-indigo-500";
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const household = await getActiveHousehold();
  if (!household) {
    redirect("/onboarding");
  }

  const t = await getTranslations("analysis");
  const tb = await getTranslations("budget");

  const sp = await searchParams;
  const { year, month } = normalizePeriod(
    sp.year ? Number(sp.year) : undefined,
    sp.month ? Number(sp.month) : undefined,
  );

  const budget = await getMonthlyBudget(household, year, month);

  const overallOver = budget.remaining < 0;
  const budgetedSpent = budget.budgets.reduce((s, b) => s + b.spent, 0);
  const unbudgeted = budget.spent - budgetedSpent;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-neutral-500 hover:text-indigo-600">
            ← {household.name}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        <MonthNav year={year} month={month} basePath="/analysis" />
      </header>

      {/* Overall: sum of budgets vs spent */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold">{t("overallTitle")}</h2>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">{tb("spent")}</p>
            <p className="text-3xl font-bold">
              {formatEuro(budget.spent)}{" "}
              <span className="text-base font-normal text-neutral-400">
                / {formatEuro(budget.plannedTotal)}
              </span>
            </p>
          </div>
          <p
            className={`text-sm font-medium ${overallOver ? "text-red-600" : "text-emerald-600"}`}
          >
            {overallOver
              ? tb("over", { amount: formatEuro(Math.abs(budget.remaining)) })
              : tb("available", { amount: formatEuro(budget.remaining) })}
          </p>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className={`h-full rounded-full ${barColor(budget.usedPercent, overallOver)}`}
            style={{ width: `${Math.min(budget.usedPercent, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-neutral-400">
          {tb("used", { percent: formatPercent(budget.usedPercent) })}
        </p>
      </section>

      {/* Per-budget balance */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold">{t("perBudgetTitle")}</h2>

        {budget.budgets.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("empty")}</p>
        ) : (
          <ul className="space-y-4">
            {budget.budgets.map((b) => {
              const over = b.spent > b.amount;
              const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : b.spent > 0 ? 100 : 0;
              const remaining = b.amount - b.spent;
              return (
                <li key={b.id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: b.color }}
                      >
                        <span className="material-symbols-rounded text-[16px]">
                          {b.icon}
                        </span>
                      </span>
                      <span className="truncate font-medium">{b.name}</span>
                    </span>
                    <span className="shrink-0 text-neutral-500">
                      {formatEuro(b.spent)}{" "}
                      <span className="text-neutral-400">/ {formatEuro(b.amount)}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-full ${barColor(pct, over)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p
                    className={`mt-1 text-right text-xs ${over ? "text-red-600" : "text-neutral-400"}`}
                  >
                    {over
                      ? tb("over", { amount: formatEuro(Math.abs(remaining)) })
                      : tb("available", { amount: formatEuro(remaining) })}
                  </p>
                </li>
              );
            })}

            {unbudgeted > 0.005 && (
              <li className="flex items-center justify-between border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
                <span className="text-neutral-500">{t("unbudgeted")}</span>
                <span className="font-medium">{formatEuro(unbudgeted)}</span>
              </li>
            )}
          </ul>
        )}
      </section>
    </main>
  );
}
