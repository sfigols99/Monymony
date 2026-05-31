-- ============================================================================
-- Monymony — initial schema
-- Shared household expense planner. Currency: EUR.
-- All amounts are stored as numeric(12,2) representing euros.
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: 1:1 with auth.users, holds public profile data
-- ----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- households: a house / shared group
-- ----------------------------------------------------------------------------
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- household_members: users belonging to a household + their salary.
-- The budget is derived from the sum of salaries; each member's contribution
-- percentage = monthly_salary / sum(monthly_salary) within the household.
-- ----------------------------------------------------------------------------
create table public.household_members (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  monthly_salary  numeric(12,2) not null default 0 check (monthly_salary >= 0),
  role            text not null default 'member' check (role in ('owner', 'member')),
  joined_at       timestamptz not null default now(),
  unique (household_id, user_id)
);

-- ----------------------------------------------------------------------------
-- categories (conceptos): user-defined, with color + Google Material icon name
-- ----------------------------------------------------------------------------
create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  name            text not null,
  color           text not null default '#6366f1', -- hex color
  icon            text not null default 'category',  -- Material Symbols name
  monthly_limit   numeric(12,2) check (monthly_limit is null or monthly_limit >= 0),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (household_id, name)
);

-- ----------------------------------------------------------------------------
-- monthly_budgets: planned total budget per household per month.
-- is_manual = true when the user overrides the salary-derived total.
-- ----------------------------------------------------------------------------
create table public.monthly_budgets (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  year            int not null,
  month           int not null check (month between 1 and 12),
  total_amount    numeric(12,2) not null default 0 check (total_amount >= 0),
  is_manual       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (household_id, year, month)
);

-- ----------------------------------------------------------------------------
-- expenses (gastos): entered via form or extracted from a receipt photo (OCR).
-- status 'pending' means the OCR result still needs user validation.
-- ----------------------------------------------------------------------------
create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  category_id     uuid references public.categories (id) on delete set null,
  amount          numeric(12,2) not null check (amount >= 0),
  description     text,
  expense_date    date not null default current_date,
  paid_by         uuid references public.profiles (id) on delete set null,
  source          text not null default 'form' check (source in ('form', 'ticket')),
  receipt_url     text,
  status          text not null default 'confirmed' check (status in ('pending', 'confirmed')),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index expenses_household_date_idx on public.expenses (household_id, expense_date desc);
create index expenses_category_idx on public.expenses (category_id);

-- ----------------------------------------------------------------------------
-- alerts: thresholds that warn when spending runs high.
-- category_id null => alert applies to the whole household budget.
-- ----------------------------------------------------------------------------
create table public.alerts (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references public.households (id) on delete cascade,
  category_id        uuid references public.categories (id) on delete cascade,
  name               text not null,
  threshold_percent  numeric(5,2) check (threshold_percent is null or (threshold_percent >= 0 and threshold_percent <= 1000)),
  threshold_amount   numeric(12,2) check (threshold_amount is null or threshold_amount >= 0),
  is_active          boolean not null default true,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Helper: is the current user a member of the given household?
create or replace function public.is_household_member(target_household uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household
      and hm.user_id = auth.uid()
  );
$$;

alter table public.profiles            enable row level security;
alter table public.households          enable row level security;
alter table public.household_members   enable row level security;
alter table public.categories          enable row level security;
alter table public.monthly_budgets     enable row level security;
alter table public.expenses            enable row level security;
alter table public.alerts              enable row level security;

-- profiles: a user can read/update their own profile
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- households: members can read; owner can update/delete; any auth user can create
create policy "households_select_member" on public.households
  for select using (public.is_household_member(id));
create policy "households_insert_auth" on public.households
  for insert with check (owner_id = auth.uid());
create policy "households_update_owner" on public.households
  for update using (owner_id = auth.uid());
create policy "households_delete_owner" on public.households
  for delete using (owner_id = auth.uid());

-- household_members: members can read the roster; users manage their own row
create policy "members_select_member" on public.household_members
  for select using (public.is_household_member(household_id));
create policy "members_insert_self" on public.household_members
  for insert with check (user_id = auth.uid());
create policy "members_update_self" on public.household_members
  for update using (user_id = auth.uid());
create policy "members_delete_self" on public.household_members
  for delete using (user_id = auth.uid());

-- Generic member-scoped policies for the data tables
create policy "categories_all_member" on public.categories
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "budgets_all_member" on public.monthly_budgets
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "expenses_all_member" on public.expenses
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "alerts_all_member" on public.alerts
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
