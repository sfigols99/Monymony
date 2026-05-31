-- ============================================================================
-- 0003 — Receipt photo storage for OCR-sourced expenses.
--
-- Private bucket `receipts`. Objects are laid out as `{household_id}/{file}`,
-- so access is scoped to household membership by inspecting the first path
-- segment with the existing is_household_member() helper. Apply in the Supabase
-- SQL editor after 0001 and 0002.
-- ============================================================================

-- Private bucket (no public URLs; read via signed URLs or the authenticated API).
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- RLS on storage.objects, scoped to the household encoded in the object path.
-- (storage.foldername(name))[1] is the leading `{household_id}` folder.
-- ----------------------------------------------------------------------------
create policy "receipts_select_member"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts_insert_member"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts_delete_member"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );
