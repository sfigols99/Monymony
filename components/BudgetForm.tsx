"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  setManualBudget,
  resetToSalaryBudget,
  type BudgetActionState,
} from "@/app/budget/actions";
import { formatEuro } from "@/lib/format";

/**
 * Lets the user override the salary-derived budget for a month, or revert to
 * it. Shows the salary base as a hint / quick-fill.
 */
export function BudgetForm({
  year,
  month,
  salaryBudget,
  plannedTotal,
  isManual,
}: {
  year: number;
  month: number;
  salaryBudget: number;
  plannedTotal: number;
  isManual: boolean;
}) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, formAction, pending] = useActionState<
    BudgetActionState,
    FormData
  >(setManualBudget, null);
  const [value, setValue] = useState(String(plannedTotal || ""));

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
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
    </div>
  );
}
