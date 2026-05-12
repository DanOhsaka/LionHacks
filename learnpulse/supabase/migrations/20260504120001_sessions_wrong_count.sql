alter table public.sessions
  add column if not exists wrong_count int default 0;
