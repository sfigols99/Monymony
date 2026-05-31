"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createAlert,
  updateAlert,
  type AlertActionState,
} from "@/app/alerts/actions";
import { type ExpenseOption } from "./ExpenseForm";

export type AlertInitial = {
  id: string;
  name: string;
  categoryId: string | null;
  thresholdPercent: number | null;
  thresholdAmount: number | null;
};

/** Create or edit an alert rule. */
export function AlertForm({
  categories,
  initial,
  onDone,
}: {
  categories: ExpenseOption[];
  initial?: AlertInitial;
  onDone?: () => void;
}) {
  const t = useTranslations("alerts");
  const tc = useTranslations("common");
  const editing = Boolean(initial);
  const action = editing ? updateAlert : createAlert;
  const [state, formAction, pending] = useActionState<
    AlertActionState,
    FormData
  >(action, null);

  const [thresholdType, setThresholdType] = useState<"percent" | "amount">(
    initial?.thresholdAmount != null ? "amount" : "percent",
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      if (!editing) {
        formRef.current?.reset();
        setThresholdType("percent");
      }
      onDone?.();
    }
  }, [state, editing, onDone]);

  const defaultValue =
    initial?.thresholdAmount ?? initial?.thresholdPercent ?? "";

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {editing && <input type="hidden" name="id" value={initial!.id} />}

      <div>
        <label htmlFor="al-name" className="mb-1 block text-sm font-medium">
          {t("name")}
        </label>
        <input
          id="al-name"
          name="name"
          type="text"
          required
          maxLength={60}
          defaultValue={initial?.name ?? ""}
          placeholder={t("namePlaceholder")}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>

      <div>
        <label htmlFor="al-cat" className="mb-1 block text-sm font-medium">
          {t("scope")}
        </label>
        <select
          id="al-cat"
          name="categoryId"
          defaultValue={initial?.categoryId ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="">{t("wholeHousehold")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("threshold")}</label>
        <div className="flex items-center gap-2">
          <input
            name="thresholdValue"
            type="number"
            min={0}
            step={thresholdType === "percent" ? "1" : "0.01"}
            required
            defaultValue={defaultValue}
            placeholder={thresholdType === "percent" ? "80" : "300"}
            className="w-28 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          />
          <select
            name="thresholdType"
            value={thresholdType}
            onChange={(e) => setThresholdType(e.target.value as "percent" | "amount")}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="percent">{t("thresholdPercent")}</option>
            <option value="amount">{t("thresholdAmount")}</option>
          </select>
        </div>
        <p className="mt-1.5 text-xs text-neutral-400">
          {thresholdType === "percent" ? t("hintPercent") : t("hintAmount")}
        </p>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : editing ? tc("saveChanges") : t("create")}
        </button>
        {editing && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {tc("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
