-- 기존 Supabase 프로젝트의 공유 일정에 메모를 추가합니다.
alter table public.events
  add column if not exists memo text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_memo_length_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_memo_length_check check (char_length(memo) <= 500);
  end if;
end;
$$;
