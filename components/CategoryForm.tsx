"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createCategory,
  updateCategory,
  type CategoryActionState,
} from "@/app/categories/actions";
import { CATEGORY_COLORS, EXPENSE_ICONS } from "@/lib/icons";
import { IconPicker } from "./IconPicker";
import { ColorPicker } from "./ColorPicker";

export type CategoryInitial = {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthlyLimit: number | null;
};

/**
 * Form to create or edit a category. When `initial` is provided it edits that
 * category; otherwise it creates a new one and resets on success.
 */
export function CategoryForm({
  initial,
  onDone,
}: {
  initial?: CategoryInitial;
  onDone?: () => void;
}) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const editing = Boolean(initial);
  const action = editing ? updateCategory : createCategory;
  const [state, formAction, pending] = useActionState<
    CategoryActionState,
    FormData
  >(action, null);

  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(initial?.icon ?? EXPENSE_ICONS[0]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      if (!editing) {
        formRef.current?.reset();
        setColor(CATEGORY_COLORS[0]);
        setIcon(EXPENSE_ICONS[0]);
      }
      onDone?.();
    }
  }, [state, editing, onDone]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {editing && <input type="hidden" name="id" value={initial!.id} />}
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="icon" value={icon} />

      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: color }}
        >
          <span className="material-symbols-rounded text-[26px]">{icon}</span>
        </span>
        <div className="flex-1">
          <label htmlFor="cat-name" className="mb-1 block text-sm font-medium">
            {t("name")}
          </label>
          <input
            id="cat-name"
            name="name"
            type="text"
            required
            maxLength={50}
            defaultValue={initial?.name ?? ""}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">{t("color")}</label>
        <ColorPicker value={color} onChange={setColor} colors={CATEGORY_COLORS} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">{t("icon")}</label>
        <IconPicker value={icon} onChange={setIcon} color={color} />
      </div>

      <div>
        <label htmlFor="cat-limit" className="mb-1 block text-sm font-medium">
          {t("monthlyLimit")}{" "}
          <span className="font-normal text-neutral-400">— {tc("optional")}</span>
        </label>
        <input
          id="cat-limit"
          name="monthlyLimit"
          type="number"
          min={0}
          step="0.01"
          defaultValue={initial?.monthlyLimit ?? ""}
          placeholder={t("noLimit")}
          className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{te(state.error)}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending
            ? tc("saving")
            : editing
              ? tc("saveChanges")
              : t("create")}
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
