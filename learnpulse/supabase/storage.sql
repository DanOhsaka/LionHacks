-- Run in Supabase SQL Editor after schema.sql and grants.sql.
-- Creates the private bucket used by POST /api/courses/upload.

insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', false)
on conflict (id) do nothing;

drop policy if exists "course_materials_insert_own" on storage.objects;
drop policy if exists "course_materials_select_own" on storage.objects;
drop policy if exists "course_materials_update_own" on storage.objects;
drop policy if exists "course_materials_delete_own" on storage.objects;

create policy "course_materials_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "course_materials_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "course_materials_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "course_materials_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
