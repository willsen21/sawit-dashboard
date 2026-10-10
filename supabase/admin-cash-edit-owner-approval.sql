-- Enforce owner approval for changes to the daily opening cash amount.
-- Admins may still change only the daily cash status (open/locked).
-- Run this once in Supabase SQL Editor after deploying the matching app update.

create or replace function public.guard_kebunkas_admin_record_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.current_kebunkas_role()) = 'admin'
     and tg_op = 'INSERT'
     and new.collection = 'dailyCash' then
    raise exception 'Admin tidak dapat membuat kas awal langsung; kas awal harus disetujui owner.';
  end if;

  if (select public.current_kebunkas_role()) = 'admin'
     and tg_op = 'UPDATE'
     and old.collection = 'dailyCash'
     and (old.data - 'status') is distinct from (new.data - 'status') then
    raise exception 'Admin tidak dapat mengubah nominal kas awal; perubahan harus disetujui owner.';
  end if;

  if (select public.current_kebunkas_role()) = 'admin'
     and tg_op = 'UPDATE'
     and old.collection = 'transactions'
     and (
       (old.data - 'paymentStatus' - 'grossKg' - 'netKg') is distinct from
         (new.data - 'paymentStatus' - 'grossKg' - 'netKg')
       or coalesce(old.data->>'grossKg', old.data->>'weightKg') is distinct from
         coalesce(new.data->>'grossKg', new.data->>'weightKg')
       or coalesce(old.data->>'netKg', old.data->>'weightKg') is distinct from
         coalesce(new.data->>'netKg', new.data->>'weightKg')
     ) then
    raise exception 'Admin hanya boleh memperbarui status pembayaran transaksi.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_kebunkas_admin_record_updates on public.app_records;
create trigger guard_kebunkas_admin_record_updates
before insert or update on public.app_records
for each row execute function public.guard_kebunkas_admin_record_updates();

revoke all on function public.guard_kebunkas_admin_record_updates() from public, anon, authenticated;
