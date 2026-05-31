/** Format a number as euros using Spanish locale, e.g. 1234.5 -> "1.234,50 €". */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/** Format a 0–100 number as a percentage, e.g. 33.333 -> "33,3 %". */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}
