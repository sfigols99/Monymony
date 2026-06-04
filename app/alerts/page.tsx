import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActiveHousehold } from "@/lib/household";
import { getCategories } from "@/lib/categories";
import { getAlerts, getTriggeredAlerts } from "@/lib/alerts";
import { normalizePeriod, getBudgets } from "@/lib/budget";
import { AlertForm } from "@/components/AlertForm";
import { AlertItem } from "@/components/AlertItem";
import { AlertBanner } from "@/components/AlertBanner";
import { type ExpenseOption } from "@/components/ExpenseForm";

export default async function AlertsPage() {
  const household = await getActiveHousehold();
  if (!household) {
    redirect("/onboarding");
  }

  const t = await getTranslations("alerts");
  const { year, month } = normalizePeriod();
  const [categories, budgets, alerts, triggered] = await Promise.all([
    getCategories(household.id),
    getBudgets(household.id),
    getAlerts(household.id),
    getTriggeredAlerts(household, year, month),
  ]);

  const categoryOptions: ExpenseOption[] = categories.map((c) => ({
    id: c.id,
    label: c.name,
  }));
  const budgetOptions: ExpenseOption[] = budgets.map((b) => ({
    id: b.id,
    label: b.name,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <Link href="/" className="text-sm text-neutral-500 hover:text-indigo-600">
          ← {household.name}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("subtitle")}</p>
      </header>

      <AlertBanner alerts={triggered} />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold">{t("newTitle")}</h2>
          <AlertForm categories={categoryOptions} budgets={budgetOptions} />
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold">
            {t("yoursTitle")}{" "}
            <span className="text-sm font-normal text-neutral-400">
              ({alerts.length})
            </span>
          </h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-neutral-400">{t("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <AlertItem
                  key={a.id}
                  alert={a}
                  categories={categoryOptions}
                  budgets={budgetOptions}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
