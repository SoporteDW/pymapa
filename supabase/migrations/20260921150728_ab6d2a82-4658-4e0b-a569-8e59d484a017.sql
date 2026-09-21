drop policy if exists "knowledge_versions_read" on public.knowledge_versions;
create policy "knowledge_versions_read_published" on public.knowledge_versions
  for select to authenticated
  using (status in ('PUBLISHED'::public.knowledge_version_status, 'SUPERSEDED'::public.knowledge_version_status));