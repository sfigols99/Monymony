import { createClient } from "@/lib/supabase/server";

export type Expense = {
  id: string;
  amount: number;
  description: string | null;
  expenseDate: string; // ISO date (YYYY-MM-DD)
  budgetId: string | null;
  budgetName: string | null;
  budgetColor: string;
  budgetIcon: string;
  paidById: string | null;
  paidByName: string | null;
  source: "form" | "ticket";
  status: "pending" | "confirmed";
};

type ExpenseRow = {
  id: string;
  amount: number | string;
  description: string | null;
  expense_date: string;
  budget_id: string | null;
  paid_by: string | null;
  source: string;
  status: string;
  budgets:
    | { name: string; color: string; icon: string }[]
    | { name: string; color: string; icon: string }
    | null;
  paid_by_profile:
    | { full_name: string | null; email: string | null }[]
    | { full_name: string | null; email: string | null }
    | null;
};

export type ExpenseFilters = {
  year: number;
  month: number;
  budgetId?: string;
  paidBy?: string;
};

/** Total confirmed spend for one month. */
export type MonthSpend = { year: number; month: number; spent: number };

/**
 * Confirmed spend for each of the last `count` months ending at (year, month),
 * oldest first — for the analysis trend chart.
 */
export async function getMonthlyTrend(
  householdId: string,
  year: number,
  month: number,
  count = 6,
): Promise<MonthSpend[]> {
  const supabase = await createClient();

  const endIndex = year * 12 + (month - 1);
  const months: MonthSpend[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const idx = endIndex - i;
    months.push({ year: Math.floor(idx / 12), month: (idx % 12) + 1, spent: 0 });
  }

  const first = months[0];
  const start = `${first.year}-${String(first.month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 1); // first day after the current month
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("expenses")
    .select("amount, expense_date")
    .eq("household_id", householdId)
    .eq("status", "confirmed")
    .gte("expense_date", start)
    .lt("expense_date", end);

  const byKey = new Map<string, number>();
  for (const r of (data ?? []) as { amount: number | string; expense_date: string }[]) {
    const [y, mo] = r.expense_date.split("-");
    const key = `${Number(y)}-${Number(mo)}`;
    byKey.set(key, (byKey.get(key) ?? 0) + (Number(r.amount) || 0));
  }
  for (const m of months) m.spent = byKey.get(`${m.year}-${m.month}`) ?? 0;
  return months;
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 1);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;
  return { start, end };
}

/** List expenses for a household in a month, optionally filtered. */
export async function getExpenses(
  householdId: string,
  filters: ExpenseFilters,
): Promise<Expense[]> {
  const supabase = await createClient();
  const { start, end } = monthRange(filters.year, filters.month);

  let query = supabase
    .from("expenses")
    .select(
      "id, amount, description, expense_date, budget_id, paid_by, source, status, " +
        "budgets(name, color, icon), " +
        "paid_by_profile:profiles!expenses_paid_by_fkey(full_name, email)",
    )
    .eq("household_id", householdId)
    .gte("expense_date", start)
    .lt("expense_date", end)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.budgetId) query = query.eq("budget_id", filters.budgetId);
  if (filters.paidBy) query = query.eq("paid_by", filters.paidBy);

  const { data } = await query;

  return ((data ?? []) as unknown as ExpenseRow[]).map((r) => {
    const bud = Array.isArray(r.budgets) ? r.budgets[0] : r.budgets;
    const payer = Array.isArray(r.paid_by_profile)
      ? r.paid_by_profile[0]
      : r.paid_by_profile;
    return {
      id: r.id,
      amount: Number(r.amount) || 0,
      description: r.description,
      expenseDate: r.expense_date,
      budgetId: r.budget_id,
      budgetName: bud?.name ?? null,
      budgetColor: bud?.color ?? "#6366f1",
      budgetIcon: bud?.icon ?? "savings",
      paidById: r.paid_by,
      paidByName: payer?.full_name || payer?.email || null,
      source: r.source === "ticket" ? "ticket" : "form",
      status: r.status === "pending" ? "pending" : "confirmed",
    };
  });
}
