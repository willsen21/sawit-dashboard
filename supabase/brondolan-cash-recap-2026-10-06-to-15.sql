-- Record historical Brondolan cash closures supplied by the owner.
-- Run in Supabase SQL Editor. Re-running safely updates these dates.

begin;

with closures (date_key, system_cash, counted_cash) as (
  values
    ('2026-10-06'::date, 14973600::numeric, 14935000::numeric),
    ('2026-10-07'::date, 25713400::numeric, 25728000::numeric),
    ('2026-10-08'::date, 59800000::numeric, 59822000::numeric),
    ('2026-10-09'::date, 18053800::numeric, 18125000::numeric),
    ('2026-10-10'::date, 23225900::numeric, 23284000::numeric),
    ('2026-10-11'::date, 13938700::numeric, 12961000::numeric),
    ('2026-10-12'::date, 16493600::numeric, 16503000::numeric),
    ('2026-10-13'::date,   128700::numeric,   140000::numeric),
    ('2026-10-14'::date,  8997000::numeric,  9008000::numeric),
    ('2026-10-15'::date, 25108200::numeric, 25115000::numeric)
), records as (
  select
    'dc-' || date_key::text as record_id,
    jsonb_build_object(
      'id', 'dc-' || date_key::text,
      'date', date_key::text,
      'status', 'locked',
      'systemCashAtClose', system_cash,
      'countedCash', counted_cash,
      'cashDifference', counted_cash - system_cash,
      'closedAt', now(),
      'closedBy', null,
      'manualEntry', true,
      'closureNote', 'Rekap historis dimasukkan owner berdasarkan hitungan fisik admin.'
    ) as data
  from closures
)
insert into public.app_records (collection, record_id, data, updated_at)
select 'dailyCash', record_id, data, now()
from records
on conflict (collection, record_id) do update
set data = public.app_records.data || excluded.data,
    updated_at = now();

-- Explicitly update existing rows as well, including rows that were previously
-- created with only an id/date and no closing amounts.
update public.app_records as target
set data = coalesce(target.data, '{}'::jsonb) || jsonb_build_object(
      'id', values_to_write.record_id,
      'date', values_to_write.date_key,
      'status', 'locked',
      'systemCashAtClose', values_to_write.system_cash,
      'countedCash', values_to_write.counted_cash,
      'cashDifference', values_to_write.counted_cash - values_to_write.system_cash,
      'closedAt', now(),
      'closedBy', null,
      'manualEntry', true,
      'closureNote', 'Rekap historis dimasukkan owner berdasarkan hitungan fisik admin.'
    ),
    updated_at = now()
from (
  values
    ('dc-2026-10-06', '2026-10-06', 14973600::numeric, 14935000::numeric),
    ('dc-2026-10-07', '2026-10-07', 25713400::numeric, 25728000::numeric),
    ('dc-2026-10-08', '2026-10-08', 59800000::numeric, 59822000::numeric),
    ('dc-2026-10-09', '2026-10-09', 18053800::numeric, 18125000::numeric),
    ('dc-2026-10-10', '2026-10-10', 23225900::numeric, 23284000::numeric),
    ('dc-2026-10-11', '2026-10-11', 13938700::numeric, 12961000::numeric),
    ('dc-2026-10-12', '2026-10-12', 16493600::numeric, 16503000::numeric),
    ('dc-2026-10-13', '2026-10-13',   128700::numeric,   140000::numeric),
    ('dc-2026-10-14', '2026-10-14',  8997000::numeric,  9008000::numeric),
    ('dc-2026-10-15', '2026-10-15', 25108200::numeric, 25115000::numeric)
) as values_to_write(record_id, date_key, system_cash, counted_cash)
where target.collection = 'dailyCash'
  and target.record_id = values_to_write.record_id;

commit;

-- Verify the saved daily amounts and show the ten-day totals.
with saved as (
  select
    data ->> 'date' as tanggal,
    (data ->> 'systemCashAtClose')::numeric as sisa_menurut_sistem,
    (data ->> 'countedCash')::numeric as uang_fisik_admin,
    (data ->> 'cashDifference')::numeric as selisih
  from public.app_records
  where collection = 'dailyCash'
    and record_id in (
      'dc-2026-10-06', 'dc-2026-10-07', 'dc-2026-10-08', 'dc-2026-10-09',
      'dc-2026-10-10', 'dc-2026-10-11', 'dc-2026-10-12', 'dc-2026-10-13',
      'dc-2026-10-14', 'dc-2026-10-15'
    )
)
select tanggal, sisa_menurut_sistem, uang_fisik_admin, selisih
from saved
union all
select
  'TOTAL 10 HARI',
  sum(sisa_menurut_sistem),
  sum(uang_fisik_admin),
  sum(selisih)
from saved
order by tanggal;
