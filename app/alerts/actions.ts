"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveHousehold } from "@/lib/household";

export type AlertActionState = { error: string } | { ok: true } | null;

const alertSchema = z
  .object({
    name: z.string().trim().min(1, "Pon un nombre a la alerta").max(60),
    categoryId: z
      .union([z.literal(""), z.string().uuid()])
      .transform((v) => (v === "" ? null : v)),
    thresholdType: z.enum(["percent", "amount"]),
    thresholdValue: z.coerce.number().positive("El umbral debe ser mayor que 0"),
  })
  .transform((data) => ({
    name: data.name,
    categoryId: data.categoryId,
    thresholdPercent: data.thresholdType === "percent" ? data.thresholdValue : null,
    thresholdAmount: data.thresholdType === "amount" ? data.thresholdValue : null,
  }));

function parse(formData: FormData) {
  return alertSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
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
  if (!household) return { error: "No tienes ningún hogar activo." };

  // A per-category percent threshold needs the category to have a limit.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("alerts").insert({
    household_id: household.id,
    name: parsed.data.name,
    category_id: parsed.data.categoryId,
    threshold_percent: parsed.data.thresholdPercent,
    threshold_amount: parsed.data.thresholdAmount,
    is_active: true,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

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
  if (!id) return { error: "Alerta no válida." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("alerts")
    .update({
      name: parsed.data.name,
      category_id: parsed.data.categoryId,
      threshold_percent: parsed.data.thresholdPercent,
      threshold_amount: parsed.data.thresholdAmount,
    })
    .eq("id", id);

  if (error) return { error: error.message };

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
