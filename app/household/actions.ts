"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * `error` is a translation key under the `errors` namespace (resolved on the
 * client), not user-facing text. Keeps Server Actions locale-agnostic.
 */
export type ActionState = { error: string } | null;

const createSchema = z.object({
  name: z.string().trim().min(1, "householdNameRequired").max(80),
});

const joinSchema = z.object({
  code: z.string().trim().min(4, "codeInvalid").max(12, "codeInvalid"),
});

const salarySchema = z.object({
  salary: z.coerce.number().min(0, "salaryNegative"),
});

/** Create a new household and make the current user its owner. */
export async function createHousehold(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: parsed.data.name,
  });
  if (error) return { error: "generic" };

  revalidatePath("/", "layout");
  redirect("/");
}

/** Join an existing household using its invite code. */
export async function joinHousehold(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = joinSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household_by_code", {
    p_code: parsed.data.code,
  });
  if (error) {
    if (error.message.includes("INVALID_CODE")) {
      return { error: "codeNotFound" };
    }
    return { error: "generic" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** Update the signed-in member's monthly salary in their household. */
export async function updateSalary(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = salarySchema.safeParse({ salary: formData.get("salary") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "invalidSession" };

  const householdId = String(formData.get("household_id") ?? "");
  if (!householdId) return { error: "invalidHousehold" };

  const { error } = await supabase
    .from("household_members")
    .update({ monthly_salary: parsed.data.salary })
    .eq("household_id", householdId)
    .eq("user_id", user.id);

  if (error) return { error: "generic" };

  revalidatePath("/", "layout");
  return null;
}

/** Leave the given household (removes the current user's membership). */
export async function leaveHousehold(formData: FormData): Promise<void> {
  const householdId = String(formData.get("household_id") ?? "");
  if (!householdId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
  redirect("/");
}
