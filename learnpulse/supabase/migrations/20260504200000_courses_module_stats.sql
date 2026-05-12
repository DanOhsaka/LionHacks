-- Cumulative per-chapter assessment stats (updated when a session completes)
alter table public.courses
  add column if not exists module_stats jsonb not null default '{}'::jsonb;
