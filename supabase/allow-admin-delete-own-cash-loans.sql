-- Let admins delete only cash loans they recorded themselves.
-- Owners retain their existing permission to delete any app record.
drop policy if exists "owner and admin delete allowed records" on public.app_records;

create policy "owner and admin delete allowed records"
on public.app_records for delete to authenticated
using (
  (select public.current_kebunkas_role()) = 'owner'
  or (
    (select public.current_kebunkas_role()) = 'admin'
    and collection = 'cashLoans'
    and data->>'adminId' = (select auth.uid())::text
  )
);
