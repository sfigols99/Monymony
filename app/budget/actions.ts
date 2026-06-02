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

const manualSchema = periodSchema.extend({
  total: z.coerce.number().min(0, "budgetNegative"),
});

const budgetSchema = z.object({
  name: z.string().trim().min(1, "budgetNameRequired").max(60),
  amount: z.coerce.number().min(0, "budgetNegative"),
  split: z.enum(["equal", "proportional"]).default("proportional"),
});

/** Re-render the views whose numbers depend on the planned budget. */
function revalidateBudgetViews() {
  revalidatePath("/budget");
  revalidatePath("/alerts");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Per-month manual override of the planned total (monthly_budgets).
// ---------------------------------------------------------------------------

/** Override the planned total for a single month. */
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
  if (!household) return { error: "noActiveHousehold" };

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
  if (error) return { error: "generic" };

  revalidateBudgetViews();
  return { ok: true };
}

/** Drop a month's manual override, reverting to the budgets / salary total. */
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

// ---------------------------------------------------------------------------
// Named budgets (budgets) — the household's recurring plan.
// ---------------------------------------------------------------------------

/** Create a named budget in the active household. */
export async function createBudget(
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = budgetSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    split: formData.get("split") ?? undefined,
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

  const { error } = await supabase.from("budgets").insert({
    household_id: household.id,
    name: parsed.data.name,
    amount: parsed.data.amount,
    split: parsed.data.split,
    created_by: user?.id ?? null,
  });
  if (error) return { error: "generic" };

  revalidateBudgetViews();
  return { ok: true };
}

/** Update a named budget (household-scoped via RLS). */
export async function updateBudget(
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "generic" };

  const parsed = budgetSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    split: formData.get("split") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const household = await getActiveHousehold();
  if (!household) return { error: "noActiveHousehold" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .update({
      name: parsed.data.name,
      amount: parsed.data.amount,
      split: parsed.data.split,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "generic" };

  revalidateBudgetViews();
  return { ok: true };
}

/** Delete a named budget. */
export async function deleteBudget(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("budgets").delete().eq("id", id);

  revalidateBudgetViews();
}
