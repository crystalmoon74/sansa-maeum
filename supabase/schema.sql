-- 산사(山寺)의 마음 — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여 넣고 실행하세요.

create extension if not exists pgcrypto;

-- 템플스테이 수행 기록
create table if not exists public.temple_stays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  temple_id text not null check (temple_id in ('bulguksa','haeinsa','tongdosa','songgwangsa','buseoksa')),
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  reflection text check (char_length(reflection) <= 2000),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 템플스테이 단계별 활동 기록
create table if not exists public.stay_activities (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.temple_stays (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  step_key text not null check (step_key in ('arrival','yebul','gongyang','ulyeok','meditation','dharma','hoehyang')),
  note text check (char_length(note) <= 1000),
  duration_sec int not null default 0 check (duration_sec between 0 and 21600),
  created_at timestamptz not null default now()
);
create index if not exists stay_activities_stay_idx on public.stay_activities (stay_id);

-- 소원 기원
create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  temple_id text not null check (temple_id in ('bulguksa','haeinsa','tongdosa','songgwangsa','buseoksa')),
  for_whom text not null check (for_whom in ('self','child','family','other')),
  category text not null check (category in ('suneung','exam','health','peace','etc')),
  content text not null check (char_length(content) between 1 and 1000),
  bows int not null check (bows between 1 and 10000),
  nickname text not null check (char_length(nickname) <= 20),
  share_id text not null unique check (char_length(share_id) between 16 and 64),
  created_at timestamptz not null default now()
);

-- ---------- RLS: 본인 데이터만 접근 ----------
alter table public.temple_stays enable row level security;
alter table public.stay_activities enable row level security;
alter table public.wishes enable row level security;

drop policy if exists "own stays" on public.temple_stays;
create policy "own stays" on public.temple_stays
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own activities" on public.stay_activities;
create policy "own activities" on public.stay_activities
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.temple_stays s where s.id = stay_id and s.user_id = auth.uid())
  );

drop policy if exists "own wishes" on public.wishes;
create policy "own wishes" on public.wishes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 공유 편지: share_id 를 아는 사람만, 이메일/user_id 없이 조회 ----------
create or replace function public.get_shared_letter(p_share_id text)
returns table (temple_id text, for_whom text, category text, content text, bows int, nickname text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select w.temple_id, w.for_whom, w.category, w.content, w.bows, w.nickname, w.created_at
  from public.wishes w
  where w.share_id = p_share_id
  limit 1;
$$;

revoke all on function public.get_shared_letter(text) from public;
grant execute on function public.get_shared_letter(text) to anon, authenticated;
