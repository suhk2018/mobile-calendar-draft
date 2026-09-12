-- 기존 Supabase 프로젝트에 공유 캘린더 이름 변경 기능을 추가합니다.
create or replace function public.rename_couple(target_couple uuid, new_name text)
returns text language plpgsql security definer set search_path = public
as $$
declare cleaned_name text := trim(new_name);
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if cleaned_name is null or char_length(cleaned_name) not between 1 and 30 then raise exception '캘린더 이름은 1자 이상 30자 이하로 입력해 주세요'; end if;
  update public.couples set name = cleaned_name where id = target_couple and created_by = auth.uid();
  if not found then raise exception '캘린더 소유자만 이름을 변경할 수 있습니다'; end if;
  return cleaned_name;
end;
$$;

revoke all on function public.rename_couple(uuid, text) from public;
grant execute on function public.rename_couple(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couples'
  ) then
    alter publication supabase_realtime add table public.couples;
  end if;
end;
$$;
