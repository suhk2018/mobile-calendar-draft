-- 기존 Supabase 프로젝트에 생일 공유 기능을 추가합니다.
alter table public.couple_members
  add column if not exists birthday date;

create or replace function public.set_member_birthday(target_couple uuid, new_birthday date)
returns date language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if new_birthday is null or new_birthday > current_date then raise exception '올바른 생일을 입력해 주세요'; end if;
  update public.couple_members set birthday = new_birthday
  where couple_id = target_couple and user_id = auth.uid();
  if not found then raise exception '참여 중인 캘린더만 변경할 수 있습니다'; end if;
  return new_birthday;
end;
$$;

revoke all on function public.set_member_birthday(uuid, date) from public;
grant execute on function public.set_member_birthday(uuid, date) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_members'
  ) then
    alter publication supabase_realtime add table public.couple_members;
  end if;
end;
$$;
