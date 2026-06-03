-- ============================================================================
-- 0003 — Named monthly budgets with a split method.
--
-- A household defines N named budgets (e.g. "Hipoteca", "Súper"), each with an
-- amount and a split method:
--   - 'proportional': split by each member's salary share (someone earning 2/3
--      of the household income pays 2/3 of the budget).
--   - 'equal': same share for every member.
--
-- The planned monthly total is the sum of the budgets. A per-month manual
-- override in `monthly_budgets` still wins for its own month. When there are no
-- budgets, the planned total falls back to the salary sum.
--
-- (Supersedes the earlier single-amount `recurring_budgets` table.) Apply in the
-- Supabase SQL editor after 0001–0002.
-- ============================================================================

drop table if exists public.recurring_budgets cascade;

create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  name          text not null,
  amount        numeric(12,2) not null default 0 check (amount >= 0),
  split         text not null default 'proportional' check (split in ('equal', 'proportional')),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index budgets_household_idx on public.budgets (household_id);

alter table public.budgets enable row level security;

-- Member-scoped, like the other household data tables.
create policy "budgets_select_member" on public.budgets
  for select using (public.is_household_member(household_id));

create policy "budgets_insert_member" on public.budgets
  for insert with check (public.is_household_member(household_id));

create policy "budgets_update_member" on public.budgets
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "budgets_delete_member" on public.budgets
  for delete using (public.is_household_member(household_id));
