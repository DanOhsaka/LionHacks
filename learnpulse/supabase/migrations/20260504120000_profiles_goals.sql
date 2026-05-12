-- Optional: learner targets for dashboard analytics (run in Supabase SQL editor if missing)
alter table public.profiles
  add column if not exists goals jsonb not null default '{}'::jsonb;
