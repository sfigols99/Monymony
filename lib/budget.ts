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

export type SpentByCategory = {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string;
  spent: number;
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

/** A named recurring budget (e.g. "Hipoteca", "Súper"). */
export type Budget = {
  id: string;
  name: string;
  amount: number;
  split: BudgetSplit;
  /** Per-member breakdown for this budget's amount, by its split method. */
  shares: BudgetShare[];
  /** Confirmed spend this month across the budget's categories. */
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
  spentByCategory: SpentByCategory[];
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
 * contributions and spend grouped by category.
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

  // The household's named budgets.
  const { data: budgetRows } = await supabase
    .from("budgets")
    .select("id, name, amount, split")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });

  const budgetDefs = (budgetRows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    amount: Number(r.amount) || 0,
    split: (r.split === "equal" ? "equal" : "proportional") as BudgetSplit,
  }));
  const budgetsTotal = budgetDefs.reduce((sum, b) => sum + b.amount, 0);

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

  const budgets: Budget[] = budgetDefs.map((b) => ({
    ...b,
    shares: shareOf(b.amount, b.split),
    spent: 0,
  }));

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

  // Confirmed expenses in the period, joined with their category.
  const { start, end } = monthRange(year, month);
  const { data: expenseRows } = await supabase
    .from("expenses")
    .select("amount, category_id, categories(name, color, icon, budget_id)")
    .eq("household_id", household.id)
    .eq("status", "confirmed")
    .gte("expense_date", start)
    .lt("expense_date", end);

  type ExpCat = { name: string; color: string; icon: string; budget_id: string | null };
  type ExpRow = {
    amount: number | string;
    category_id: string | null;
    categories: ExpCat[] | ExpCat | null;
  };

  const rows = (expenseRows ?? []) as ExpRow[];
  let spent = 0;
  const byCat = new Map<string, SpentByCategory>();
  const spentByBudget = new Map<string, number>();

  for (const r of rows) {
    const amount = Number(r.amount) || 0;
    spent += amount;
    const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
    if (cat?.budget_id) {
      spentByBudget.set(cat.budget_id, (spentByBudget.get(cat.budget_id) ?? 0) + amount);
    }
    const key = r.category_id ?? "__none__";
    const existing = byCat.get(key);
    if (existing) {
      existing.spent += amount;
    } else {
      byCat.set(key, {
        categoryId: r.category_id,
        name: cat?.name ?? "Sin concepto",
        color: cat?.color ?? "#9ca3af",
        icon: cat?.icon ?? "help",
        spent: amount,
      });
    }
  }

  for (const b of budgets) b.spent = spentByBudget.get(b.id) ?? 0;

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

  const spentByCategory = [...byCat.values()].sort((a, b) => b.spent - a.spent);

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
    spentByCategory,
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
