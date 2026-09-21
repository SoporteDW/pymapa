-- M1-C · Initial RLS policies (tenant isolation via organization membership)
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

drop function if exists public.is_organization_member(uuid);
drop function if exists public.has_organization_role(uuid, public.membership_role[]);

create or replace function private.is_organization_member(_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.organization_id = _organization_id and m.user_id = auth.uid())
$$;

create or replace function private.has_organization_role(_organization_id uuid, _roles public.membership_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.organization_id = _organization_id and m.user_id = auth.uid() and m.role = any (_roles))
$$;

revoke all on function private.is_organization_member(uuid) from public, anon;
revoke all on function private.has_organization_role(uuid, public.membership_role[]) from public, anon;
grant execute on function private.is_organization_member(uuid) to authenticated, service_role;
grant execute on function private.has_organization_role(uuid, public.membership_role[]) to authenticated, service_role;

-- knowledge_versions: governed catalog, read-only for signed-in users
create policy "knowledge_versions_read" on public.knowledge_versions
  for select to authenticated using (true);

-- organizations
create policy "organizations_select_members" on public.organizations
  for select to authenticated using (private.is_organization_member(id));
create policy "organizations_insert_authenticated" on public.organizations
  for insert to authenticated with check (true);
create policy "organizations_update_admins" on public.organizations
  for update to authenticated
  using (private.has_organization_role(id, array['OWNER','ADMIN']::public.membership_role[]))
  with check (private.has_organization_role(id, array['OWNER','ADMIN']::public.membership_role[]));

-- memberships
create policy "memberships_select_own" on public.memberships
  for select to authenticated using (user_id = auth.uid());
create policy "memberships_select_org_admins" on public.memberships
  for select to authenticated
  using (private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.membership_role[]));
create policy "memberships_insert_admins" on public.memberships
  for insert to authenticated
  with check (private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.membership_role[]));
create policy "memberships_update_admins" on public.memberships
  for update to authenticated
  using (private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.membership_role[]))
  with check (private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.membership_role[]));
create policy "memberships_delete_admins" on public.memberships
  for delete to authenticated
  using (private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.membership_role[]));

-- cases
create policy "cases_select_members" on public.cases
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "cases_insert_members" on public.cases
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy "cases_update_members" on public.cases
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));
create policy "cases_delete_admins" on public.cases
  for delete to authenticated
  using (private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.membership_role[]));

-- assessments
create policy "assessments_select_members" on public.assessments
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "assessments_insert_members" on public.assessments
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy "assessments_update_members" on public.assessments
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

-- responses: append-only inside the tenant
create policy "responses_select_members" on public.responses
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "responses_insert_members" on public.responses
  for insert to authenticated
  with check (private.is_organization_member(organization_id) and (submitted_by is null or submitted_by = auth.uid()));

-- engine-owned tables: read-only for members, writes reserved to service role
create policy "observations_select_members" on public.observations
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "evaluation_runs_select_members" on public.evaluation_runs
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "variable_evaluations_select_members" on public.variable_evaluations
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "information_need_states_select_members" on public.information_need_states
  for select to authenticated using (private.is_organization_member(organization_id));