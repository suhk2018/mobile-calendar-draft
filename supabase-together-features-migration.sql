-- '우리' 탭의 버킷리스트와 오늘의 질문 기능을 추가합니다.
create table if not exists public.couple_bucket_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  status text not null default 'wish' check (status in ('wish', 'planned', 'done')),
  planned_date date,
  place_name text not null default '' check (char_length(place_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_question_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  question_key text not null check (char_length(question_key) between 1 and 40),
  answer text not null check (char_length(trim(answer)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, question_key, created_by)
);

create index if not exists couple_bucket_items_calendar_status_idx
  on public.couple_bucket_items(couple_id, status, created_at desc);
create index if not exists couple_question_answers_calendar_question_idx
  on public.couple_question_answers(couple_id, question_key);

alter table public.couple_bucket_items enable row level security;
alter table public.couple_question_answers enable row level security;

drop policy if exists "members view bucket items" on public.couple_bucket_items;
drop policy if exists "members add bucket items" on public.couple_bucket_items;
drop policy if exists "members update bucket items" on public.couple_bucket_items;
drop policy if exists "members delete bucket items" on public.couple_bucket_items;
create policy "members view bucket items" on public.couple_bucket_items
  for select using (public.is_couple_member(couple_id));
create policy "members add bucket items" on public.couple_bucket_items
  for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "members update bucket items" on public.couple_bucket_items
  for update using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "members delete bucket items" on public.couple_bucket_items
  for delete using (public.is_couple_member(couple_id));

drop policy if exists "members view question answers" on public.couple_question_answers;
drop policy if exists "members add own question answers" on public.couple_question_answers;
drop policy if exists "members update own question answers" on public.couple_question_answers;
create policy "members view question answers" on public.couple_question_answers
  for select using (public.is_couple_member(couple_id));
create policy "members add own question answers" on public.couple_question_answers
  for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "members update own question answers" on public.couple_question_answers
  for update using (public.is_couple_member(couple_id) and created_by = auth.uid())
  with check (public.is_couple_member(couple_id) and created_by = auth.uid());

grant select, insert, update, delete on public.couple_bucket_items to authenticated;
grant select, insert, update on public.couple_question_answers to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couple_bucket_items'
  ) then
    alter publication supabase_realtime add table public.couple_bucket_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couple_question_answers'
  ) then
    alter publication supabase_realtime add table public.couple_question_answers;
  end if;
end $$;
