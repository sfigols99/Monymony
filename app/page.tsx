import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveHousehold } from "@/lib/household";
import { formatEuro, formatPercent } from "@/lib/format";
import { signOut } from "./login/actions";
import { leaveHousehold } from "./household/actions";
import { SalaryForm } from "@/components/SalaryForm";
import { InviteCode } from "@/components/InviteCode";

export default async function Home() {
  const household = await getActiveHousehold();

  // No household yet → send the user through onboarding.
  if (!household) {
    redirect("/onboarding");
  }

  const me = household.members.find((m) => m.userId === household.currentUserId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{household.name}</h1>
          <p className="text-sm text-neutral-500">Gastos compartidos del hogar</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      {/* Budget base + invite code */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">
            Presupuesto base (suma de salarios)
          </p>
          <p className="mt-1 text-2xl font-bold">
            {formatEuro(household.totalSalaries)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">al mes</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="mb-2 text-sm text-neutral-500">Código de invitación</p>
          <InviteCode code={household.inviteCode} />
          <p className="mt-2 text-xs text-neutral-400">
            Compártelo para que otros se unan al hogar.
          </p>
        </div>
      </section>

      {/* Members + contribution percentages */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold">Miembros y aportación</h2>
        <ul className="space-y-4">
          {household.members.map((m) => {
            const isOwner = m.userId === household.ownerId;
            const name = m.fullName || m.email || "Miembro";
            return (
              <li key={m.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {name}
                    {isOwner && (
                      <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-normal text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        owner
                      </span>
                    )}
                    {m.userId === household.currentUserId && (
                      <span className="ml-2 text-xs text-neutral-400">(tú)</span>
                    )}
                  </span>
                  <span className="text-neutral-500">
                    {formatEuro(m.monthlySalary)} ·{" "}
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {formatPercent(m.contributionPercent)}
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${m.contributionPercent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Edit own salary */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold">Tu salario</h2>
        <SalaryForm
          householdId={household.id}
          currentSalary={me?.monthlySalary ?? 0}
        />
        <p className="mt-3 text-xs text-neutral-400">
          El porcentaje de aportación de cada miembro se calcula a partir de los
          salarios.
        </p>
      </section>

      {/* Quick navigation to household features */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/expenses"
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <span className="material-symbols-rounded">receipt_long</span>
          </span>
          <div>
            <p className="font-medium">Gastos</p>
            <p className="text-xs text-neutral-400">
              Registra y consulta los gastos del hogar
            </p>
          </div>
        </Link>
        <Link
          href="/budget"
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <span className="material-symbols-rounded">savings</span>
          </span>
          <div>
            <p className="font-medium">Presupuesto</p>
            <p className="text-xs text-neutral-400">
              Planificación mensual y aportaciones
            </p>
          </div>
        </Link>
        <Link
          href="/categories"
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <span className="material-symbols-rounded">category</span>
          </span>
          <div>
            <p className="font-medium">Conceptos</p>
            <p className="text-xs text-neutral-400">
              Categorías de gasto con color e icono
            </p>
          </div>
        </Link>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500">
          🚧 Siguiente: alertas de sobregasto y lectura de tickets por OCR
          (ver <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">ROADMAP.md</code>).
        </p>
        <form action={leaveHousehold} className="mt-4">
          <input type="hidden" name="household_id" value={household.id} />
          <button
            type="submit"
            className="text-sm text-red-600 hover:underline"
          >
            Salir del hogar
          </button>
        </form>
      </section>
    </main>
  );
}
