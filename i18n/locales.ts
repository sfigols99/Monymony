/** Supported locales. Spanish is the default. */
export const LOCALES = ["es", "en", "ca"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** Cookie that stores the user's chosen locale. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Native display names for the locale switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: "Español",
  en: "English",
  ca: "Català",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
