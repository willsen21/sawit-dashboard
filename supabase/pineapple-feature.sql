-- Enable shared Nanas Gambut inventory and sales records.
-- Run once in Supabase SQL Editor before using /owner/nanas or /admin/nanas.

begin;

alter table public.app_records
  drop constraint if exists app_records_collection_check;

alter table public.app_records
  add constraint app_records_collection_check check (collection in (
    'suppliers', 'transactions', 'dailyCash', 'topups', 'cashLoans', 'auditLogs',
    'cancellationRequests', 'cashUnlockRequests', 'harvestSchedules',
    'operationalExpenses', 'payrolls', 'privateFarms', 'rubberRecords', 'rubberFactorySales',
    'stoneStock', 'stoneSales', 'pineappleStock', 'pineappleSales'
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
      'auditLogs', 'cancellationRequests', 'cashUnlockRequests', 'stoneStock', 'stoneSales',
      'pineappleStock', 'pineappleSales'
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
      'cancellationRequests', 'cashUnlockRequests', 'stoneSales', 'pineappleSales'
    )
  )
);

commit;

-- Confirm the active check constraint includes the pineapple collections.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.app_records'::regclass
  and conname = 'app_records_collection_check';
