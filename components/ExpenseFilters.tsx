"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ExpenseOption } from "./ExpenseForm";
import { useLoading } from "./LoadingProvider";

/**
 * Month + budget + payer filters. Navigates by updating the query string so the
 * Server Component re-queries with the new filters.
 */
export function ExpenseFilters({
  year,
  month,
  budgetId,
  paidBy,
  budgets,
  members,
}: {
  year: number;
  month: number;
  budgetId?: string;
  paidBy?: string;
  budgets: ExpenseOption[];
  members: ExpenseOption[];
}) {
  const t = useTranslations("expenses");
  const router = useRouter();
  const { start } = useLoading();

  function navigate(url: string) {
    start();
    router.push(url);
  }

  function go(next: Partial<{ year: number; month: number; budgetId: string; paidBy: string }>) {
    const params = new URLSearchParams();
    params.set("year", String(next.year ?? year));
    params.set("month", String(next.month ?? month));
    const bud = next.budgetId ?? budgetId;
    const payer = next.paidBy ?? paidBy;
    if (bud) params.set("budgetId", bud);
    if (payer) params.set("paidBy", payer);
    navigate(`/expenses?${params.toString()}`);
  }

  // Build a month <input type="month"> value.
  const monthValue = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="f-month" className="mb-1 block text-xs font-medium text-neutral-500">
          {t("filterMonth")}
        </label>
        <input
          id="f-month"
          type="month"
          value={monthValue}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            if (y && m) go({ year: y, month: m });
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <div>
        <label htmlFor="f-bud" className="mb-1 block text-xs font-medium text-neutral-500">
          {t("budget")}
        </label>
        <select
          id="f-bud"
          value={budgetId ?? ""}
          onChange={(e) => go({ budgetId: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="">{t("filterAll")}</option>
          {budgets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-payer" className="mb-1 block text-xs font-medium text-neutral-500">
          {t("filterPayer")}
        </label>
        <select
          id="f-payer"
          value={paidBy ?? ""}
          onChange={(e) => go({ paidBy: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="">{t("filterAll")}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {(budgetId || paidBy) && (
        <button
          type="button"
          onClick={() => navigate(`/expenses?year=${year}&month=${month}`)}
          className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:underline"
        >
          {t("clearFilters")}
        </button>
      )}
    </div>
  );
}
