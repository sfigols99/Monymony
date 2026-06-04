"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveHousehold } from "@/lib/household";

/** `error` holds a translation key under the `errors` namespace. */
export type ExpenseActionState = { error: string } | { ok: true } | null;

const expenseSchema = z.object({
  amount: z.coerce.number().positive("amountPositive"),
  budgetId: z.union([z.literal(""), z.string().uuid()]).transform((v) => (v === "" ? null : v)),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateInvalid"),
  paidBy: z.union([z.literal(""), z.string().uuid()]).transform((v) => (v === "" ? null : v)),
  description: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
});

function parseExpense(formData: FormData) {
  return expenseSchema.safeParse({
    amount: formData.get("amount"),
    budgetId: formData.get("budgetId") ?? "",
    expenseDate: formData.get("expenseDate"),
    paidBy: formData.get("paidBy"),
    description: formData.get("description"),
  });
}

/** Verify a member id belongs to the household (avoid trusting the client). */
function isMember(household: { members: { userId: string }[] }, userId: string | null) {
  return userId === null || household.members.some((m) => m.userId === userId);
}

/** Create a confirmed expense (form source) in the active household. */
export async function createExpense(
  _prev: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const parsed = parseExpense(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const household = await getActiveHousehold();
  if (!household) return { error: "noActiveHousehold" };
  if (!isMember(household, parsed.data.paidBy)) {
    return { error: "payerNotMember" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("expenses").insert({
    household_id: household.id,
    amount: parsed.data.amount,
    budget_id: parsed.data.budgetId,
    expense_date: parsed.data.expenseDate,
    paid_by: parsed.data.paidBy,
    description: parsed.data.description,
    source: "form",
    status: "confirmed",
    created_by: user?.id ?? null,
  });

  if (error) return { error: "generic" };

  revalidatePath("/expenses");
  revalidatePath("/budget");
  return { ok: true };
}

/** Update an existing expense (household-scoped via RLS). */
export async function updateExpense(
  _prev: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalidExpense" };

  const parsed = parseExpense(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const household = await getActiveHousehold();
  if (!household) return { error: "noActiveHousehold" };
  if (!isMember(household, parsed.data.paidBy)) {
    return { error: "payerNotMember" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      amount: parsed.data.amount,
      budget_id: parsed.data.budgetId,
      expense_date: parsed.data.expenseDate,
      paid_by: parsed.data.paidBy,
      description: parsed.data.description,
    })
    .eq("id", id);

  if (error) return { error: "generic" };

  revalidatePath("/expenses");
  revalidatePath("/budget");
  return { ok: true };
}

/** Delete an expense. */
export async function deleteExpense(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);

  revalidatePath("/expenses");
  revalidatePath("/budget");
}
