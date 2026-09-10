-- 기존 Supabase 프로젝트에 공유 캘린더 삭제/나가기 기능을 추가합니다.
create or replace function public.delete_or_leave_couple(target_couple uuid)
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

revoke all on function public.delete_or_leave_couple(uuid) from public;
grant execute on function public.delete_or_leave_couple(uuid) to authenticated;
