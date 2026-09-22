create table public.finding_resolution_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  evaluation_run_id uuid not null references public.evaluation_runs (id) on delete cascade,
  knowledge_version_id uuid not null references public.knowledge_versions (id),
  capability_id text not null,
  finding_ref text not null,
  status text not null,
  unresolved_states text[] not null default '{}',
  variable_states jsonb not null default '[]'::jsonb,
  observation_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  resolution_requirement text not null,
  resolution_acquisition_refs text[] not null default '{}',
  reason text not null,
  detail jsonb,
  created_at timestamptz not null default now(),
  unique (evaluation_run_id, finding_ref),
  constraint finding_resolution_states_status_chk
    check (status in ('AWAITING_INFORMATION', 'EXCLUDED_NOT_APPLICABLE', 'BLOCKED_BY_CONTRADICTION')),
  constraint finding_resolution_states_requirement_chk
    check (
      (status = 'AWAITING_INFORMATION' and resolution_requirement = 'INFORMATION_REQUIRED')
      or (status = 'BLOCKED_BY_CONTRADICTION' and resolution_requirement = 'CLARIFICATION_REQUIRED')
      or (status = 'EXCLUDED_NOT_APPLICABLE' and resolution_requirement = 'NONE_EXCLUDED_BY_APPLICABILITY')
    ),
  constraint finding_resolution_states_unresolved_chk
    check (
      cardinality(unresolved_states) > 0
      and unresolved_states <@ array['UNKNOWN', 'NOT_APPLICABLE', 'CONTRADICTORY']::text[]
    )
);
create index finding_resolution_states_organization_id_idx on public.finding_resolution_states (organization_id);
create index finding_resolution_states_assessment_idx on public.finding_resolution_states (assessment_id);
create index finding_resolution_states_run_idx on public.finding_resolution_states (evaluation_run_id);

grant select on public.finding_resolution_states to authenticated;
grant all on public.finding_resolution_states to service_role;

alter table public.finding_resolution_states enable row level security;

-- engine-owned: read-only for members, writes reserved to service role
create policy "finding_resolution_states_select_members" on public.finding_resolution_states
  for select to authenticated using (private.is_organization_member(organization_id));

-- historical EvaluationRun lineage is append-only: rows are never rewritten
create or replace function private.finding_resolution_states_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'FINDING_RESOLUTION_STATE_IMMUTABLE';
end;
$$;

create trigger finding_resolution_states_no_update
  before update on public.finding_resolution_states
  for each row execute function private.finding_resolution_states_immutable();