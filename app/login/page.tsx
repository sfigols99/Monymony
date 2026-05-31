"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { login, signup, type AuthState } from "./actions";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-end">
            <LocaleSwitcher />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {tc("appName")}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>

        <form action={formAction} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm font-medium">
                {t("name")}
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              {t("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              {t("password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending
              ? tc("loading")
              : mode === "login"
                ? t("login")
                : t("signup")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-neutral-500 hover:text-indigo-600"
        >
          {mode === "login" ? t("toSignup") : t("toLogin")}
        </button>
      </div>
    </main>
  );
}
