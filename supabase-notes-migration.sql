-- 커플 공유 메모 기능을 추가합니다.
create table if not exists public.couple_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists couple_notes_calendar_created_idx
  on public.couple_notes(couple_id, created_at desc);

alter table public.couple_notes enable row level security;

drop policy if exists "members view couple notes" on public.couple_notes;
drop policy if exists "members add couple notes" on public.couple_notes;
drop policy if exists "members delete couple notes" on public.couple_notes;
create policy "members view couple notes" on public.couple_notes
  for select using (public.is_couple_member(couple_id));
create policy "members add couple notes" on public.couple_notes
  for insert with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy "members delete couple notes" on public.couple_notes
  for delete using (public.is_couple_member(couple_id));

grant select, insert, delete on public.couple_notes to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couple_notes'
  ) then
    alter publication supabase_realtime add table public.couple_notes;
  end if;
end $$;
