/**
 * Pure month/period helpers — no server-only imports, so they're safe to use
 * from Client Components (unlike `lib/budget.ts`, which pulls in the Supabase
 * server client). `lib/budget.ts` re-exports these for server callers.
 */

/** Clamp a possibly-invalid month/year to a sane range, defaulting to now. */
export function normalizePeriod(year?: number, month?: number) {
  const now = new Date();
  const y = Number.isFinite(year) && year! >= 2000 && year! <= 2100 ? year! : now.getFullYear();
  const m = Number.isFinite(month) && month! >= 1 && month! <= 12 ? month! : now.getMonth() + 1;
  return { year: y, month: m };
}

/** "mayo de 2026" / "May 2026" / "maig de 2026" — formatted for the locale. */
export function formatPeriod(
  year: number,
  month: number,
  locale = "es",
): string {
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(d);
}
