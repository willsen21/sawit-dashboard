-- Record historical Brondolan cash closures supplied by the owner.
-- Run once in Supabase SQL Editor. Re-running updates these four dates safely.

begin;

with closures (date_key, system_cash, counted_cash) as (
  values
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

commit;

-- Verify the saved amounts and differences.
select
  data ->> 'date' as tanggal,
  (data ->> 'systemCashAtClose')::numeric as sisa_menurut_sistem,
  (data ->> 'countedCash')::numeric as uang_fisik_admin,
  (data ->> 'cashDifference')::numeric as selisih
from public.app_records
where collection = 'dailyCash'
  and record_id in (
    'dc-2026-10-12', 'dc-2026-10-13', 'dc-2026-10-14', 'dc-2026-10-15'
  )
order by data ->> 'date';
