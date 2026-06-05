"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createBudget,
  updateBudget,
  type BudgetActionState,
} from "@/app/budget/actions";
import type { Budget } from "@/lib/budget";
import { CATEGORY_COLORS } from "@/lib/icons";
import { IconPicker } from "./IconPicker";
import { ColorPicker } from "./ColorPicker";

/**
 * Create or edit a named budget (name + amount + split method). With `initial`
 * it edits; otherwise it creates and resets on success.
 */
export function BudgetLineForm({
  year,
  month,
  initial,
  onDone,
}: {
  year: number;
  month: number;
  initial?: Budget;
  onDone?: () => void;
}) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const editing = Boolean(initial);
  const action = editing ? updateBudget : createBudget;
  const [state, formAction, pending] = useActionState<
    BudgetActionState,
    FormData
  >(action, null);
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [icon, setIcon] = useState(initial?.icon ?? "savings");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      if (!editing) {
        formRef.current?.reset();
        setColor("#6366f1");
        setIcon("savings");
      }
      onDone?.();
    }
  }, [state, editing, onDone]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {editing && <input type="hidden" name="id" value={initial!.id} />}
      <input type="hidden" name="icon" value={icon} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />

      <div className="flex flex-wrap items-end gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: color }}
        >
          <span className="material-symbols-rounded text-[26px]">{icon}</span>
        </span>
        <div className="flex-1 min-w-[10rem]">
          <label htmlFor="b-name" className="mb-1 block text-sm font-medium">
            {t("budgetName")}
          </label>
          <input
            id="b-name"
            name="name"
            type="text"
            required
            maxLength={60}
            defaultValue={initial?.name ?? ""}
            placeholder={t("budgetNamePlaceholder")}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label htmlFor="b-amount" className="mb-1 block text-sm font-medium">
            {t("budgetAmount")}
          </label>
          <input
            id="b-amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={initial?.amount ?? ""}
            placeholder="0,00"
            className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>

      <div>
        <label htmlFor="b-split" className="mb-1 block text-sm font-medium">
          {t("splitLabel")}
        </label>
        <select
          id="b-split"
          name="split"
          defaultValue={initial?.split ?? "proportional"}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="proportional">{t("splitProportional")}</option>
          <option value="equal">{t("splitEqual")}</option>
        </select>
        <p className="mt-1 text-xs text-neutral-400">{t("splitHint")}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">{t("color")}</label>
        <ColorPicker value={color} onChange={setColor} colors={CATEGORY_COLORS} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">{t("icon")}</label>
        <IconPicker value={icon} onChange={setIcon} color={color} />
      </div>

      {editing && (
        <div>
          <label htmlFor="b-scope" className="mb-1 block text-sm font-medium">
            {t("scopeLabel")}
          </label>
          <select
            id="b-scope"
            name="scope"
            defaultValue="forward"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="forward">{t("scopeForward")}</option>
            <option value="month">{t("scopeMonth")}</option>
          </select>
          <p className="mt-1 text-xs text-neutral-400">{t("scopeHint")}</p>
        </div>
      )}

      {state && "error" in state && (
        <p className="text-sm text-red-600">{te(state.error)}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : editing ? tc("saveChanges") : t("addBudget")}
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
