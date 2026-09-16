-- 기존 Supabase 프로젝트에 만난 날과 방문 장소 기록을 추가합니다.
-- SQL Editor에서 이 파일 전체를 한 번 실행하세요.

begin;

create extension if not exists pgcrypto;

create table if not exists public.meeting_days (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  meeting_date date not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (couple_id, meeting_date),
  unique (id, couple_id)
);

create table if not exists public.meeting_places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  meeting_day_id uuid not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  place_name text not null check (char_length(place_name) between 1 and 80),
  address text not null default '' check (char_length(address) <= 200),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  memo text not null default '' check (char_length(memo) <= 300),
  visit_order integer not null default 1 check (visit_order > 0),
  created_at timestamptz not null default now(),
  constraint meeting_places_day_couple_fk
    foreign key (meeting_day_id, couple_id)
    references public.meeting_days(id, couple_id)
    on delete cascade
);

create index if not exists meeting_days_couple_date_idx on public.meeting_days(couple_id, meeting_date);
create index if not exists meeting_places_day_order_idx on public.meeting_places(meeting_day_id, visit_order);

alter table public.meeting_days enable row level security;
alter table public.meeting_places enable row level security;

drop policy if exists "members view meeting days" on public.meeting_days;
drop policy if exists "members add meeting days" on public.meeting_days;
drop policy if exists "members update meeting days" on public.meeting_days;
drop policy if exists "members delete meeting days" on public.meeting_days;
create policy "members view meeting days" on public.meeting_days for select using (public.is_couple_member(couple_id));
create policy "members add meeting days" on public.meeting_days for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "members update meeting days" on public.meeting_days for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "members delete meeting days" on public.meeting_days for delete using (public.is_couple_member(couple_id));

drop policy if exists "members view meeting places" on public.meeting_places;
drop policy if exists "members add meeting places" on public.meeting_places;
drop policy if exists "members update meeting places" on public.meeting_places;
drop policy if exists "members delete meeting places" on public.meeting_places;
create policy "members view meeting places" on public.meeting_places for select using (public.is_couple_member(couple_id));
create policy "members add meeting places" on public.meeting_places for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "members update meeting places" on public.meeting_places for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "members delete meeting places" on public.meeting_places for delete using (public.is_couple_member(couple_id));

grant select, insert, update, delete on public.meeting_days to authenticated;
grant select, insert, update, delete on public.meeting_places to authenticated;

-- 기존 하트 기록을 새 만난 날 테이블로 옮긴 뒤 특수 일정은 제거합니다.
insert into public.meeting_days(couple_id, meeting_date, created_by, created_at)
select couple_id, start_date, created_by, created_at
from public.events
where memo = 'couple-calendar:meeting-day:v1'
on conflict (couple_id, meeting_date) do nothing;

delete from public.events where memo = 'couple-calendar:meeting-day:v1';

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meeting_days'
  ) then
    alter publication supabase_realtime add table public.meeting_days;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meeting_places'
  ) then
    alter publication supabase_realtime add table public.meeting_places;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
