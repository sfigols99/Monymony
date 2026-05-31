"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { type Category } from "@/lib/categories";
import { deleteCategory } from "@/app/categories/actions";
import { formatEuro } from "@/lib/format";
import { CategoryForm } from "./CategoryForm";

/** A single category row with inline edit + delete. */
export function CategoryItem({ category }: { category: Category }) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <CategoryForm
          initial={{
            id: category.id,
            name: category.name,
            color: category.color,
            icon: category.icon,
            monthlyLimit: category.monthlyLimit,
          }}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: category.color }}
        >
          <span className="material-symbols-rounded text-[22px]">
            {category.icon}
          </span>
        </span>
        <div>
          <p className="font-medium">{category.name}</p>
          <p className="text-xs text-neutral-400">
            {category.monthlyLimit != null
              ? t("limitLabel", { amount: formatEuro(category.monthlyLimit) })
              : t("noLimit")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title={tc("edit")}
        >
          <span className="material-symbols-rounded text-[20px]">edit</span>
        </button>
        {confirming ? (
          <form action={deleteCategory} className="flex items-center gap-1">
            <input type="hidden" name="id" value={category.id} />
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
