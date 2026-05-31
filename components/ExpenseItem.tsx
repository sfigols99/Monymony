"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { type Expense } from "@/lib/expenses";
import { deleteExpense } from "@/app/expenses/actions";
import { formatEuro } from "@/lib/format";
import { ExpenseForm, type ExpenseOption } from "./ExpenseForm";

/** Short date like "12 may" formatted for the given locale. */
function shortDate(iso: string, locale: string) {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
}

/** A single expense row with inline edit + delete. */
export function ExpenseItem({
  expense,
  categories,
  members,
}: {
  expense: Expense;
  categories: ExpenseOption[];
  members: ExpenseOption[];
}) {
  const t = useTranslations("expenses");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <ExpenseForm
          categories={categories}
          members={members}
          initial={{
            id: expense.id,
            amount: expense.amount,
            categoryId: expense.categoryId,
            expenseDate: expense.expenseDate,
            paidBy: expense.paidById,
            description: expense.description,
          }}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: expense.categoryColor }}
        >
          <span className="material-symbols-rounded text-[22px]">
            {expense.categoryIcon}
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">
            {expense.description || expense.categoryName || t("fallbackName")}
          </p>
          <p className="truncate text-xs text-neutral-400">
            {shortDate(expense.expenseDate, locale)}
            {expense.categoryName && ` · ${expense.categoryName}`}
            {expense.paidByName && ` · ${expense.paidByName}`}
            {expense.status === "pending" && (
              <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {t("pending")}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="font-semibold">{formatEuro(expense.amount)}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title={tc("edit")}
        >
          <span className="material-symbols-rounded text-[20px]">edit</span>
        </button>
        {confirming ? (
          <form action={deleteExpense} className="flex items-center gap-1">
            <input type="hidden" name="id" value={expense.id} />
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
    </li>
  );
}
