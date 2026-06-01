-- ============================================================================
-- 0004 — Recurring fixed monthly budget.
--
-- A household can set a single fixed budget amount that applies to every month
-- from a chosen month onward (instead of the salary-derived total). Per-month
-- manual overrides in `monthly_budgets` still win for their own month, so the
-- effective budget for a period is resolved as:
--   1. per-month manual override (monthly_budgets.is_manual)
--   2. else the recurring fixed amount, if the period >= effective_from
--   3. else the salary-derived total
--
-- One row per household (household_id is the primary key). Apply in the Supabase
-- SQL editor after 0001–0003.
-- ============================================================================

create table public.recurring_budgets (
  household_id    uuid primary key references public.households (id) on delete cascade,
  amount          numeric(12,2) not null check (amount >= 0),
  effective_from  date not null,  -- first day of the first month it applies to
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.recurring_budgets enable row level security;

-- Member-scoped, like the other household data tables.
create policy "recurring_budgets_select_member" on public.recurring_budgets
  for select using (public.is_household_member(household_id));

create policy "recurring_budgets_insert_member" on public.recurring_budgets
  for insert with check (public.is_household_member(household_id));

create policy "recurring_budgets_update_member" on public.recurring_budgets
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "recurring_budgets_delete_member" on public.recurring_budgets
  for delete using (public.is_household_member(household_id));
