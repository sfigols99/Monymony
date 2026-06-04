import { createClient } from "@/lib/supabase/server";

export type Category = {
  id: string;
  householdId: string;
  name: string;
  color: string;
  icon: string;
  monthlyLimit: number | null;
  budgetId: string | null;
  budgetName: string | null;
  createdBy: string | null;
};

type CategoryRow = {
  id: string;
  household_id: string;
  name: string;
  color: string;
  icon: string;
  monthly_limit: number | string | null;
  budget_id: string | null;
  budgets: { name: string }[] | { name: string } | null;
  created_by: string | null;
};

/** Load all categories for a household, ordered by name. */
export async function getCategories(householdId: string): Promise<Category[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("categories")
    .select(
      "id, household_id, name, color, icon, monthly_limit, budget_id, budgets(name), created_by",
    )
    .eq("household_id", householdId)
    .order("name", { ascending: true });

  return ((data ?? []) as unknown as CategoryRow[]).map((r) => {
    const budget = Array.isArray(r.budgets) ? r.budgets[0] : r.budgets;
    return {
      id: r.id,
      householdId: r.household_id,
      name: r.name,
      color: r.color,
      icon: r.icon,
      monthlyLimit: r.monthly_limit === null ? null : Number(r.monthly_limit),
      budgetId: r.budget_id,
      budgetName: budget?.name ?? null,
      createdBy: r.created_by,
    };
  });
}
