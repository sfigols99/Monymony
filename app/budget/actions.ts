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
  icon: z.string().trim().min(1).max(50).default("savings"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "colorInvalid")
    .default("#6366f1"),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  // "forward": this month and the following ones; "month": just this month.
  scope: z.enum(["forward", "month"]).default("forward"),
});

function parseBudget(formData: FormData) {
  return budgetSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    split: formData.get("split") ?? undefined,
    icon: formData.get("icon") ?? undefined,
    color: formData.get("color") ?? undefined,
    year: formData.get("year"),
    month: formData.get("month"),
    scope: formData.get("scope") ?? undefined,
  });
}

const firstDay = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}-01`;

const nextMonthFirstDay = (year: number, month: number) =>
  month === 12 ? firstDay(year + 1, 1) : firstDay(year, month + 1);

type DB = Awaited<ReturnType<typeof createClient>>;

/** The budget's effective amount on `dateStr` (latest version on/before it). */
async function effectiveAmountAt(
  supabase: DB,
  budgetId: string,
  dateStr: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("budget_amounts")
    .select("amount")
    .eq("budget_id", budgetId)
    .lte("effective_from", dateStr)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.amount) || 0 : null;
}

/** Upsert the amount version that takes effect on `dateStr`. */
async function setAmountVersion(
  supabase: DB,
  budgetId: string,
  dateStr: string,
  amount: number,
) {
  return supabase.from("budget_amounts").upsert(
    {
      budget_id: budgetId,
      effective_from: dateStr,
      amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "budget_id,effective_from" },
  );
}

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
  const parsed = parseBudget(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const household = await getActiveHousehold();
  if (!household) return { error: "noActiveHousehold" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Insert the budget identity, then its amount effective from the viewed month
  // (so it doesn't apply to earlier months).
  const { data: created, error } = await supabase
    .from("budgets")
    .insert({
      household_id: household.id,
      name: parsed.data.name,
      split: parsed.data.split,
      icon: parsed.data.icon,
      color: parsed.data.color,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !created) return { error: "generic" };

  const { error: amountError } = await setAmountVersion(
    supabase,
    created.id as string,
    firstDay(parsed.data.year, parsed.data.month),
    parsed.data.amount,
  );
  if (amountError) return { error: "generic" };

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

  const parsed = parseBudget(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const household = await getActiveHousehold();
  if (!household) return { error: "noActiveHousehold" };

  const supabase = await createClient();

  // Identity (name/split/icon/color) is shared across months.
  const { error } = await supabase
    .from("budgets")
    .update({
      name: parsed.data.name,
      split: parsed.data.split,
      icon: parsed.data.icon,
      color: parsed.data.color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "generic" };

  // The amount is effective-dated, and never touches months before this one.
  const { year, month, amount, scope } = parsed.data;
  const m0 = firstDay(year, month);

  if (scope === "forward") {
    // Apply from this month on: drop any later versions, set this month's.
    await supabase.from("budget_amounts").delete().eq("budget_id", id).gt("effective_from", m0);
    const { error: e } = await setAmountVersion(supabase, id, m0, amount);
    if (e) return { error: "generic" };
  } else {
    // This month only: pin the following months to their current value first.
    const next = nextMonthFirstDay(year, month);
    const prevAtNext = await effectiveAmountAt(supabase, id, next);
    const e1 = await setAmountVersion(supabase, id, m0, amount);
    if (e1.error) return { error: "generic" };
    const e2 = await setAmountVersion(supabase, id, next, prevAtNext ?? 0);
    if (e2.error) return { error: "generic" };
  }

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
