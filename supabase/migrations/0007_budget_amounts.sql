-- ============================================================================
-- 0007 — Per-month budget amounts (effective-dated).
--
-- A budget's spending amount can change over time WITHOUT touching earlier
-- months. The `budgets` table keeps the identity (name, icon, color, split);
-- the amount now lives in `budget_amounts` as effective-dated versions. For a
-- month M, a budget's amount is the latest version whose `effective_from` is on
-- or before the first day of M.
--
-- (The receipts/OCR migration, pending on its own branch, becomes the last one.)
-- Apply after 0001–0006.
-- ============================================================================

create table public.budget_amounts (
  id             uuid primary key default gen_random_uuid(),
  budget_id      uuid not null references public.budgets (id) on delete cascade,
  effective_from date not null,                       -- first day of the month it applies from
  amount         numeric(12,2) not null default 0 check (amount >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (budget_id, effective_from)
);

create index budget_amounts_budget_idx on public.budget_amounts (budget_id);

alter table public.budget_amounts enable row level security;

-- Member-scoped via the parent budget's household.
create policy "budget_amounts_member" on public.budget_amounts
  for all
  using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id and public.is_household_member(b.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id and public.is_household_member(b.household_id)
    )
  );

-- Seed: existing budgets apply from the beginning of time (no behaviour change).
insert into public.budget_amounts (budget_id, effective_from, amount)
select id, date '2000-01-01', amount from public.budgets;

alter table public.budgets drop column amount;
