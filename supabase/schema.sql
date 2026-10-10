-- Kebun Kas cloud data bootstrap.
-- Run this in Supabase SQL Editor after creating Auth users for the owner/admin.
-- Do not put a Supabase secret/service_role key in the browser application.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null unique,
  role text not null check (role in ('owner', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.app_records (
  collection text not null check (collection in (
    'suppliers', 'transactions', 'dailyCash', 'topups', 'cashLoans', 'auditLogs',
    'cancellationRequests', 'cashUnlockRequests', 'harvestSchedules',
    'operationalExpenses', 'payrolls', 'privateFarms'
  )),
  record_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  check (record_id = data ->> 'id'),
  primary key (collection, record_id)
);

create index if not exists app_records_collection_idx on public.app_records (collection);

create or replace function public.current_kebunkas_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.active = true
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.app_records enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.app_records from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, active) on public.profiles to authenticated;
grant select, insert, update, delete on public.app_records to authenticated;
grant execute on function public.current_kebunkas_role() to authenticated;
revoke all on function public.current_kebunkas_role() from public, anon;
grant execute on function public.current_kebunkas_role() to authenticated;

drop policy if exists "profiles read self or owner" on public.profiles;
create policy "profiles read self or owner"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.current_kebunkas_role()) = 'owner');

drop policy if exists "owner manages profile status" on public.profiles;
create policy "owner manages profile status"
on public.profiles for update to authenticated
using ((select public.current_kebunkas_role()) = 'owner')
with check ((select public.current_kebunkas_role()) = 'owner');

drop policy if exists "active members read app records" on public.app_records;
create policy "active members read app records"
on public.app_records for select to authenticated
using (
  (select public.current_kebunkas_role()) = 'owner'
  or (
    (select public.current_kebunkas_role()) = 'admin'
    and collection in (
      'suppliers', 'transactions', 'dailyCash', 'topups', 'cashLoans',
      'auditLogs', 'cancellationRequests', 'cashUnlockRequests'
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
      'cancellationRequests', 'cashUnlockRequests'
    )
  )
);

drop policy if exists "owner and admin update allowed records" on public.app_records;
create policy "owner and admin update allowed records"
on public.app_records for update to authenticated
using (
  (select public.current_kebunkas_role()) = 'owner'
  or (
    (select public.current_kebunkas_role()) = 'admin'
    and collection in ('transactions', 'dailyCash')
  )
)
with check (
  (select public.current_kebunkas_role()) = 'owner'
  or (
    (select public.current_kebunkas_role()) = 'admin'
    and collection in ('transactions', 'dailyCash')
  )
);

drop policy if exists "owner and admin delete allowed records" on public.app_records;
create policy "owner and admin delete allowed records"
on public.app_records for delete to authenticated
using (
  (select public.current_kebunkas_role()) = 'owner'
  or (
    (select public.current_kebunkas_role()) = 'admin'
    and collection = 'cashLoans'
    and data->>'adminId' = (select auth.uid())::text
  )
);

-- Admins can confirm a payment, but cannot rewrite transaction amounts or approve their own cancellation requests.
create or replace function public.guard_kebunkas_admin_record_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.current_kebunkas_role()) = 'admin'
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
before update on public.app_records
for each row execute function public.guard_kebunkas_admin_record_updates();
revoke all on function public.guard_kebunkas_admin_record_updates() from public, anon, authenticated;

-- Realtime is used for changes made on another signed-in device.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_records'
  ) then
    alter publication supabase_realtime add table public.app_records;
  end if;
end $$;
