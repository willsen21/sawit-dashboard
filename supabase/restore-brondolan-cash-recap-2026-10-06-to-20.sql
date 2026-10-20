-- Restore the original cash-closing snapshot values for 6–20 Oct 2026.
-- Dates 6–15 use the figures previously supplied by the owner.
-- Dates 16–20 are recovered from the untouched "Menutup kas harian" audit log.
-- For 20 Oct, this removes only owner-correction metadata and restores the
-- physical/system values from the original close log; it does not delete the day.

begin;

with supplied (date_key, system_cash, counted_cash) as (
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
), logged_closures as (
  select
    (parsed.parts[1])::date as date_key,
    replace(parsed.parts[2], '.', '')::numeric as system_cash,
    replace(parsed.parts[3], '.', '')::numeric as counted_cash,
    row_number() over (
      partition by (parsed.parts[1])::date
      order by log.data ->> 'createdAt' desc, log.updated_at desc
    ) as latest
  from public.app_records as log
  cross join lateral regexp_match(
    log.data ->> 'detail',
    '^([0-9]{4}-[0-9]{2}-[0-9]{2}): sistem Rp([0-9.]+), fisik Rp([0-9.]+), selisih Rp-?[0-9.]+$'
  ) as parsed(parts)
  where log.collection = 'auditLogs'
    and log.data ->> 'action' = 'Menutup kas harian'
    and (parsed.parts[1])::date between '2026-10-16'::date and '2026-10-20'::date
), originals as (
  select date_key, system_cash, counted_cash from supplied
  union all
  select date_key, system_cash, counted_cash
  from logged_closures
  where latest = 1
), updated as (
  update public.app_records as target
  set data = (coalesce(target.data, '{}'::jsonb) - 'countedCashEditedAt' - 'countedCashEditedBy') || jsonb_build_object(
        'systemCashAtClose', originals.system_cash,
        'countedCash', originals.counted_cash,
        'cashDifference', originals.counted_cash - originals.system_cash
      ),
      updated_at = now()
  from originals
  where target.collection = 'dailyCash'
    and target.record_id = 'dc-' || originals.date_key::text
  returning target.data
)
select
  data ->> 'date' as tanggal,
  (data ->> 'systemCashAtClose')::numeric as sisa_menurut_sistem,
  (data ->> 'countedCash')::numeric as uang_fisik_admin,
  (data ->> 'cashDifference')::numeric as selisih,
  case when data ? 'countedCashEditedAt' then 'metadata koreksi masih ada' else 'metadata koreksi dihapus' end as status_koreksi
from updated
order by data ->> 'date';

commit;
