create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  venue text not null,
  starts_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_events_starts_at on public.events(starts_at);
create index if not exists idx_registrations_event_id on public.registrations(event_id);
create index if not exists idx_registrations_user_id on public.registrations(user_id);
create index if not exists idx_profiles_role on public.profiles(role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace trigger trg_events_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.role = 'admin'
  );
$$;

create or replace function public.promote_user_to_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  select id into target_id
  from auth.users
  where email = target_email;

  if target_id is null then
    raise exception 'No auth user found for %', target_email;
  end if;

  update public.profiles
  set role = 'admin',
      updated_at = now()
  where id = target_id;

  if not found then
    raise exception 'Profile row not found for %', target_email;
  end if;
end;
$$;

create or replace function public.get_event_stats()
returns table (event_id uuid, registration_count bigint)
language sql
security definer
set search_path = public
as $$
  select e.id as event_id, count(r.id)::bigint as registration_count
  from public.events e
  left join public.registrations r on r.event_id = e.id
  group by e.id;
$$;

create or replace function public.register_for_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_capacity integer;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  if public.is_admin(v_user_id) then
    raise exception 'Admins cannot register as attendees in this sample app.';
  end if;

  select capacity
    into v_capacity
  from public.events
  where id = p_event_id
  for update;

  if v_capacity is null then
    raise exception 'Event not found.';
  end if;

  select count(*)
    into v_count
  from public.registrations
  where event_id = p_event_id;

  if v_count >= v_capacity then
    raise exception 'Event is full.';
  end if;

  insert into public.registrations (event_id, user_id)
  values (p_event_id, v_user_id);
exception
  when unique_violation then
    raise exception 'You are already registered for this event.';
end;
$$;

create or replace function public.cancel_registration(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  delete from public.registrations
  where event_id = p_event_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Registration not found.';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.events from anon, authenticated;
revoke all on public.registrations from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select on public.registrations to authenticated;
grant execute on function public.get_event_stats() to authenticated;
grant execute on function public.register_for_event(uuid) to authenticated;
grant execute on function public.cancel_registration(uuid) to authenticated;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

create policy "events_select_authenticated"
on public.events
for select
to authenticated
using (true);

create policy "events_insert_admin"
on public.events
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "events_update_admin"
on public.events
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "events_delete_admin"
on public.events
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "registrations_select_own_or_admin"
on public.registrations
for select
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- 初回管理者昇格用のサンプル。最初のユーザー登録後に email を置き換えて実行してください。
-- select public.promote_user_to_admin('your-admin@example.com');
