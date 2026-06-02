"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Budget } from "@/lib/budget";
import { deleteBudget } from "@/app/budget/actions";
import { formatEuro, formatPercent } from "@/lib/format";
import { BudgetLineForm } from "./BudgetLineForm";

/** A row in the named-budgets list: name, split badge, amount, edit/delete. */
export function BudgetItem({ budget }: { budget: Budget }) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
        <BudgetLineForm initial={budget} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{budget.name}</p>
          <span
            className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-xs ${
              budget.split === "equal"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
            }`}
          >
            {budget.split === "equal" ? t("splitEqual") : t("splitProportional")}
          </span>
          <span className="ml-2 text-xs text-neutral-400">
            {t("spentOf", {
              spent: formatEuro(budget.spent),
              amount: formatEuro(budget.amount),
            })}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 text-sm font-semibold">
            {formatEuro(budget.amount)}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title={tc("edit")}
          >
            <span className="material-symbols-rounded text-[20px]">edit</span>
          </button>
          {confirming ? (
            <form action={deleteBudget} className="flex items-center gap-1">
              <input type="hidden" name="id" value={budget.id} />
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-700"
              >
                {tc("confirmDelete")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:underline"
              >
                {tc("no")}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
              title={tc("delete")}
            >
              <span className="material-symbols-rounded text-[20px]">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Per-member breakdown for this budget */}
      {budget.amount > 0 && budget.shares.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-2 dark:border-neutral-800">
          {budget.shares.map((s) => (
            <li
              key={s.userId}
              className="flex items-center justify-between text-xs text-neutral-500"
            >
              <span>
                {s.name}
                {s.isCurrentUser && (
                  <span className="ml-1 text-neutral-400">{t("you")}</span>
                )}
              </span>
              <span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {formatEuro(s.amount)}
                </span>{" "}
                <span className="text-neutral-400">
                  {formatPercent(
                    budget.amount > 0 ? (s.amount / budget.amount) * 100 : 0,
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
