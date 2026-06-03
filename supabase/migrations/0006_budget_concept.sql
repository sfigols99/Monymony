-- ============================================================================
-- 0006 — Budgets become an expense concept: give them an icon + color, and let
-- expenses be assigned directly to a budget.
--
-- A budget now carries a visual identity (icon + color) and can be picked on an
-- expense as its concept. A budget's spend is the confirmed expenses assigned to
-- it directly (expenses.budget_id), falling back to expenses whose category
-- belongs to the budget (categories.budget_id) when not assigned directly.
--
-- Additive: the `categories` concept is kept. (0004 is the receipts/OCR
-- migration on its own branch.) Apply after 0001–0003 and 0005.
-- ============================================================================

alter table public.budgets
  add column icon  text not null default 'savings',
  add column color text not null default '#6366f1';

alter table public.expenses
  add column budget_id uuid references public.budgets (id) on delete set null;

create index expenses_budget_idx on public.expenses (budget_id);
