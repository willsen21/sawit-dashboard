-- Kebun Kas cleanup boundary: remove legacy records dated before 10 Oct 2026.
-- Backdated records created on or after 10 Oct 2026 are preserved.
-- Run the PREVIEW query first and inspect the counts. Then select and run the
-- CLEANUP block separately. Data dated 10 Oct 2026 or later is preserved.
-- Master supplier/farm records are preserved; only dated farm harvest records
-- inside privateFarms are cleaned. Payroll is monthly, so months before Oct 2026
-- are removed and the whole Oct 2026 payroll period is preserved.

-- PREVIEW: expected rows affected by collection.
with counts as (
  select collection, count(*)::bigint as rows_to_delete
  from public.app_records
  where
    (collection in ('transactions', 'dailyCash', 'topups', 'cashLoans', 'cashUnlockRequests', 'harvestSchedules', 'operationalExpenses')
      and data->>'date' < '2026-10-10'
      and (nullif(data->>'createdAt', '') is null or (data->>'createdAt')::timestamptz < timestamptz '2026-10-10 00:00:00+07'))
    or (collection in ('auditLogs', 'cancellationRequests')
      and nullif(data->>'createdAt', '') is not null
      and (data->>'createdAt')::timestamptz < timestamptz '2026-10-10 00:00:00+07')
    or (collection = 'payrolls' and data->>'period' < '2026-10')
  group by collection
), farm_record_counts as (
  select 'privateFarms.harvestRecords' as collection,
         count(*)::bigint as rows_to_delete
  from public.app_records ar
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(ar.data->'records') = 'array' then ar.data->'records' else '[]'::jsonb end
  ) as record(value)
  where ar.collection = 'privateFarms'
    and record.value->>'date' < '2026-10-10'
    and (nullif(record.value->>'createdAt', '') is null or (record.value->>'createdAt')::timestamptz < timestamptz '2026-10-10 00:00:00+07')
)
select collection, rows_to_delete from counts
union all
select collection, rows_to_delete from farm_record_counts
order by collection;

-- CLEANUP: select this whole block and run it only after reviewing PREVIEW.
begin;

delete from public.app_records
where
  (collection in ('transactions', 'dailyCash', 'topups', 'cashLoans', 'cashUnlockRequests', 'harvestSchedules', 'operationalExpenses')
    and data->>'date' < '2026-10-10'
    and (nullif(data->>'createdAt', '') is null or (data->>'createdAt')::timestamptz < timestamptz '2026-10-10 00:00:00+07'))
  or (collection in ('auditLogs', 'cancellationRequests')
    and nullif(data->>'createdAt', '') is not null
    and (data->>'createdAt')::timestamptz < timestamptz '2026-10-10 00:00:00+07')
  or (collection = 'payrolls' and data->>'period' < '2026-10');

update public.app_records ar
set data = jsonb_set(
  ar.data,
  '{records}',
  coalesce((
    select jsonb_agg(record.value order by record.ordinality)
    from jsonb_array_elements(
      case when jsonb_typeof(ar.data->'records') = 'array' then ar.data->'records' else '[]'::jsonb end
    ) with ordinality as record(value, ordinality)
    where record.value->>'date' is null
      or record.value->>'date' >= '2026-10-10'
      or (nullif(record.value->>'createdAt', '') is not null and (record.value->>'createdAt')::timestamptz >= timestamptz '2026-10-10 00:00:00+07')
  ), '[]'::jsonb),
  true
),
updated_at = now()
where ar.collection = 'privateFarms'
  and jsonb_typeof(ar.data->'records') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(ar.data->'records') as record(value)
    where record.value->>'date' < '2026-10-10'
      and (nullif(record.value->>'createdAt', '') is null or (record.value->>'createdAt')::timestamptz < timestamptz '2026-10-10 00:00:00+07')
  );

commit;
