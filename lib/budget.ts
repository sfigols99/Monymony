import { createClient } from "@/lib/supabase/server";
import { getActiveHousehold, type ActiveHousehold } from "@/lib/household";

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

export type MonthlyBudget = {
  year: number;
  month: number;
  /** Sum of member salaries — the automatic budget base. */
  salaryBudget: number;
  /** The planned total actually in effect (manual override or salaryBudget). */
  plannedTotal: number;
  /** True when a manual override is stored for this month. */
  isManual: boolean;
  /** Total confirmed spending this month. */
  spent: number;
  remaining: number;
  /** spent / plannedTotal, 0–100 (or 0 when no budget). */
  usedPercent: number;
  contributions: MemberContribution[];
  spentByCategory: SpentByCategory[];
};

/** Clamp a possibly-invalid month/year to a sane range, defaulting to now. */
export function normalizePeriod(year?: number, month?: number) {
  const now = new Date();
  const y = Number.isFinite(year) && year! >= 2000 && year! <= 2100 ? year! : now.getFullYear();
  const m = Number.isFinite(month) && month! >= 1 && month! <= 12 ? month! : now.getMonth() + 1;
  return { year: y, month: m };
}

/** "mayo de 2026" / "May 2026" / "maig de 2026" — formatted for the locale. */
export function formatPeriod(
  year: number,
  month: number,
  locale = "es",
): string {
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(d);
}

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

  // Stored override (if any) for this period.
  const { data: stored } = await supabase
    .from("monthly_budgets")
    .select("total_amount, is_manual")
    .eq("household_id", household.id)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  const salaryBudget = household.totalSalaries;
  const isManual = Boolean(stored?.is_manual);
  const plannedTotal = isManual ? Number(stored!.total_amount) || 0 : salaryBudget;

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
    isManual,
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
