-- ============================================================
-- M1-EFG · 0. Corrección de seguridad
-- bootstrap_organization() (SECURITY DEFINER) es el único camino
-- gobernado para crear una organización. Se elimina la política
-- genérica que permitía inserts directos desde el cliente.
-- ============================================================
drop policy if exists "organizations_insert_authenticated" on public.organizations;

-- ============================================================
-- 1. Enums
-- ============================================================
create type public.respondent_status as enum ('INVITED', 'ACTIVE', 'REVOKED');
create type public.assignment_scope_type as enum ('DOMAIN', 'CAPABILITY', 'INFORMATION_NEED', 'SECTION');
create type public.assignment_status as enum ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELEGATED', 'REVOKED');
create type public.invitation_status as enum ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
create type public.evidence_source as enum ('HUMAN_RESPONDENT', 'DOCUMENT', 'SYSTEM_RECORD', 'OBSERVED_EXECUTION');

-- ============================================================
-- 2. respondents  (User ≠ Membership ≠ Respondent)
-- ============================================================
create table public.respondents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Un respondent puede existir sin cuenta y sin membership.
  user_id uuid,
  email text,
  display_name text,
  role_label text,
  status public.respondent_status not null default 'INVITED',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index respondents_org_email_key on public.respondents (organization_id, lower(email)) where email is not null;
create index respondents_user_idx on public.respondents (user_id) where user_id is not null;

grant select, insert, update, delete on public.respondents to authenticated;
grant all on public.respondents to service_role;
alter table public.respondents enable row level security;

-- ============================================================
-- 3. assignments (scope-based)
-- ============================================================
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  respondent_id uuid not null references public.respondents(id) on delete cascade,
  scope_type public.assignment_scope_type not null,
  -- Referencia gobernada del alcance: OP-01, NI01, VA06, etc.
  scope_ref text not null,
  status public.assignment_status not null default 'PENDING',
  -- Delegación: esta asignación nace de otra.
  delegated_from_assignment_id uuid references public.assignments(id) on delete set null,
  delegation_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index assignments_unique_scope on public.assignments (assessment_id, respondent_id, scope_type, scope_ref);
create index assignments_assessment_idx on public.assignments (assessment_id);

grant select, insert, update, delete on public.assignments to authenticated;
grant all on public.assignments to service_role;
alter table public.assignments enable row level security;

-- ============================================================
-- 4. invitations
-- ============================================================
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  respondent_id uuid not null references public.respondents(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  status public.invitation_status not null default 'PENDING',
  -- Solo el hash del token: nunca el token en claro.
  token_hash text not null,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index invitations_token_hash_key on public.invitations (token_hash);
create index invitations_respondent_idx on public.invitations (respondent_id);

grant select, insert, update, delete on public.invitations to authenticated;
grant all on public.invitations to service_role;
alter table public.invitations enable row level security;

-- ============================================================
-- 5. evidence  (archivos en storage, nunca binarios en Postgres)
-- ============================================================
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  -- Candidato gobernado del pack, p. ej. OP01-EV01. Nunca se inventa.
  candidate_ref text,
  evidence_type text not null,
  source public.evidence_source not null,
  storage_bucket text,
  storage_path text,
  external_reference text,
  title text,
  note text,
  submitted_by uuid,
  respondent_id uuid references public.respondents(id) on delete set null,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index evidence_assessment_idx on public.evidence (assessment_id);

grant select, insert, update, delete on public.evidence to authenticated;
grant all on public.evidence to service_role;
alter table public.evidence enable row level security;

-- ============================================================
-- 6. observation_evidence  (Evidence ↔ Observation, N:M)
-- ============================================================
create table public.observation_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  observation_id uuid not null references public.observations(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index observation_evidence_unique on public.observation_evidence (observation_id, evidence_id);

grant select on public.observation_evidence to authenticated;
grant all on public.observation_evidence to service_role;
alter table public.observation_evidence enable row level security;

-- ============================================================
-- 7. Lineage: quién aportó la Response / Observation
-- ============================================================
alter table public.responses add column respondent_id uuid references public.respondents(id) on delete set null;
alter table public.observations add column respondent_id uuid references public.respondents(id) on delete set null;

-- ============================================================
-- 8. Helpers de autorización (schema private, SECURITY DEFINER)
-- ============================================================
create or replace function private.is_assessment_respondent(_assessment_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.assignments a
      join public.respondents r on r.id = a.respondent_id
     where a.assessment_id = _assessment_id
       and r.user_id = auth.uid()
       and r.status = 'ACTIVE'
       and a.status <> 'REVOKED'
  );
$$;

create or replace function private.is_case_respondent(_case_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.assignments a
      join public.respondents r on r.id = a.respondent_id
      join public.assessments s on s.id = a.assessment_id
     where s.case_id = _case_id
       and r.user_id = auth.uid()
       and r.status = 'ACTIVE'
       and a.status <> 'REVOKED'
  );
$$;

create or replace function private.is_own_respondent(_respondent_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.respondents r
     where r.id = _respondent_id and r.user_id = auth.uid()
  );
$$;

revoke all on function private.is_assessment_respondent(uuid) from public, anon;
revoke all on function private.is_case_respondent(uuid) from public, anon;
revoke all on function private.is_own_respondent(uuid) from public, anon;
grant execute on function private.is_assessment_respondent(uuid) to authenticated, service_role;
grant execute on function private.is_case_respondent(uuid) to authenticated, service_role;
grant execute on function private.is_own_respondent(uuid) to authenticated, service_role;

-- ============================================================
-- 9. RLS · respondents
-- ============================================================
create policy "respondents_select_members" on public.respondents
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "respondents_select_self" on public.respondents
  for select to authenticated using (user_id = auth.uid());
create policy "respondents_insert_members" on public.respondents
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy "respondents_update_members" on public.respondents
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));
create policy "respondents_delete_admins" on public.respondents
  for delete to authenticated
  using (private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.membership_role[]));

