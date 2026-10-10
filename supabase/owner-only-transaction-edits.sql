-- Restrict transaction edits to owners in the shared Supabase database.
-- Admins may still insert purchase records, but cannot modify existing ones.

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
     and old.data is distinct from new.data then
    raise exception 'Admin tidak dapat mengedit catatan pembelian; hanya owner yang dapat mengubah data transaksi.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_kebunkas_admin_record_updates() from public, anon, authenticated;
