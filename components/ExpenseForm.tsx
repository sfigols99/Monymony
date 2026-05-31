"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createExpense,
  updateExpense,
  type ExpenseActionState,
} from "@/app/expenses/actions";

export type ExpenseOption = { id: string; label: string };

export type ExpenseInitial = {
  id: string;
  amount: number;
  categoryId: string | null;
  expenseDate: string;
  paidBy: string | null;
  description: string | null;
};

/** Today's date as YYYY-MM-DD in local time. */
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Create or edit an expense. With `initial` it edits; otherwise it creates and
 * resets on success.
 */
export function ExpenseForm({
  categories,
  members,
  initial,
  onDone,
}: {
  categories: ExpenseOption[];
  members: ExpenseOption[];
  initial?: ExpenseInitial;
  onDone?: () => void;
}) {
  const editing = Boolean(initial);
  const action = editing ? updateExpense : createExpense;
  const [state, formAction, pending] = useActionState<
    ExpenseActionState,
    FormData
  >(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      if (!editing) formRef.current?.reset();
      onDone?.();
    }
  }, [state, editing, onDone]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {editing && <input type="hidden" name="id" value={initial!.id} />}

      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="exp-amount" className="mb-1 block text-sm font-medium">
            Importe (€)
          </label>
          <input
            id="exp-amount"
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
        <div>
          <label htmlFor="exp-date" className="mb-1 block text-sm font-medium">
            Fecha
          </label>
          <input
            id="exp-date"
            name="expenseDate"
            type="date"
            required
            defaultValue={initial?.expenseDate ?? todayIso()}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1">
          <label htmlFor="exp-cat" className="mb-1 block text-sm font-medium">
            Concepto
          </label>
          <select
            id="exp-cat"
            name="categoryId"
            defaultValue={initial?.categoryId ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">Sin concepto</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="exp-payer" className="mb-1 block text-sm font-medium">
            Pagado por
          </label>
          <select
            id="exp-payer"
            name="paidBy"
            defaultValue={initial?.paidBy ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="exp-desc" className="mb-1 block text-sm font-medium">
          Descripción{" "}
          <span className="font-normal text-neutral-400">— opcional</span>
        </label>
        <input
          id="exp-desc"
          name="description"
          type="text"
          maxLength={200}
          defaultValue={initial?.description ?? ""}
          placeholder="Compra semanal"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
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
          {pending ? "Guardando…" : editing ? "Guardar cambios" : "Añadir gasto"}
        </button>
        {editing && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
