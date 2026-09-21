-- M1-C · Productive Data Foundation (structure only; no diagnostic logic)
create type public.membership_role as enum ('OWNER', 'ADMIN', 'MEMBER');
create type public.assessment_type as enum ('BASELINE', 'REASSESSMENT', 'FOLLOW_UP');
create type public.knowledge_version_status as enum ('DRAFT', 'VALIDATED', 'PUBLISHED', 'SUPERSEDED');
create type public.evaluation_run_trigger as enum ('RESPONSE_ACCEPTED','EVIDENCE_ADDED','OBSERVATION_UPDATED','CONTRADICTION_RESOLVED','MANUAL_REEVALUATION','REASSESSMENT_STARTED','VALIDATION_COMPLETED');
create type public.evaluation_run_status as enum ('PENDING','PROCESSING','PROCESSED','FAILED','NEEDS_REVIEW');

create table public.knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  version text not null,
  status public.knowledge_version_status not null default 'DRAFT',
  checksum text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identifier, version)
);
grant select on public.knowledge_versions to authenticated;
grant all on public.knowledge_versions to service_role;
alter table public.knowledge_versions enable row level security;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  role public.membership_role not null default 'MEMBER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_organization_id_idx on public.memberships (organization_id);
grant select, insert, update, delete on public.memberships to authenticated;
grant all on public.memberships to service_role;
alter table public.memberships enable row level security;

create or replace function public.is_organization_member(_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.organization_id = _organization_id and m.user_id = auth.uid())
$$;

create or replace function public.has_organization_role(_organization_id uuid, _roles public.membership_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.organization_id = _organization_id and m.user_id = auth.uid() and m.role = any (_roles))
$$;

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cases_organization_id_idx on public.cases (organization_id);
grant select, insert, update, delete on public.cases to authenticated;
grant all on public.cases to service_role;
alter table public.cases enable row level security;

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  knowledge_version_id uuid not null references public.knowledge_versions (id) on delete restrict,
  type public.assessment_type not null default 'BASELINE',
  started_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assessments_organization_id_idx on public.assessments (organization_id);
create index assessments_case_id_idx on public.assessments (case_id);
create index assessments_knowledge_version_id_idx on public.assessments (knowledge_version_id);
grant select, insert, update on public.assessments to authenticated;
grant all on public.assessments to service_role;
alter table public.assessments enable row level security;

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  submitted_by uuid,
  acquisition_ref text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index responses_organization_id_idx on public.responses (organization_id);
create index responses_assessment_id_idx on public.responses (assessment_id);
grant select, insert on public.responses to authenticated;
grant all on public.responses to service_role;
alter table public.responses enable row level security;

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  source_response_id uuid references public.responses (id) on delete set null,
  variable_ref text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index observations_organization_id_idx on public.observations (organization_id);
create index observations_assessment_id_idx on public.observations (assessment_id);
create index observations_source_response_id_idx on public.observations (source_response_id);
grant select on public.observations to authenticated;
grant all on public.observations to service_role;
alter table public.observations enable row level security;

create table public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  knowledge_version_id uuid not null references public.knowledge_versions (id) on delete restrict,
  engine_version text not null,
  trigger public.evaluation_run_trigger not null,
  status public.evaluation_run_status not null default 'PENDING',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index evaluation_runs_organization_id_idx on public.evaluation_runs (organization_id);
create index evaluation_runs_assessment_id_idx on public.evaluation_runs (assessment_id);
grant select on public.evaluation_runs to authenticated;
grant all on public.evaluation_runs to service_role;
alter table public.evaluation_runs enable row level security;

create table public.variable_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  evaluation_run_id uuid not null references public.evaluation_runs (id) on delete cascade,
  variable_ref text not null,
  state text not null,
  detail jsonb,
  created_at timestamptz not null default now(),
  unique (evaluation_run_id, variable_ref)
);
create index variable_evaluations_organization_id_idx on public.variable_evaluations (organization_id);
create index variable_evaluations_run_idx on public.variable_evaluations (evaluation_run_id);
grant select on public.variable_evaluations to authenticated;
grant all on public.variable_evaluations to service_role;
alter table public.variable_evaluations enable row level security;

create table public.information_need_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  evaluation_run_id uuid references public.evaluation_runs (id) on delete set null,
  need_ref text not null,
  state text not null,
  detail jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, need_ref)
);
create index information_need_states_organization_id_idx on public.information_need_states (organization_id);
create index information_need_states_assessment_id_idx on public.information_need_states (assessment_id);
grant select on public.information_need_states to authenticated;
grant all on public.information_need_states to service_role;
alter table public.information_need_states enable row level security;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger knowledge_versions_set_updated_at before update on public.knowledge_versions for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships for each row execute function public.set_updated_at();
create trigger cases_set_updated_at before update on public.cases for each row execute function public.set_updated_at();
create trigger assessments_set_updated_at before update on public.assessments for each row execute function public.set_updated_at();
create trigger observations_set_updated_at before update on public.observations for each row execute function public.set_updated_at();
create trigger information_need_states_set_updated_at before update on public.information_need_states for each row execute function public.set_updated_at();