-- Enable owner-managed Getah records in the shared app_records table.
-- Run once in Supabase SQL Editor before using the Getah page in cloud mode.

do $$
begin
  alter table public.app_records
    drop constraint if exists app_records_collection_check;

  alter table public.app_records
    add constraint app_records_collection_check check (collection in (
      'suppliers', 'transactions', 'dailyCash', 'topups', 'cashLoans', 'auditLogs',
      'cancellationRequests', 'cashUnlockRequests', 'harvestSchedules',
      'operationalExpenses', 'payrolls', 'privateFarms', 'rubberRecords', 'rubberFactorySales',
      'stoneStock', 'stoneSales', 'pineappleStock', 'pineappleSales'
    ));
end;
$$;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.app_records'::regclass
  and conname = 'app_records_collection_check';
