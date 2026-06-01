"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveHousehold } from "@/lib/household";

/** `error` holds a translation key under the `errors` namespace. */
export type BudgetActionState = { error: string } | { ok: true } | null;

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const setSchema = periodSchema.extend({
  total: z.coerce.number().min(0, "budgetNegative"),
  // "month": override just this month. "forward": fixed budget from this month on.
  scope: z.enum(["month", "forward"]).default("month"),
});

/** Re-render the views whose numbers depend on the planned budget. */
function revalidateBudgetViews() {
  revalidatePath("/budget");
  revalidatePath("/alerts");
  revalidatePath("/");
}

/**
 * Set the planned budget. With `scope: "month"` it stores a manual override for
 * that single month; with `scope: "forward"` it stores a household-wide fixed
 * budget that applies from that month onward (instead of the salaries).
 */
export async function setBudget(
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = setSchema.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
    total: formData.get("total"),
    scope: formData.get("scope") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const household = await getActiveHousehold();
  if (!household) return { error: "noActiveHousehold" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (parsed.data.scope === "forward") {
    const effectiveFrom = `${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}-01`;
    const { error } = await supabase.from("recurring_budgets").upsert(
      {
        household_id: household.id,
        amount: parsed.data.total,
        effective_from: effectiveFrom,
        created_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "household_id" },
    );
    if (error) return { error: "generic" };
  } else {
    const { error } = await supabase.from("monthly_budgets").upsert(
      {
        household_id: household.id,
        year: parsed.data.year,
        month: parsed.data.month,
        total_amount: parsed.data.total,
        is_manual: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "household_id,year,month" },
    );
    if (error) return { error: "generic" };
  }

  revalidateBudgetViews();
  return { ok: true };
}

/**
 * Remove the manual override for a single month, reverting to the recurring
 * fixed budget (if any) or the salary-derived total.
 */
export async function resetToSalaryBudget(formData: FormData): Promise<void> {
  const parsed = periodSchema.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
  });
  if (!parsed.success) return;

  const household = await getActiveHousehold();
  if (!household) return;

  const supabase = await createClient();
  await supabase
    .from("monthly_budgets")
    .delete()
    .eq("household_id", household.id)
    .eq("year", parsed.data.year)
    .eq("month", parsed.data.month);

  revalidateBudgetViews();
}

/** Remove the household's recurring fixed budget (back to salaries). */
export async function clearRecurringBudget(): Promise<void> {
  const household = await getActiveHousehold();
  if (!household) return;

  const supabase = await createClient();
  await supabase
    .from("recurring_budgets")
    .delete()
    .eq("household_id", household.id);

  revalidateBudgetViews();
}
