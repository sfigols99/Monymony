import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getActiveHousehold } from "@/lib/household";
import { getCategories } from "@/lib/categories";
import { getExpenses } from "@/lib/expenses";
import { normalizePeriod, formatPeriod } from "@/lib/budget";
import { formatEuro } from "@/lib/format";
import { type ExpenseOption } from "@/components/ExpenseForm";
import { NewExpense } from "@/components/NewExpense";
import { ExpenseItem } from "@/components/ExpenseItem";
import { ExpenseFilters } from "@/components/ExpenseFilters";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    categoryId?: string;
    paidBy?: string;
  }>;
}) {
  const household = await getActiveHousehold();
  if (!household) {
    redirect("/onboarding");
  }

  const t = await getTranslations("expenses");
  const locale = await getLocale();

  const sp = await searchParams;
  const { year, month } = normalizePeriod(
    sp.year ? Number(sp.year) : undefined,
    sp.month ? Number(sp.month) : undefined,
  );

  const [categories, expenses] = await Promise.all([
    getCategories(household.id),
    getExpenses(household.id, {
      year,
      month,
      categoryId: sp.categoryId || undefined,
      paidBy: sp.paidBy || undefined,
    }),
  ]);

  const categoryOptions: ExpenseOption[] = categories.map((c) => ({
    id: c.id,
    label: c.name,
  }));
  const memberOptions: ExpenseOption[] = household.members.map((m) => ({
    id: m.userId,
    label: m.fullName || m.email || "—",
  }));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-neutral-500 hover:text-indigo-600">
            ← {household.name}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm capitalize text-neutral-500">
            {formatPeriod(year, month, locale)}
          </p>
        </div>
        <Link
          href={`/budget?year=${year}&month=${month}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {t("viewBudget")}
        </Link>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* New expense */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold">{t("newTitle")}</h2>
          {categoryOptions.length === 0 && (
            <p className="mb-3 text-sm text-amber-600">
              {t("noCategoriesWarn")}{" "}
              <Link href="/categories" className="underline">
                {t("createSome")}
              </Link>
            </p>
          )}
          <NewExpense
            categories={categoryOptions}
            members={memberOptions}
            householdId={household.id}
          />
        </section>

        {/* List + filters */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">
              {t("movements")}{" "}
              <span className="text-sm font-normal text-neutral-400">
                ({expenses.length})
              </span>
            </h2>
            <span className="text-sm font-semibold">{formatEuro(total)}</span>
          </div>

          <div className="mb-4">
            <ExpenseFilters
              year={year}
              month={month}
              categoryId={sp.categoryId || undefined}
              paidBy={sp.paidBy || undefined}
              categories={categoryOptions}
              members={memberOptions}
            />
          </div>

          {expenses.length === 0 ? (
            <p className="text-sm text-neutral-400">{t("emptyFiltered")}</p>
          ) : (
            <ul className="space-y-2">
              {expenses.map((e) => (
                <ExpenseItem
                  key={e.id}
                  expense={e}
                  categories={categoryOptions}
                  members={memberOptions}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
