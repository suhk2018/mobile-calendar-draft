-- Supabase SQL Editor에서 이 파일 전체를 한 번 실행하세요.
create extension if not exists pgcrypto;

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table public.events (
  id text primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 42),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  event_time time,
  color text not null default 'mint' check (color in ('mint', 'coral', 'violet', 'sun', 'blue', 'pink', 'sky', 'lime', 'orange', 'red')),
  created_at timestamptz not null default now()
);

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.events enable row level security;

create function public.is_couple_member(target_couple uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.couple_members where couple_id = target_couple and user_id = auth.uid()) $$;

create policy "members view couple" on public.couples for select using (public.is_couple_member(id));
create policy "members view memberships" on public.couple_members for select using (public.is_couple_member(couple_id));
create policy "members view events" on public.events for select using (public.is_couple_member(couple_id));
create policy "members add events" on public.events for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "members update events" on public.events for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "members delete events" on public.events for delete using (public.is_couple_member(couple_id));

create function public.create_couple(couple_name text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  insert into public.couples(name, created_by) values (trim(couple_name), auth.uid()) returning id into new_id;
  insert into public.couple_members(couple_id, user_id) values (new_id, auth.uid());
  return new_id;
end;
$$;

create function public.join_couple(invitation_code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare target_id uuid; member_count integer;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select id into target_id from public.couples where invite_code = upper(trim(invitation_code));
  if target_id is null then raise exception '초대 코드를 찾을 수 없습니다'; end if;
  select count(*) into member_count from public.couple_members where couple_id = target_id;
  if member_count >= 2 then raise exception '이미 두 명이 참여한 캘린더입니다'; end if;
  insert into public.couple_members(couple_id, user_id) values (target_id, auth.uid()) on conflict do nothing;
  return target_id;
end;
$$;

create function public.delete_or_leave_couple(target_couple uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare owner_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if not exists(select 1 from public.couple_members where couple_id = target_couple and user_id = auth.uid()) then raise exception '참여 중인 캘린더가 아닙니다'; end if;
  select created_by into owner_id from public.couples where id = target_couple;
  if owner_id = auth.uid() then
    delete from public.couples where id = target_couple;
    return 'deleted';
  end if;
  delete from public.couple_members where couple_id = target_couple and user_id = auth.uid();
  return 'left';
end;
$$;

revoke all on function public.create_couple(text) from public;
revoke all on function public.join_couple(text) from public;
revoke all on function public.is_couple_member(uuid) from public;
revoke all on function public.delete_or_leave_couple(uuid) from public;
grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.delete_or_leave_couple(uuid) to authenticated;

alter publication supabase_realtime add table public.events;
