-- If your project was created from an older `supabase-schema.sql`, the `courses` table
-- is missing columns the app selects/updates. Run this in the Supabase SQL editor once.

alter table public.courses
  add column if not exists subject text not null default 'General';

alter table public.courses
  add column if not exists storage_path text;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'courses'
      and column_name = 'completion_percent'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'courses'
        and column_name = 'completion_pct'
    ) then
      alter table public.courses rename column completion_pct to completion_percent;
    else
      alter table public.courses
        add column completion_percent numeric not null default 0;
    end if;
  end if;
end $$;

alter table public.courses
  add column if not exists last_session_at timestamptz;

alter table public.courses
  add column if not exists current_streak int not null default 0;

alter table public.courses
  add column if not exists total_time_seconds bigint not null default 0;
