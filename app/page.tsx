import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActiveHousehold } from "@/lib/household";
import { getTriggeredAlerts } from "@/lib/alerts";
import { normalizePeriod } from "@/lib/budget";
import { formatEuro, formatPercent } from "@/lib/format";
import { signOut } from "./login/actions";
import { leaveHousehold } from "./household/actions";
import { SalaryForm } from "@/components/SalaryForm";
import { InviteCode } from "@/components/InviteCode";
import { AlertBanner } from "@/components/AlertBanner";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import {
  PrivacyProvider,
  PrivacyToggle,
  Sensitive,
  ContributionBar,
} from "@/components/Privacy";

export default async function Home() {
  const household = await getActiveHousehold();

  // No household yet → send the user through onboarding.
  if (!household) {
    redirect("/onboarding");
  }

  const t = await getTranslations("home");
  const tc = await getTranslations("common");

  const { year, month } = normalizePeriod();
  const triggered = await getTriggeredAlerts(household, year, month);

  const me = household.members.find((m) => m.userId === household.currentUserId);

  const navCards = [
    { href: "/expenses", icon: "receipt_long", title: t("navExpenses"), desc: t("navExpensesDesc") },
    { href: "/budget", icon: "savings", title: t("navBudget"), desc: t("navBudgetDesc") },
    { href: "/analysis", icon: "monitoring", title: t("navAnalysis"), desc: t("navAnalysisDesc") },
    { href: "/alerts", icon: "notifications", title: t("navAlerts"), desc: t("navAlertsDesc") },
  ];

  return (
    <PrivacyProvider>
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{household.name}</h1>
          <p className="text-sm text-neutral-500">{tc("tagline")}</p>
        </div>
        <div className="flex items-center gap-2">
          <PrivacyToggle />
          <LocaleSwitcher />
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {tc("signOut")}
            </button>
          </form>
        </div>
      </header>

      <AlertBanner alerts={triggered} />

      {/* Budget base + invite code */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">{t("budgetBase")}</p>
          <p className="mt-1 text-2xl font-bold">
            <Sensitive>{formatEuro(household.totalSalaries)}</Sensitive>
          </p>
          <p className="mt-1 text-xs text-neutral-400">{t("perMonth")}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="mb-2 text-sm text-neutral-500">{t("inviteCode")}</p>
          <InviteCode code={household.inviteCode} />
          <p className="mt-2 text-xs text-neutral-400">{t("inviteHint")}</p>
        </div>
      </section>

      {/* Members + contribution percentages */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold">{t("membersTitle")}</h2>
        <ul className="space-y-4">
          {household.members.map((m) => {
            const isOwner = m.userId === household.ownerId;
            const name = m.fullName || m.email || "—";
            return (
              <li key={m.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {name}
                    {isOwner && (
                      <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-normal text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {t("owner")}
                      </span>
                    )}
                    {m.userId === household.currentUserId && (
                      <span className="ml-2 text-xs text-neutral-400">
                        {t("you")}
                      </span>
                    )}
                  </span>
                  <span className="text-neutral-500">
                    <Sensitive>{formatEuro(m.monthlySalary)}</Sensitive> ·{" "}
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      <Sensitive>{formatPercent(m.contributionPercent)}</Sensitive>
                    </span>
                  </span>
                </div>
                <ContributionBar percent={m.contributionPercent} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Edit own salary */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold">{t("salaryTitle")}</h2>
        <SalaryForm
          householdId={household.id}
          currentSalary={me?.monthlySalary ?? 0}
        />
        <p className="mt-3 text-xs text-neutral-400">{t("salaryHint")}</p>
      </section>

      {/* Quick navigation to household features */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        {navCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              <span className="material-symbols-rounded">{card.icon}</span>
            </span>
            <div>
              <p className="font-medium">{card.title}</p>
              <p className="text-xs text-neutral-400">{card.desc}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500">{t("nextHint")}</p>
        <form action={leaveHousehold} className="mt-4">
          <input type="hidden" name="household_id" value={household.id} />
          <button type="submit" className="text-sm text-red-600 hover:underline">
            {t("leaveHousehold")}
          </button>
        </form>
      </section>
    </main>
    </PrivacyProvider>
  );
}
