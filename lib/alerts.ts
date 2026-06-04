import { getMonthlyBudget } from "@/lib/budget";
import { createClient } from "@/lib/supabase/server";
import type { ActiveHousehold } from "@/lib/household";

export type Alert = {
  id: string;
  name: string;
  budgetId: string | null;
  budgetName: string | null;
  thresholdPercent: number | null;
  thresholdAmount: number | null;
  isActive: boolean;
};

export type TriggeredAlert = Alert & {
  /** Confirmed spend the alert is watching (whole household or one budget). */
  spent: number;
  /** The amount at which the alert fires (absolute € for this period). */
  limit: number;
  /** spent / limit, 0–100+. */
  usedPercent: number;
};

type AlertRow = {
  id: string;
  name: string;
  budget_id: string | null;
  threshold_percent: number | string | null;
  threshold_amount: number | string | null;
  is_active: boolean;
  budgets: { name: string }[] | { name: string } | null;
};

function mapRow(r: AlertRow): Alert {
  const bud = Array.isArray(r.budgets) ? r.budgets[0] : r.budgets;
  return {
    id: r.id,
    name: r.name,
    budgetId: r.budget_id,
    budgetName: bud?.name ?? null,
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
      "id, name, budget_id, threshold_percent, threshold_amount, is_active, budgets(name)",
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as unknown as AlertRow[]).map(mapRow);
}

/**
 * Evaluate active alerts for a given month and return the ones currently
 * triggered (spend has reached the configured threshold).
 *
 * - Whole-household alert (budget_id null):
 *   - threshold_amount: fires when total spend >= amount
 *   - threshold_percent: fires when total spend >= percent of the planned budget
 * - Per-budget alert:
 *   - threshold_amount: fires when the budget's spend >= amount
 *   - threshold_percent: fires when the budget's spend >= percent of its amount
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

  // Per-budget spend and planned amount, for budget-scoped alerts.
  const budgetById = new Map<string, { spent: number; amount: number }>();
  for (const b of budget.budgets) {
    budgetById.set(b.id, { spent: b.spent, amount: b.amount });
  }

  const triggered: TriggeredAlert[] = [];

  for (const a of alerts) {
    if (!a.isActive) continue;

    // What this alert is watching: a budget or the whole household.
    const spent = a.budgetId
      ? budgetById.get(a.budgetId)?.spent ?? 0
      : budget.spent;

    // Resolve the absolute € limit at which this alert fires.
    let limit: number | null = null;
    if (a.thresholdAmount != null) {
      limit = a.thresholdAmount;
    } else if (a.thresholdPercent != null) {
      const base = a.budgetId
        ? budgetById.get(a.budgetId)?.amount ?? null
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
