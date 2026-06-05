import { createClient } from "@/lib/supabase/server";
import { getActiveHousehold, type ActiveHousehold } from "@/lib/household";
import { normalizePeriod, formatPeriod } from "@/lib/period";

// Re-exported so existing server-side imports (`from "@/lib/budget"`) keep
// working. Client Components must import these from "@/lib/period" instead.
export { normalizePeriod, formatPeriod };

export type MemberContribution = {
  userId: string;
  name: string;
  percent: number; // 0–100, salary-derived
  amount: number; // share of the planned budget, in euros
  isCurrentUser: boolean;
};

/** How a budget's amount is divided among household members. */
export type BudgetSplit = "equal" | "proportional";

/** One member's share of a budget. */
export type BudgetShare = {
  userId: string;
  name: string;
  amount: number; // euros
  isCurrentUser: boolean;
};

/** A named recurring budget (e.g. "Hipoteca", "Súper"); also an expense concept. */
export type Budget = {
  id: string;
  name: string;
  amount: number;
  split: BudgetSplit;
  icon: string;
  color: string;
  /** Per-member breakdown for this budget's amount, by its split method. */
  shares: BudgetShare[];
  /** Confirmed spend this month assigned to the budget. */
  spent: number;
};

/** Where the effective planned total comes from, in priority order. */
export type BudgetSource = "manual" | "budgets" | "salary";

export type MonthlyBudget = {
  year: number;
  month: number;
  /** Sum of member salaries — the automatic budget base. */
  salaryBudget: number;
  /** The planned total actually in effect. */
  plannedTotal: number;
  /** What the planned total is derived from for this month. */
  source: BudgetSource;
  /** True when a per-month manual override is stored for this month. */
  isManual: boolean;
  /** The household's named budgets (regardless of this month's override). */
  budgets: Budget[];
  /** Total confirmed spending this month. */
  spent: number;
  remaining: number;
  /** spent / plannedTotal, 0–100 (or 0 when no budget). */
  usedPercent: number;
  contributions: MemberContribution[];
};

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 1); // first day of next month
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;
  return { start, end };
}

/**
 * Build the monthly budget snapshot for a household: planned total (manual
 * override or salary-derived), confirmed spending, remaining, per-member
 * contributions and per-budget spend.
 */
