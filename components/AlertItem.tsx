"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { type Alert } from "@/lib/alerts";
import { deleteAlert, toggleAlert } from "@/app/alerts/actions";
import { formatEuro, formatPercent } from "@/lib/format";
import { AlertForm } from "./AlertForm";
import { type ExpenseOption } from "./ExpenseForm";

/** A single alert rule with toggle, inline edit and delete. */
export function AlertItem({
  alert,
  categories,
}: {
  alert: Alert;
  categories: ExpenseOption[];
}) {
  const t = useTranslations("alerts");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <AlertForm
          categories={categories}
          initial={{
            id: alert.id,
            name: alert.name,
            categoryId: alert.categoryId,
            thresholdPercent: alert.thresholdPercent,
            thresholdAmount: alert.thresholdAmount,
          }}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  const threshold =
    alert.thresholdAmount != null
      ? formatEuro(alert.thresholdAmount)
      : alert.thresholdPercent != null
        ? formatPercent(alert.thresholdPercent)
        : "—";
  const scope = alert.categoryName ?? t("wholeHousehold");

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 dark:border-neutral-800 ${
        alert.isActive ? "border-neutral-200" : "border-neutral-200 opacity-60"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: alert.categoryColor }}
        >
          <span className="material-symbols-rounded text-[22px]">
            {alert.categoryId ? alert.categoryIcon : "notifications"}
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{alert.name}</p>
          <p className="truncate text-xs text-neutral-400">
            {scope} · {t("thresholdLabel", { value: threshold })}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <form action={toggleAlert}>
          <input type="hidden" name="id" value={alert.id} />
          <input type="hidden" name="is_active" value={String(alert.isActive)} />
          <button
            type="submit"
            className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title={alert.isActive ? t("deactivate") : t("activate")}
          >
            {alert.isActive ? t("active") : t("inactive")}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title={tc("edit")}
        >
          <span className="material-symbols-rounded text-[20px]">edit</span>
        </button>
        {confirming ? (
          <form action={deleteAlert} className="flex items-center gap-1">
            <input type="hidden" name="id" value={alert.id} />
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
