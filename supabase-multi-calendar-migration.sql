-- 기존 Supabase 프로젝트에서 공유 캘린더 여러 개와 추가 색상을 사용하기 위한 마이그레이션입니다.
alter table public.couple_members drop constraint if exists couple_members_user_id_key;

alter table public.events drop constraint if exists events_color_check;
alter table public.events add constraint events_color_check
  check (color in ('mint', 'coral', 'violet', 'sun', 'blue', 'pink', 'sky', 'lime', 'orange', 'red'));

create or replace function public.create_couple(couple_name text)
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

create or replace function public.join_couple(invitation_code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare target_id uuid; member_count integer;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select id into target_id from public.couples where invite_code = upper(trim(invitation_code));
  if target_id is null then raise exception '초대 코드를 찾을 수 없습니다'; end if;
  if exists(select 1 from public.couple_members where couple_id = target_id and user_id = auth.uid()) then return target_id; end if;
  select count(*) into member_count from public.couple_members where couple_id = target_id;
  if member_count >= 2 then raise exception '이미 두 명이 참여한 캘린더입니다'; end if;
  insert into public.couple_members(couple_id, user_id) values (target_id, auth.uid());
  return target_id;
end;
$$;