export async function getMonthlyBudget(
  household: ActiveHousehold,
  year: number,
  month: number,
): Promise<MonthlyBudget> {
  const supabase = await createClient();

  // Per-month manual override (if any) for this period.
  const { data: stored } = await supabase
    .from("monthly_budgets")
    .select("total_amount, is_manual")
    .eq("household_id", household.id)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  // Budget identities — the amount is effective-dated (see budget_amounts).
  const { data: budgetRows } = await supabase
    .from("budgets")
    .select("id, name, split, icon, color")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });

  const identities = (budgetRows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    split: (r.split === "equal" ? "equal" : "proportional") as BudgetSplit,
    icon: (r.icon as string) || "savings",
    color: (r.color as string) || "#6366f1",
  }));

  // Effective amount per budget = the latest version on/before this month.
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const amountByBudget = new Map<string, number>();
  if (identities.length > 0) {
    const { data: versions } = await supabase
      .from("budget_amounts")
      .select("budget_id, effective_from, amount")
      .in("budget_id", identities.map((b) => b.id))
      .lte("effective_from", firstDay)
      .order("effective_from", { ascending: true });
    for (const v of (versions ?? []) as {
      budget_id: string;
      amount: number | string;
    }[]) {
      // Ascending order → the last write wins = the latest effective version.
      amountByBudget.set(v.budget_id, Number(v.amount) || 0);
    }
  }

  const salaryBudget = household.totalSalaries;
  const members = household.members;
  const memberCount = members.length || 1;

  /** Split an amount across members by the given method. */
  const shareOf = (amount: number, split: BudgetSplit): BudgetShare[] =>
    members.map((m) => {
      // Fall back to an equal split when there are no salaries to weigh by.
      const amt =
        split === "equal" || salaryBudget <= 0
          ? amount / memberCount
          : (m.monthlySalary / salaryBudget) * amount;
      return {
        userId: m.userId,
        name: m.fullName || m.email || "—",
        amount: amt,
        isCurrentUser: m.userId === household.currentUserId,
      };
    });

  // Confirmed expenses in the period, summed per budget (the concept).
  const { start, end } = monthRange(year, month);
  const { data: expenseRows } = await supabase
    .from("expenses")
    .select("amount, budget_id")
    .eq("household_id", household.id)
    .eq("status", "confirmed")
    .gte("expense_date", start)
    .lt("expense_date", end);

  type ExpRow = { amount: number | string; budget_id: string | null };

  const rows = (expenseRows ?? []) as ExpRow[];
  let spent = 0;
  const spentByBudget = new Map<string, number>();

  for (const r of rows) {
    const amount = Number(r.amount) || 0;
    spent += amount;
    if (r.budget_id) {
      spentByBudget.set(r.budget_id, (spentByBudget.get(r.budget_id) ?? 0) + amount);
    }
  }

  // A budget shows for this month if it's active (effective amount > 0) or has
  // any spend; its amount is the effective version (0 when not yet active).
  const budgets: Budget[] = identities
    .map((b) => {
      const amount = amountByBudget.get(b.id) ?? 0;
      const sp = spentByBudget.get(b.id) ?? 0;
      return { ...b, amount, spent: sp, shares: shareOf(amount, b.split) };
    })
    .filter((b) => b.amount > 0 || b.spent > 0);

  const budgetsTotal = budgets.reduce((sum, b) => sum + b.amount, 0);

  // Resolve the effective total: per-month manual override > named budgets > salary.
  let source: BudgetSource;
  let plannedTotal: number;
  if (stored?.is_manual) {
    source = "manual";
    plannedTotal = Number(stored.total_amount) || 0;
  } else if (budgets.length > 0) {
    source = "budgets";
    plannedTotal = budgetsTotal;
  } else {
    source = "salary";
    plannedTotal = salaryBudget;
  }
  const isManual = source === "manual";

  // Per-member contributions: sum each member's share across all budgets.
  // "manual"/"salary" totals are treated as a single proportional budget.
  const aggregateShares =
    source === "budgets"
      ? budgets.flatMap((b) => b.shares)
      : shareOf(plannedTotal, "proportional");

  const totalsByUser = new Map<string, number>(members.map((m) => [m.userId, 0]));
  for (const s of aggregateShares) {
    totalsByUser.set(s.userId, (totalsByUser.get(s.userId) ?? 0) + s.amount);
  }

  const contributions: MemberContribution[] = members.map((m) => {
    const amount = totalsByUser.get(m.userId) ?? 0;
    return {
      userId: m.userId,
      name: m.fullName || m.email || "—",
      percent: plannedTotal > 0 ? (amount / plannedTotal) * 100 : 0,
      amount,
      isCurrentUser: m.userId === household.currentUserId,
    };
  });

  return {
    year,
    month,
    salaryBudget,
    plannedTotal,
    source,
    isManual,
    budgets,
    spent,
    remaining: plannedTotal - spent,
    usedPercent: plannedTotal > 0 ? (spent / plannedTotal) * 100 : 0,
    contributions,
  };
}

/** Lightweight list of a household's budgets (id + name), for form pickers. */
export async function getBudgets(
  householdId: string,
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("budgets")
    .select("id, name")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as { id: string; name: string }[]).map((r) => ({
    id: r.id,
    name: r.name,
  }));
}

/** Convenience: load the active household + its budget for a period. */
export async function getActiveBudget(year: number, month: number) {
  const household = await getActiveHousehold();
  if (!household) return null;
  const budget = await getMonthlyBudget(household, year, month);
  return { household, budget };
}
