-- 기존 Supabase 프로젝트에 커플의 처음 만난 날과 D-day 기능을 추가합니다.
alter table public.couples add column if not exists first_met_on date;

create or replace function public.set_couple_anniversary(target_couple uuid, new_date date)
returns date language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if new_date is null then raise exception '처음 만난 날을 입력해 주세요'; end if;
  update public.couples set first_met_on = new_date
  where id = target_couple
    and exists(select 1 from public.couple_members where couple_id = target_couple and user_id = auth.uid());
  if not found then raise exception '참여 중인 캘린더만 변경할 수 있습니다'; end if;
  return new_date;
end;
$$;

revoke all on function public.set_couple_anniversary(uuid, date) from public;
grant execute on function public.set_couple_anniversary(uuid, date) to authenticated;
