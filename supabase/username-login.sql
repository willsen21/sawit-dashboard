-- Enable username-based login while keeping Supabase Auth email addresses private.
-- Run once in Supabase SQL Editor, then assign a username to each profile.

alter table public.profiles
  add column if not exists username text;

with normalized as (
  select
    id,
    coalesce(
      nullif(left(trim(both '.' from regexp_replace(lower(trim(display_name)), '[^a-z0-9]+', '.', 'g')), 32), ''),
      'user'
    ) as base
  from public.profiles
  where username is null or btrim(username) = ''
), ranked as (
  select id, base, count(*) over (partition by base) as base_count
  from normalized
)
update public.profiles as profile
set username = case
  when length(ranked.base) < 2 or ranked.base_count > 1
    then left(ranked.base, 30) || '.' || left(ranked.id::text, 6)
  else ranked.base
end
from ranked
where profile.id = ranked.id;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

grant update (username) on public.profiles to authenticated;

-- Review the generated usernames here. The owner can change one by updating
-- the profile row with its UUID, keeping usernames unique and lowercase.
select id, display_name, email, username
from public.profiles
order by created_at;

-- Example (replace UUID and username with the values for the account):
-- update public.profiles
-- set username = 'papa'
-- where id = '00000000-0000-0000-0000-000000000000';
