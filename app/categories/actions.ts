"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveHousehold } from "@/lib/household";

/** `error` holds a translation key under the `errors` namespace. */
export type CategoryActionState = { error: string } | { ok: true } | null;

const categorySchema = z.object({
  name: z.string().trim().min(1, "categoryNameRequired").max(50),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "colorInvalid"),
  icon: z.string().trim().min(1).max(50),
  monthlyLimit: z
    .union([z.literal(""), z.coerce.number().min(0)])
    .transform((v) => (v === "" ? null : v)),
});

/** Create a category in the user's active household. */
export async function createCategory(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    icon: formData.get("icon"),
    monthlyLimit: formData.get("monthlyLimit"),
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

  const { error } = await supabase.from("categories").insert({
    household_id: household.id,
    name: parsed.data.name,
    color: parsed.data.color,
    icon: parsed.data.icon,
    monthly_limit: parsed.data.monthlyLimit,
    created_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "categoryDuplicate" };
    }
    return { error: "generic" };
  }

  revalidatePath("/categories");
  return { ok: true };
}

/** Update an existing category (scoped to the household via RLS). */
export async function updateCategory(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalidCategory" };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    icon: formData.get("icon"),
    monthlyLimit: formData.get("monthlyLimit"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      color: parsed.data.color,
      icon: parsed.data.icon,
      monthly_limit: parsed.data.monthlyLimit,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "categoryDuplicate" };
    }
    return { error: "generic" };
  }

  revalidatePath("/categories");
  return { ok: true };
}

/** Delete a category. Expenses keep their row (category_id is set null). */
export async function deleteCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", id);

  revalidatePath("/categories");
}
