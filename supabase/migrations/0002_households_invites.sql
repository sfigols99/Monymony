-- ============================================================================
-- Monymony — Phase 1: household invites, joining and co-member visibility
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Invite code: short, shareable code used to join a household.
-- ----------------------------------------------------------------------------
alter table public.households
  add column if not exists invite_code text;

-- Backfill any existing rows with a unique code, then enforce uniqueness.
update public.households
  set invite_code = upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6))
  where invite_code is null;

alter table public.households
  alter column invite_code set not null;

create unique index if not exists households_invite_code_key
  on public.households (invite_code);

-- ----------------------------------------------------------------------------
-- Co-member profile visibility.
-- profiles RLS only exposed your own row; members need to see each other's
-- name/email. shares_household() is SECURITY DEFINER so it can read membership
-- without tripping RLS recursion.
-- ----------------------------------------------------------------------------
create or replace function public.shares_household(target_user uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members a
    join public.household_members b on a.household_id = b.household_id
    where a.user_id = auth.uid()
      and b.user_id = target_user
  );
$$;

drop policy if exists "profiles_select_co_member" on public.profiles;
create policy "profiles_select_co_member" on public.profiles
  for select using (public.shares_household(id));

-- ----------------------------------------------------------------------------
-- create_household: atomically create a household + owner membership and
-- return the new id. SECURITY DEFINER so both inserts succeed as one unit.
-- ----------------------------------------------------------------------------
create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id   uuid;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'NAME_REQUIRED';
  end if;

  -- Generate a unique 6-char invite code.
  loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
    exit when not exists (select 1 from public.households where invite_code = v_code);
  end loop;

  insert into public.households (name, owner_id, invite_code)
  values (btrim(p_name), auth.uid(), v_code)
  returning id into v_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_id, auth.uid(), 'owner');

  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- join_household_by_code: join an existing household by its invite code.
-- SECURITY DEFINER so the lookup works before the caller is a member.
-- ----------------------------------------------------------------------------
create or replace function public.join_household_by_code(p_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id into v_id
  from public.households
  where invite_code = upper(btrim(p_code));

  if v_id is null then
    raise exception 'INVALID_CODE';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_id, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;

  return v_id;
end;
$$;
