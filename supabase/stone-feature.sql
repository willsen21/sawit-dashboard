-- Add the shared Batu inventory and sales collections to an existing project.
-- Run once in Supabase SQL Editor after deploying the app update.

begin;

alter table public.app_records
  drop constraint if exists app_records_collection_check;

alter table public.app_records
  add constraint app_records_collection_check check (collection in (
    'suppliers', 'transactions', 'dailyCash', 'topups', 'cashLoans', 'auditLogs',
    'cancellationRequests', 'cashUnlockRequests', 'harvestSchedules',
    'operationalExpenses', 'payrolls', 'privateFarms', 'stoneStock', 'stoneSales'
  ));

drop policy if exists "active members read app records" on public.app_records;
create policy "active members read app records"
on public.app_records for select to authenticated
using (
  (select public.current_kebunkas_role()) = 'owner'
  or (
    (select public.current_kebunkas_role()) = 'admin'
    and collection in (
      'suppliers', 'transactions', 'dailyCash', 'topups', 'cashLoans',
      'auditLogs', 'cancellationRequests', 'cashUnlockRequests', 'stoneStock', 'stoneSales'
    )
  )
);

drop policy if exists "owner and admin insert allowed records" on public.app_records;
create policy "owner and admin insert allowed records"
on public.app_records for insert to authenticated
with check (
  (select public.current_kebunkas_role()) = 'owner'
  or (
    (select public.current_kebunkas_role()) = 'admin'
    and collection in (
      'transactions', 'dailyCash', 'topups', 'cashLoans', 'auditLogs',
      'cancellationRequests', 'cashUnlockRequests', 'stoneSales'
    )
  )
);

commit;
