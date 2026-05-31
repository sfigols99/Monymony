import { createClient } from "@/lib/supabase/server";

export type Expense = {
  id: string;
  amount: number;
  description: string | null;
  expenseDate: string; // ISO date (YYYY-MM-DD)
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string;
  categoryIcon: string;
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
  category_id: string | null;
  paid_by: string | null;
  source: string;
  status: string;
  categories:
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
  categoryId?: string;
  paidBy?: string;
};

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
      "id, amount, description, expense_date, category_id, paid_by, source, status, " +
        "categories(name, color, icon), paid_by_profile:profiles!expenses_paid_by_fkey(full_name, email)",
    )
    .eq("household_id", householdId)
    .gte("expense_date", start)
    .lt("expense_date", end)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.paidBy) query = query.eq("paid_by", filters.paidBy);

  const { data } = await query;

  return ((data ?? []) as unknown as ExpenseRow[]).map((r) => {
    const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
    const payer = Array.isArray(r.paid_by_profile)
      ? r.paid_by_profile[0]
      : r.paid_by_profile;
    return {
      id: r.id,
      amount: Number(r.amount) || 0,
      description: r.description,
      expenseDate: r.expense_date,
      categoryId: r.category_id,
      categoryName: cat?.name ?? null,
      categoryColor: cat?.color ?? "#9ca3af",
      categoryIcon: cat?.icon ?? "help",
      paidById: r.paid_by,
      paidByName: payer?.full_name || payer?.email || null,
      source: r.source === "ticket" ? "ticket" : "form",
      status: r.status === "pending" ? "pending" : "confirmed",
    };
  });
}
