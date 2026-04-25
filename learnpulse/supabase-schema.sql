-- PridePath schema: profiles, courses, checkpoints, sessions, achievements, wellness_logs
-- Run in Supabase SQL editor after project creation.

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

-- Courses owned by a user
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Checkpoints belong to a course and user (denormalized user_id for RLS)
create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  position int not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Study / focus sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  notes text
);

-- Achievements unlocked per user
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, achievement_key)
);

-- Wellness check-ins
create table if not exists public.wellness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  mood int check (mood is null or (mood >= 1 and mood <= 5)),
  energy int check (energy is null or (energy >= 1 and energy <= 5)),
  notes text
);

-- Helpful indexes
create index if not exists courses_user_id_idx on public.courses (user_id);
create index if not exists checkpoints_course_id_idx on public.checkpoints (course_id);
create index if not exists checkpoints_user_id_idx on public.checkpoints (user_id);
create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists achievements_user_id_idx on public.achievements (user_id);
create index if not exists wellness_logs_user_id_idx on public.wellness_logs (user_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.checkpoints enable row level security;
alter table public.sessions enable row level security;
alter table public.achievements enable row level security;
alter table public.wellness_logs enable row level security;

-- profiles: users only touch their own row
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- courses
create policy "courses_select_own"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "courses_insert_own"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "courses_update_own"
  on public.courses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "courses_delete_own"
  on public.courses for delete
  using (auth.uid() = user_id);

-- checkpoints
create policy "checkpoints_select_own"
  on public.checkpoints for select
  using (auth.uid() = user_id);

create policy "checkpoints_insert_own"
  on public.checkpoints for insert
  with check (auth.uid() = user_id);

create policy "checkpoints_update_own"
  on public.checkpoints for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "checkpoints_delete_own"
  on public.checkpoints for delete
  using (auth.uid() = user_id);

-- sessions
create policy "sessions_select_own"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "sessions_insert_own"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "sessions_update_own"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions_delete_own"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- achievements
create policy "achievements_select_own"
  on public.achievements for select
  using (auth.uid() = user_id);

create policy "achievements_insert_own"
  on public.achievements for insert
  with check (auth.uid() = user_id);

create policy "achievements_update_own"
  on public.achievements for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "achievements_delete_own"
  on public.achievements for delete
  using (auth.uid() = user_id);

-- wellness_logs
create policy "wellness_logs_select_own"
  on public.wellness_logs for select
  using (auth.uid() = user_id);

create policy "wellness_logs_insert_own"
  on public.wellness_logs for insert
  with check (auth.uid() = user_id);

create policy "wellness_logs_update_own"
  on public.wellness_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "wellness_logs_delete_own"
  on public.wellness_logs for delete
  using (auth.uid() = user_id);
