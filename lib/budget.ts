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

/** A named recurring budget (e.g. "Hipoteca", "Súper"). */
export type Budget = {
  id: string;
  name: string;
  amount: number;
  split: BudgetSplit;
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

  const budgets: Budget[] = (budgetRows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    amount: Number(r.amount) || 0,
    split: r.split === "equal" ? "equal" : "proportional",
  }));
  const budgetsTotal = budgets.reduce((sum, b) => sum + b.amount, 0);

  const salaryBudget = household.totalSalaries;

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

  // Per-member contributions. Each budget is split by its own method; "manual"
  // and "salary" totals are treated as a single proportional budget.
  const members = household.members;
  const memberCount = members.length || 1;
  const totalsByUser = new Map<string, number>(members.map((m) => [m.userId, 0]));

  const addShares = (amount: number, split: BudgetSplit) => {
    if (amount <= 0) return;
    // Fall back to an equal split if there are no salaries to weigh by.
    if (split === "equal" || salaryBudget <= 0) {
      const per = amount / memberCount;
      for (const m of members) {
        totalsByUser.set(m.userId, (totalsByUser.get(m.userId) ?? 0) + per);
      }
    } else {
      for (const m of members) {
        const share = (m.monthlySalary / salaryBudget) * amount;
        totalsByUser.set(m.userId, (totalsByUser.get(m.userId) ?? 0) + share);
      }
    }
  };

  if (source === "budgets") {
    for (const b of budgets) addShares(b.amount, b.split);
  } else {
    addShares(plannedTotal, "proportional");
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

/** Convenience: load the active household + its budget for a period. */
export async function getActiveBudget(year: number, month: number) {
  const household = await getActiveHousehold();
  if (!household) return null;
  const budget = await getMonthlyBudget(household, year, month);
  return { household, budget };
}
