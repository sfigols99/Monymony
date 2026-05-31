import { createClient } from "@/lib/supabase/server";
import { getMonthlyBudget } from "@/lib/budget";
import type { ActiveHousehold } from "@/lib/household";

export type Alert = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string;
  categoryIcon: string;
  thresholdPercent: number | null;
  thresholdAmount: number | null;
  isActive: boolean;
};

export type TriggeredAlert = Alert & {
  /** Confirmed spend the alert is watching (whole household or one category). */
  spent: number;
  /** The amount at which the alert fires (absolute € for this period). */
  limit: number;
  /** spent / limit, 0–100+. */
  usedPercent: number;
};

type AlertRow = {
  id: string;
  name: string;
  category_id: string | null;
  threshold_percent: number | string | null;
  threshold_amount: number | string | null;
  is_active: boolean;
  categories:
    | { name: string; color: string; icon: string }[]
    | { name: string; color: string; icon: string }
    | null;
};

function mapRow(r: AlertRow): Alert {
  const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
  return {
    id: r.id,
    name: r.name,
    categoryId: r.category_id,
    categoryName: cat?.name ?? null,
    categoryColor: cat?.color ?? "#9ca3af",
    categoryIcon: cat?.icon ?? "notifications",
    thresholdPercent: r.threshold_percent === null ? null : Number(r.threshold_percent),
    thresholdAmount: r.threshold_amount === null ? null : Number(r.threshold_amount),
    isActive: r.is_active,
  };
}

/** Load all alerts for a household. */
export async function getAlerts(householdId: string): Promise<Alert[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("alerts")
    .select(
      "id, name, category_id, threshold_percent, threshold_amount, is_active, categories(name, color, icon)",
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as unknown as AlertRow[]).map(mapRow);
}

/**
 * Evaluate active alerts for a given month and return the ones currently
 * triggered (spend has reached the configured threshold).
 *
 * - Whole-household alert (category_id null):
 *   - threshold_amount: fires when total spend >= amount
 *   - threshold_percent: fires when total spend >= percent of the planned budget
 * - Per-category alert:
 *   - threshold_amount: fires when category spend >= amount
 *   - threshold_percent: fires when category spend >= percent of the category's
 *     monthly_limit (skipped if the category has no limit)
 */
export async function getTriggeredAlerts(
  household: ActiveHousehold,
  year: number,
  month: number,
): Promise<TriggeredAlert[]> {
  const [alerts, budget] = await Promise.all([
    getAlerts(household.id),
    getMonthlyBudget(household, year, month),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const c of budget.spentByCategory) {
    if (c.categoryId) spentByCategory.set(c.categoryId, c.spent);
  }

  // Category limits, needed for per-category percent thresholds.
  const supabase = await createClient();
  const { data: catRows } = await supabase
    .from("categories")
    .select("id, monthly_limit")
    .eq("household_id", household.id);
  const limitByCategory = new Map<string, number | null>();
  for (const c of (catRows ?? []) as { id: string; monthly_limit: number | string | null }[]) {
    limitByCategory.set(c.id, c.monthly_limit === null ? null : Number(c.monthly_limit));
  }

  const triggered: TriggeredAlert[] = [];

  for (const a of alerts) {
    if (!a.isActive) continue;

    const spent = a.categoryId
      ? spentByCategory.get(a.categoryId) ?? 0
      : budget.spent;

    // Resolve the absolute € limit at which this alert fires.
    let limit: number | null = null;
    if (a.thresholdAmount != null) {
      limit = a.thresholdAmount;
    } else if (a.thresholdPercent != null) {
      const base = a.categoryId
        ? limitByCategory.get(a.categoryId) ?? null
        : budget.plannedTotal;
      if (base != null && base > 0) {
        limit = (a.thresholdPercent / 100) * base;
      }
    }

    if (limit == null || limit <= 0) continue;

    if (spent >= limit) {
      triggered.push({
        ...a,
        spent,
        limit,
        usedPercent: (spent / limit) * 100,
      });
    }
  }

  // Most-overspent first.
  return triggered.sort((a, b) => b.usedPercent - a.usedPercent);
}