-- ============================================================
-- 10. RLS · assignments (respondent solo ve las suyas)
-- ============================================================
create policy "assignments_select_members" on public.assignments
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "assignments_select_own_respondent" on public.assignments
  for select to authenticated using (private.is_own_respondent(respondent_id));
create policy "assignments_insert_members" on public.assignments
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy "assignments_update_members" on public.assignments
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));
create policy "assignments_update_own_respondent" on public.assignments
  for update to authenticated
  using (private.is_own_respondent(respondent_id))
  with check (private.is_own_respondent(respondent_id));

-- ============================================================
-- 11. RLS · invitations (nunca visibles al respondent invitado)
-- ============================================================
create policy "invitations_select_members" on public.invitations
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "invitations_insert_members" on public.invitations
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy "invitations_update_members" on public.invitations
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

-- ============================================================
-- 12. RLS · evidence  (miembros, o respondent dentro de su assessment)
-- ============================================================
create policy "evidence_select_members" on public.evidence
  for select to authenticated using (private.is_organization_member(organization_id));
create policy "evidence_select_assessment_respondent" on public.evidence
  for select to authenticated using (private.is_assessment_respondent(assessment_id));
create policy "evidence_insert_members" on public.evidence
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy "evidence_insert_assessment_respondent" on public.evidence
  for insert to authenticated with check (
    private.is_assessment_respondent(assessment_id)
    and (respondent_id is null or private.is_own_respondent(respondent_id))
  );
create policy "evidence_update_members" on public.evidence
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

-- ============================================================
-- 13. RLS · observation_evidence (solo lectura para miembros)
-- ============================================================
create policy "observation_evidence_select_members" on public.observation_evidence
  for select to authenticated using (private.is_organization_member(organization_id));

-- ============================================================
-- 14. Acceso acotado del respondent a Case + Assessment
--     (no obtiene acceso a organizations, memberships, evaluaciones)
-- ============================================================
create policy "assessments_select_respondents" on public.assessments
  for select to authenticated using (private.is_assessment_respondent(id));
create policy "cases_select_respondents" on public.cases
  for select to authenticated using (private.is_case_respondent(id));
create policy "responses_select_own_respondent" on public.responses
  for select to authenticated using (private.is_own_respondent(respondent_id));
create policy "responses_insert_assessment_respondent" on public.responses
  for insert to authenticated with check (
    private.is_assessment_respondent(assessment_id)
    and private.is_own_respondent(respondent_id)
    and (submitted_by is null or submitted_by = auth.uid())
  );

-- ============================================================
-- 15. updated_at triggers
-- ============================================================
create trigger respondents_set_updated_at before update on public.respondents
  for each row execute function public.set_updated_at();
create trigger assignments_set_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();
create trigger invitations_set_updated_at before update on public.invitations
  for each row execute function public.set_updated_at();
create trigger evidence_set_updated_at before update on public.evidence
  for each row execute function public.set_updated_at();