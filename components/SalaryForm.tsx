"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateSalary, type ActionState } from "@/app/household/actions";

export function SalaryForm({
  householdId,
  currentSalary,
}: {
  householdId: string;
  currentSalary: number;
}) {
  const t = useTranslations("salary");
  const tc = useTranslations("common");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateSalary,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="household_id" value={householdId} />
      <div>
        <label htmlFor="salary" className="mb-1 block text-sm font-medium">
          {t("label")}
        </label>
        <input
          id="salary"
          name="salary"
          type="number"
          min={0}
          step="0.01"
          defaultValue={currentSalary || ""}
          placeholder="0,00"
          className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? tc("saving") : tc("save")}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
