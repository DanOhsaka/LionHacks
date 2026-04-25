-- Run in Supabase SQL editor. Disable "Confirm email" in Auth settings.
-- Username uniqueness is enforced on profiles.username.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  break_reminders_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  subject text not null default 'General',
  storage_path text,
  completion_percent numeric not null default 0,
  last_session_at timestamptz,
  current_streak int not null default 0,
  total_time_seconds bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  chapter_index int not null default 0,
  chapter_title text not null default '',
  position int not null,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  mode text not null,
  mood int,
  score int default 0,
  accuracy_pct numeric,
  duration_seconds int,
  checkpoints_total int default 0,
  correct_count int default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, achievement_key)
);

create table if not exists public.wellness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood int not null,
  notes text,
  logged_at timestamptz not null default now()
);

create index if not exists idx_courses_user on public.courses (user_id);
create index if not exists idx_checkpoints_course on public.checkpoints (course_id);
create index if not exists idx_sessions_user on public.sessions (user_id);
create index if not exists idx_sessions_course on public.sessions (course_id);
create index if not exists idx_wellness_user on public.wellness_logs (user_id);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.checkpoints enable row level security;
alter table public.sessions enable row level security;
alter table public.achievements enable row level security;
alter table public.wellness_logs enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "courses_all_own" on public.courses for all using (auth.uid() = user_id);

create policy "checkpoints_select_own" on public.checkpoints for select
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));
create policy "checkpoints_insert_own" on public.checkpoints for insert
  with check (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));
create policy "checkpoints_update_own" on public.checkpoints for update
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));
create policy "checkpoints_delete_own" on public.checkpoints for delete
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));

create policy "sessions_all_own" on public.sessions for all using (auth.uid() = user_id);

create policy "achievements_all_own" on public.achievements for all using (auth.uid() = user_id);

create policy "wellness_all_own" on public.wellness_logs for all using (auth.uid() = user_id);

-- Storage bucket "course-materials" — create in Dashboard; policies:
-- allow authenticated users insert/select/update/delete own folder: (storage.foldername(name))[1] = auth.uid()::text
