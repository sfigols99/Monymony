"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveHousehold } from "@/lib/household";

export type BudgetActionState = { error: string } | { ok: true } | null;

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const manualSchema = periodSchema.extend({
  total: z.coerce.number().min(0, "El presupuesto no puede ser negativo"),
});

/** Set a manual budget override for a given month. */
export async function setManualBudget(
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = manualSchema.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
    total: formData.get("total"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const household = await getActiveHousehold();
  if (!household) return { error: "No tienes ningún hogar activo." };

  const supabase = await createClient();
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

  if (error) return { error: error.message };

  revalidatePath("/budget");
  return { ok: true };
}

/**
 * Remove the manual override for a month, reverting to the salary-derived
 * budget. Deleting the row is enough: the budget falls back to salaries.
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

  revalidatePath("/budget");
}
