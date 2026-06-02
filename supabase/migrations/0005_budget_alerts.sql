-- ============================================================================
-- 0005 — Link categories to budgets, and let alerts target a budget.
--
-- A budget groups categories: a category can belong to one budget, so a
-- budget's spending is the sum of its categories' confirmed expenses. Alerts
-- can then watch a whole household, a single category, or a budget.
--
-- (0004 is the receipts/OCR migration on its own branch — hence the gap here.)
-- Apply in the Supabase SQL editor after 0001–0003.
-- ============================================================================

-- A category may belong to a budget (null = unassigned). If the budget is
-- deleted the category stays but becomes unassigned.
alter table public.categories
  add column budget_id uuid references public.budgets (id) on delete set null;

create index categories_budget_idx on public.categories (budget_id);

-- An alert may target a budget (in addition to the existing whole-household /
-- per-category scopes). Deleting the budget removes its alerts.
alter table public.alerts
  add column budget_id uuid references public.budgets (id) on delete cascade;

create index alerts_budget_idx on public.alerts (budget_id);
