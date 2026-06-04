"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveHousehold } from "@/lib/household";

/** `error` holds a translation key under the `errors` namespace. */
export type AlertActionState = { error: string } | { ok: true } | null;

const uuid = z.string().uuid();

const alertSchema = z
  .object({
    name: z.string().trim().min(1, "alertNameRequired").max(60),
    // Scope encodes the target: "" = whole household, "bud:<id>" = a budget.
    scope: z.string().default(""),
    thresholdType: z.enum(["percent", "amount"]),
    thresholdValue: z.coerce.number().positive("thresholdPositive"),
  })
  .transform((data) => {
    const budMatch = data.scope.startsWith("bud:") ? data.scope.slice(4) : null;
    return {
      name: data.name,
      budgetId: budMatch && uuid.safeParse(budMatch).success ? budMatch : null,
      thresholdPercent: data.thresholdType === "percent" ? data.thresholdValue : null,
      thresholdAmount: data.thresholdType === "amount" ? data.thresholdValue : null,
    };
  });

function parse(formData: FormData) {
  return alertSchema.safeParse({
    name: formData.get("name"),
    scope: formData.get("scope") ?? "",
    thresholdType: formData.get("thresholdType"),
    thresholdValue: formData.get("thresholdValue"),
  });
}

/** Create an alert in the active household. */
export async function createAlert(
  _prev: AlertActionState,
  formData: FormData,
): Promise<AlertActionState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const household = await getActiveHousehold();
  if (!household) return { error: "noActiveHousehold" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("alerts").insert({
    household_id: household.id,
    name: parsed.data.name,
    budget_id: parsed.data.budgetId,
    threshold_percent: parsed.data.thresholdPercent,
    threshold_amount: parsed.data.thresholdAmount,
    is_active: true,
    created_by: user?.id ?? null,
  });

  if (error) return { error: "generic" };

  revalidatePath("/alerts");
  revalidatePath("/");
  return { ok: true };
}

/** Update an existing alert. */
export async function updateAlert(
  _prev: AlertActionState,
  formData: FormData,
): Promise<AlertActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalidAlert" };

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("alerts")
    .update({
      name: parsed.data.name,
      budget_id: parsed.data.budgetId,
      threshold_percent: parsed.data.thresholdPercent,
      threshold_amount: parsed.data.thresholdAmount,
    })
    .eq("id", id);

  if (error) return { error: "generic" };

  revalidatePath("/alerts");
  revalidatePath("/");
  return { ok: true };
}

/** Toggle an alert on/off. */
export async function toggleAlert(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("is_active") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("alerts").update({ is_active: !isActive }).eq("id", id);

  revalidatePath("/alerts");
  revalidatePath("/");
}

/** Delete an alert. */
export async function deleteAlert(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("alerts").delete().eq("id", id);

  revalidatePath("/alerts");
  revalidatePath("/");
}
