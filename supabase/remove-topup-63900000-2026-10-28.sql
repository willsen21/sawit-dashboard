-- Hapus satu top-up Rp63.900.000 terbaru untuk tanggal 28 Okt 2026.
-- Jalankan di Supabase SQL Editor. Baris yang terhapus dikembalikan oleh RETURNING.

with target as (
  select record_id
  from public.app_records
  where collection = 'topups'
    and data ->> 'date' = '2026-10-28'
    and (data ->> 'amount')::numeric = 63900000
  order by updated_at desc
  limit 1
)
delete from public.app_records as records
using target
where records.collection = 'topups'
  and records.record_id = target.record_id
returning records.record_id, records.data;
