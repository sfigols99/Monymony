import type { ParsedReceipt } from "./types";

/**
 * Heuristics to extract { amount, date, merchant } from raw receipt text.
 * Tuned for Spanish/EUR receipts (comma decimals, dd/mm/yyyy dates) but
 * tolerant of dot decimals and ISO dates. Pure and side-effect free so it can
 * be unit-tested independently of any OCR engine.
 */

// A monetary token like "12,34", "1.234,56", "1,234.56" or "12.34".
const MONEY = /(\d{1,3}(?:[.,\s]\d{3})*[.,]\d{2})(?!\d)/g;

// Lines that usually carry the grand total (avoid subtotals / VAT / change).
const TOTAL_HINT = /\b(total\s*a?\s*pagar|importe\s*total|total|a\s*pagar|to\s*pay)\b/i;
const NEGATIVE_HINT = /\b(subtotal|iva|i\.v\.a|tax|base|cambio|entregado|devoluci|change)\b/i;

/** Normalize a localized money token to a JS number. */
function parseMoney(token: string): number | null {
  let s = token.replace(/\s/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  // The right-most separator is the decimal one; the other groups thousands.
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Find the most likely total amount in the receipt. */
function extractAmount(lines: string[]): number | null {
  const candidates: { value: number; weight: number }[] = [];

  for (const line of lines) {
    const matches = line.match(MONEY);
    if (!matches) continue;
    const onTotalLine = TOTAL_HINT.test(line);
    const onNegativeLine = NEGATIVE_HINT.test(line);
    for (const m of matches) {
      const value = parseMoney(m);
      if (value == null || value <= 0) continue;
      // Prefer values on a "total" line; de-prioritize subtotal/VAT/change.
      let weight = value;
      if (onTotalLine && !onNegativeLine) weight += 100000;
      if (onNegativeLine) weight -= 100000;
      candidates.push({ value, weight });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.weight - a.weight);
  return candidates[0].value;
}

/** Find the first plausible date and return it as ISO `YYYY-MM-DD`. */
function extractDate(text: string): string | null {
  // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (also 2-digit year).
  const dmy = text.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/);
  if (dmy) {
    const [, d, m, rawYear] = dmy;
    const y = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const day = Number(d);
    const month = Number(m);
    const year = Number(y);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  // ISO yyyy-mm-dd.
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
  }
  return null;
}

/** First meaningful line is usually the shop name. */
function extractMerchant(lines: string[]): string | null {
  for (const line of lines) {
    const clean = line.trim();
    // Skip lines that are mostly digits/symbols (codes, prices, separators).
    if (clean.length < 3) continue;
    const letters = clean.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "").length;
    if (letters >= 3) return clean.slice(0, 60);
  }
  return null;
}

/** Parse raw OCR text into structured receipt fields. */
export function parseReceipt(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    amount: extractAmount(lines),
    date: extractDate(rawText),
    merchant: extractMerchant(lines),
    rawText,
  };
}
