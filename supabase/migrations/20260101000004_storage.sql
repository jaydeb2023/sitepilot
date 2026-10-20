-- ============================================================
-- SitePilot · Private file storage (run 4 of 4)
-- Bucket is private; files live under  <company_id>/...  and are only
-- readable by members of that company. Download via signed URLs.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-files', 'project-files', false, 15728640, array[
  'image/jpeg','image/png','image/webp','application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "project files: read own company" on storage.objects for select to authenticated
  using (bucket_id = 'project-files' and (storage.foldername(name))[1] = public.current_company_id()::text);

create policy "project files: upload own company" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files'
              and (storage.foldername(name))[1] = public.current_company_id()::text
              and public.current_role_name() in ('owner','manager','engineer','storekeeper','accountant','contractor'));

create policy "project files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'project-files'
         and (storage.foldername(name))[1] = public.current_company_id()::text
         and (owner = auth.uid() or public.current_role_name() in ('owner','manager')));
