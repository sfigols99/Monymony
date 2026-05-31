import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveHousehold } from "@/lib/household";
import { getMonthlyBudget, normalizePeriod } from "@/lib/budget";
import { formatEuro, formatPercent } from "@/lib/format";
import { BudgetForm } from "@/components/BudgetForm";
import { MonthNav } from "@/components/MonthNav";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const household = await getActiveHousehold();
  if (!household) {
    redirect("/onboarding");
  }

  const sp = await searchParams;
  const { year, month } = normalizePeriod(
    sp.year ? Number(sp.year) : undefined,
    sp.month ? Number(sp.month) : undefined,
  );

  const budget = await getMonthlyBudget(household, year, month);

  const over = budget.remaining < 0;
  const barColor = over
    ? "bg-red-500"
    : budget.usedPercent >= 80
      ? "bg-amber-500"
      : "bg-indigo-500";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-neutral-500 hover:text-indigo-600">
            ← {household.name}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Presupuesto</h1>
          <p className="text-sm text-neutral-500">
            Planificación mensual del hogar.
          </p>
        </div>
        <MonthNav year={year} month={month} />
      </header>

      {/* Summary: budget vs spent */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">Presupuesto del mes</p>
            <p className="text-3xl font-bold">{formatEuro(budget.plannedTotal)}</p>
            <p className="mt-1 text-xs text-neutral-400">
              {budget.isManual ? (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  manual
                </span>
              ) : (
                "derivado de los salarios"
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500">Gastado</p>
            <p className="text-xl font-semibold">{formatEuro(budget.spent)}</p>
            <p className={`mt-1 text-sm font-medium ${over ? "text-red-600" : "text-neutral-500"}`}>
              {over
                ? `${formatEuro(Math.abs(budget.remaining))} de más`
                : `${formatEuro(budget.remaining)} disponible`}
            </p>
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${Math.min(budget.usedPercent, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-neutral-400">
          {formatPercent(budget.usedPercent)} usado
        </p>
      </section>

      {/* Manual override */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-1 text-lg font-semibold">Ajustar presupuesto</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Por defecto es la suma de salarios ({formatEuro(budget.salaryBudget)}).
          Puedes fijar un importe manual para este mes.
        </p>
        <BudgetForm
          year={year}
          month={month}
          salaryBudget={budget.salaryBudget}
          plannedTotal={budget.plannedTotal}
          isManual={budget.isManual}
        />
      </section>

      {/* Contributions per member */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold">Aportación por miembro</h2>
        {budget.salaryBudget === 0 ? (
          <p className="text-sm text-neutral-400">
            Añade los salarios de los miembros para repartir el presupuesto.
          </p>
        ) : (
          <ul className="space-y-3">
            {budget.contributions.map((c) => (
              <li key={c.userId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {c.name}
                    {c.isCurrentUser && (
                      <span className="ml-2 text-xs text-neutral-400">(tú)</span>
                    )}
                  </span>
                  <span className="text-neutral-500">
                    {formatEuro(c.amount)} ·{" "}
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {formatPercent(c.percent)}
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${c.percent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Spend by category */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold">Gasto por concepto</h2>
        {budget.spentByCategory.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Aún no hay gastos confirmados este mes.
          </p>
        ) : (
          <ul className="space-y-2">
            {budget.spentByCategory.map((c) => (
              <li
                key={c.categoryId ?? "none"}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    <span className="material-symbols-rounded text-[20px]">
                      {c.icon}
                    </span>
                  </span>
                  <span className="text-sm font-medium">{c.name}</span>
                </div>
                <span className="text-sm font-semibold">
                  {formatEuro(c.spent)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
