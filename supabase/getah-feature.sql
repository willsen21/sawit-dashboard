-- Enable owner-managed Getah records in the shared app_records table.
-- Run once in Supabase SQL Editor before using the Getah page in cloud mode.

begin;

alter table public.app_records
  drop constraint if exists app_records_collection_check;

alter table public.app_records
  add constraint app_records_collection_check check (collection in (
    'suppliers', 'transactions', 'dailyCash', 'topups', 'cashLoans', 'auditLogs',
    'cancellationRequests', 'cashUnlockRequests', 'harvestSchedules',
    'operationalExpenses', 'payrolls', 'privateFarms', 'rubberRecords',
    'stoneStock', 'stoneSales'
  ));

commit;
