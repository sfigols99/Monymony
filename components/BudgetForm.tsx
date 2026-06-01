"use client";

import { useActionState, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  setBudget,
  resetToSalaryBudget,
  clearRecurringBudget,
  type BudgetActionState,
} from "@/app/budget/actions";
import { formatEuro } from "@/lib/format";
import { formatPeriod } from "@/lib/period";
import type { RecurringBudget } from "@/lib/budget";

/**
 * Lets the user set the planned budget for a month, either as a one-off override
 * for that month or as a fixed recurring budget applied to all following months
 * (instead of the salaries). Also reverts a month or clears the recurring one.
 */
export function BudgetForm({
  year,
  month,
  salaryBudget,
  plannedTotal,
  isManual,
  recurringBudget,
}: {
  year: number;
  month: number;
  salaryBudget: number;
  plannedTotal: number;
  isManual: boolean;
  recurringBudget: RecurringBudget | null;
}) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<
    BudgetActionState,
    FormData
  >(setBudget, null);
  const [value, setValue] = useState(String(plannedTotal || ""));
  const [forward, setForward] = useState(false);

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="scope" value={forward ? "forward" : "month"} />
        <div>
          <label htmlFor="total" className="mb-1 block text-sm font-medium">
            {t("manualLabel")}
          </label>
          <input
            id="total"
            name="total"
            type="number"
            min={0}
            step="0.01"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-44 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : t("setBudget")}
        </button>
        <button
          type="button"
          onClick={() => setValue(String(salaryBudget))}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {t("useSalaries", { amount: formatEuro(salaryBudget) })}
        </button>

        <label className="flex w-full items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={forward}
            onChange={(e) => setForward(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            {t("applyForward")}
            <span className="block text-xs text-neutral-400">
              {t("applyForwardHint")}
            </span>
          </span>
        </label>
      </form>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{te(state.error)}</p>
      )}

      {isManual && (
        <form action={resetToSalaryBudget}>
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <button type="submit" className="text-sm text-neutral-500 hover:underline">
            {t("revert")}
          </button>
        </form>
      )}

      {recurringBudget && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800/50">
          <span className="text-neutral-600 dark:text-neutral-300">
            {t("recurringActive", {
              amount: formatEuro(recurringBudget.amount),
              period: formatPeriod(
                recurringBudget.fromYear,
                recurringBudget.fromMonth,
                locale,
              ),
            })}
          </span>
          <form action={clearRecurringBudget}>
            <button type="submit" className="text-red-600 hover:underline">
              {t("clearRecurring")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
