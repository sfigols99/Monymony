"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ExpenseOption } from "./ExpenseForm";

/**
 * Month + category + payer filters. Navigates by updating the query string so
 * the Server Component re-queries with the new filters.
 */
export function ExpenseFilters({
  year,
  month,
  categoryId,
  paidBy,
  categories,
  members,
}: {
  year: number;
  month: number;
  categoryId?: string;
  paidBy?: string;
  categories: ExpenseOption[];
  members: ExpenseOption[];
}) {
  const t = useTranslations("expenses");
  const router = useRouter();

  function go(next: Partial<{ year: number; month: number; categoryId: string; paidBy: string }>) {
    const params = new URLSearchParams();
    params.set("year", String(next.year ?? year));
    params.set("month", String(next.month ?? month));
    const cat = next.categoryId ?? categoryId;
    const payer = next.paidBy ?? paidBy;
    if (cat) params.set("categoryId", cat);
    if (payer) params.set("paidBy", payer);
    router.push(`/expenses?${params.toString()}`);
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
        <label htmlFor="f-cat" className="mb-1 block text-xs font-medium text-neutral-500">
          {t("filterCategory")}
        </label>
        <select
          id="f-cat"
          value={categoryId ?? ""}
          onChange={(e) => go({ categoryId: e.target.value })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="">{t("filterAll")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
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
      {(categoryId || paidBy) && (
        <button
          type="button"
          onClick={() => router.push(`/expenses?year=${year}&month=${month}`)}
          className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:underline"
        >
          {t("clearFilters")}
        </button>
      )}
    </div>
  );
}
