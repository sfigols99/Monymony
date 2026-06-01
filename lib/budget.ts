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

/** Where the effective planned budget comes from, in priority order. */
export type BudgetSource = "manual" | "recurring" | "salary";

/** A household-wide fixed budget that applies from a given month onward. */
export type RecurringBudget = {
  amount: number;
  fromYear: number;
  fromMonth: number;
};

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
  /** The household's recurring fixed budget, if any (regardless of this month). */
  recurringBudget: RecurringBudget | null;
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

  // Household-wide recurring fixed budget (if any).
  const { data: recurring } = await supabase
    .from("recurring_budgets")
    .select("amount, effective_from")
    .eq("household_id", household.id)
    .maybeSingle();

  const salaryBudget = household.totalSalaries;

  let recurringBudget: RecurringBudget | null = null;
  let recurringApplies = false;
  if (recurring) {
    const ef = new Date(recurring.effective_from as string); // YYYY-MM-DD (UTC)
    const fromYear = ef.getUTCFullYear();
    const fromMonth = ef.getUTCMonth() + 1;
    recurringBudget = { amount: Number(recurring.amount) || 0, fromYear, fromMonth };
    recurringApplies =
      year * 12 + (month - 1) >= fromYear * 12 + (fromMonth - 1);
  }

  // Resolve the effective budget: per-month manual > recurring fixed > salary.
  let source: BudgetSource;
  let plannedTotal: number;
  if (stored?.is_manual) {
    source = "manual";
    plannedTotal = Number(stored.total_amount) || 0;
  } else if (recurringBudget && recurringApplies) {
    source = "recurring";
    plannedTotal = recurringBudget.amount;
  } else {
    source = "salary";
    plannedTotal = salaryBudget;
  }
  const isManual = source === "manual";

  // Confirmed expenses in the period, joined with their category.
  const { start, end } = monthRange(year, month);
  const { data: expenseRows } = await supabase
    .from("expenses")
    .select("amount, category_id, categories(name, color, icon)")
    .eq("household_id", household.id)
    .eq("status", "confirmed")
    .gte("expense_date", start)
    .lt("expense_date", end);

  type ExpRow = {
    amount: number | string;
    category_id: string | null;
    categories:
      | { name: string; color: string; icon: string }[]
      | { name: string; color: string; icon: string }
      | null;
  };

  const rows = (expenseRows ?? []) as ExpRow[];
  let spent = 0;
  const byCat = new Map<string, SpentByCategory>();

  for (const r of rows) {
    const amount = Number(r.amount) || 0;
    spent += amount;
    const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
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

  const contributions: MemberContribution[] = household.members.map((m) => ({
    userId: m.userId,
    name: m.fullName || m.email || "Miembro",
    percent: m.contributionPercent,
    amount: (m.contributionPercent / 100) * plannedTotal,
    isCurrentUser: m.userId === household.currentUserId,
  }));

  const spentByCategory = [...byCat.values()].sort((a, b) => b.spent - a.spent);

  return {
    year,
    month,
    salaryBudget,
    plannedTotal,
    source,
    isManual,
    recurringBudget,
    spent,
    remaining: plannedTotal - spent,
    usedPercent: plannedTotal > 0 ? (spent / plannedTotal) * 100 : 0,
    contributions,
    spentByCategory,
  };
}

/** Convenience: load the active household + its budget for a period. */
export async function getActiveBudget(year: number, month: number) {
  const household = await getActiveHousehold();
  if (!household) return null;
  const budget = await getMonthlyBudget(household, year, month);
  return { household, budget };
}
