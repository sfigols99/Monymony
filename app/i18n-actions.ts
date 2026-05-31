"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "@/i18n/locales";

/** Persist the chosen locale in a cookie and refresh the UI. */
export async function setLocale(formData: FormData) {
  const value = String(formData.get("locale") ?? "");
  if (!isLocale(value)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
