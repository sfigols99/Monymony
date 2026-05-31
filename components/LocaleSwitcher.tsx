"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/locales";
import { setLocale } from "@/app/i18n-actions";

/** Dropdown to switch the UI language; persists the choice in a cookie. */
export function LocaleSwitcher() {
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Idioma"
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("locale", e.target.value);
        startTransition(() => setLocale(fd));
      }}
      className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
