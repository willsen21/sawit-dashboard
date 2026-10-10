-- Keep direct app_records deletion restricted to owners.
-- Admins create a request; the owner deletes the loan only after approval.
drop policy if exists "owner and admin delete allowed records" on public.app_records;

create policy "owner and admin delete allowed records"
on public.app_records for delete to authenticated
using ((select public.current_kebunkas_role()) = 'owner');
