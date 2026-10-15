-- Document-First · Bloque 1 · fragmentos, interpretaciones y correspondencias gobernadas
create type public.extraction_status as enum ('PENDING','PROCESSING','COMPLETED','FAILED','SUPERSEDED');
create type public.mapping_status as enum ('CANDIDATE','VALIDATED','REJECTED','SUPERSEDED');
create type public.mapping_target_type as enum ('ACQUISITION','INFORMATION_NEED','VARIABLE','EVIDENCE_CRITERION');
create type public.mapping_admission_basis as enum ('GOVERNED_RULE','HUMAN_VALIDATION');
create type public.mapping_proposer as enum ('AI','HUMAN','DETERMINISTIC_RULE');

alter type public.audit_event_type add value if not exists 'FRAGMENT_MAPPING_PROPOSED';
alter type public.audit_event_type add value if not exists 'FRAGMENT_MAPPING_VALIDATED';
alter type public.audit_event_type add value if not exists 'FRAGMENT_MAPPING_REJECTED';
alter type public.audit_event_type add value if not exists 'FRAGMENT_MAPPING_SUPERSEDED';
alter type public.audit_event_type add value if not exists 'EXTRACTION_SUPERSEDED';

create unique index if not exists evidence_org_id_unique on public.evidence (organization_id, id);
create unique index if not exists assessments_org_id_unique on public.assessments (organization_id, id);

create table public.evidence_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  evidence_id uuid not null,
  version_number integer not null check (version_number >= 1),
  content_sha256 text not null,
  storage_bucket text,
  storage_path text,
  mime_type text,
  byte_size bigint,
  created_by uuid,
  created_at timestamptz not null default now(),
  foreign key (organization_id, evidence_id) references public.evidence (organization_id, id) on delete restrict,
  unique (evidence_id, version_number),
  unique (organization_id, id)
);
grant select on public.evidence_versions to authenticated;
grant all on public.evidence_versions to service_role;
alter table public.evidence_versions enable row level security;
create policy "evidence_versions_select_members" on public.evidence_versions
  for select to authenticated using (private.is_organization_member(organization_id));

create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  evidence_version_id uuid not null,
  extraction_version integer not null check (extraction_version >= 1),
  status public.extraction_status not null default 'PENDING',
  model_provider text not null,
  model_id text not null,
  prompt_ref text not null,
  knowledge_version_id uuid not null references public.knowledge_versions (id) on delete restrict,
  superseded_by_extraction_id uuid references public.document_extractions (id) on delete restrict,
  error_detail jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, evidence_version_id) references public.evidence_versions (organization_id, id) on delete restrict,
  unique (evidence_version_id, extraction_version),
  unique (organization_id, id)
);
grant select on public.document_extractions to authenticated;
grant all on public.document_extractions to service_role;
alter table public.document_extractions enable row level security;
create policy "document_extractions_select_members" on public.document_extractions
  for select to authenticated using (private.is_organization_member(organization_id));

create table public.evidence_fragments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  extraction_id uuid not null,
  sequence_index integer not null check (sequence_index >= 0),
  verbatim_text text not null,
  locator jsonb not null,
  text_sha256 text not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, extraction_id) references public.document_extractions (organization_id, id) on delete restrict,
  unique (extraction_id, sequence_index),
  unique (organization_id, id)
);
grant select on public.evidence_fragments to authenticated;
grant all on public.evidence_fragments to service_role;
alter table public.evidence_fragments enable row level security;
create policy "evidence_fragments_select_members" on public.evidence_fragments
  for select to authenticated using (private.is_organization_member(organization_id));

create table public.fragment_interpretations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  fragment_id uuid not null,
  statement text not null,
  model_provider text not null,
  model_id text not null,
  prompt_ref text not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, fragment_id) references public.evidence_fragments (organization_id, id) on delete restrict,
  unique (organization_id, id)
);
grant select on public.fragment_interpretations to authenticated;
grant all on public.fragment_interpretations to service_role;
alter table public.fragment_interpretations enable row level security;
create policy "fragment_interpretations_select_members" on public.fragment_interpretations
  for select to authenticated using (private.is_organization_member(organization_id));

create table public.fragment_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  assessment_id uuid not null,
  fragment_id uuid not null,
  interpretation_id uuid,
  capability_id text not null,
  target_type public.mapping_target_type not null,
  target_ref text not null,
  knowledge_version_id uuid not null references public.knowledge_versions (id) on delete restrict,
  knowledge_pack_id text not null,
  knowledge_pack_version text not null,
  proposed_by public.mapping_proposer not null,
  proposer_model_id text,
  status public.mapping_status not null default 'CANDIDATE',
  admission_basis public.mapping_admission_basis,
  admission_rule_ref text,
  factual_correspondence_ref text,
  validated_by uuid,
  validated_at timestamptz,
  decision_note text,
  supersedes_mapping_id uuid references public.fragment_mappings (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, assessment_id) references public.assessments (organization_id, id) on delete restrict,
  foreign key (organization_id, fragment_id) references public.evidence_fragments (organization_id, id) on delete restrict,
  foreign key (organization_id, interpretation_id) references public.fragment_interpretations (organization_id, id) on delete restrict,
  constraint mapping_validated_requires_basis check (
    status <> 'VALIDATED' or (admission_basis is not null and (admission_rule_ref is not null or validated_by is not null))
  ),
  constraint mapping_rule_basis_requires_ref check (
    admission_basis is distinct from 'GOVERNED_RULE' or admission_rule_ref is not null
  )
);
grant select on public.fragment_mappings to authenticated;
grant all on public.fragment_mappings to service_role;
alter table public.fragment_mappings enable row level security;
create policy "fragment_mappings_select_members" on public.fragment_mappings
  for select to authenticated using (private.is_organization_member(organization_id));
create index fragment_mappings_assessment_idx on public.fragment_mappings (assessment_id, capability_id, status);

-- Historial: nada se borra (tampoco service_role)
create or replace function private.document_first_prevent_delete()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'DOCUMENT_FIRST_HISTORY_IMMUTABLE: delete on % not allowed', tg_table_name;
end $$;

create trigger evidence_versions_no_delete before delete on public.evidence_versions
  for each row execute function private.document_first_prevent_delete();
create trigger document_extractions_no_delete before delete on public.document_extractions
  for each row execute function private.document_first_prevent_delete();
create trigger evidence_fragments_no_delete before delete on public.evidence_fragments
  for each row execute function private.document_first_prevent_delete();
create trigger fragment_interpretations_no_delete before delete on public.fragment_interpretations
  for each row execute function private.document_first_prevent_delete();
create trigger fragment_mappings_no_delete before delete on public.fragment_mappings
  for each row execute function private.document_first_prevent_delete();

-- Fragmentos, interpretaciones y versiones son inmutables
create or replace function private.document_first_prevent_update()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'DOCUMENT_FIRST_RECORD_IMMUTABLE: update on % not allowed', tg_table_name;
end $$;

create trigger evidence_versions_immutable before update on public.evidence_versions
  for each row execute function private.document_first_prevent_update();
create trigger evidence_fragments_immutable before update on public.evidence_fragments
  for each row execute function private.document_first_prevent_update();
create trigger fragment_interpretations_immutable before update on public.fragment_interpretations
  for each row execute function private.document_first_prevent_update();

-- Extracciones: solo cambia el estado del ciclo; el linaje no cambia
create or replace function private.document_extractions_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id <> old.organization_id or new.evidence_version_id <> old.evidence_version_id
     or new.extraction_version <> old.extraction_version or new.model_provider <> old.model_provider
     or new.model_id <> old.model_id or new.prompt_ref <> old.prompt_ref
     or new.knowledge_version_id <> old.knowledge_version_id then
    raise exception 'DOCUMENT_EXTRACTION_LINEAGE_IMMUTABLE';
  end if;
  if old.status = 'SUPERSEDED' and new.status <> 'SUPERSEDED' then
    raise exception 'DOCUMENT_EXTRACTION_SUPERSEDED_IS_FINAL';
  end if;
  if new.status = 'SUPERSEDED' and old.status <> 'SUPERSEDED' then
    insert into public.audit_events (organization_id, event_type, subject_table, subject_id, actor_user_id, detail)
    values (new.organization_id, 'EXTRACTION_SUPERSEDED', 'document_extractions', new.id, auth.uid(),
            jsonb_build_object('superseded_by', new.superseded_by_extraction_id));
  end if;
  return new;
end $$;
create trigger document_extractions_guard before update on public.document_extractions
  for each row execute function private.document_extractions_guard();

-- Correspondencias: siempre nacen candidatas; transiciones controladas y auditadas
create or replace function private.fragment_mappings_insert_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'CANDIDATE' then
    raise exception 'FRAGMENT_MAPPING_MUST_START_AS_CANDIDATE';
  end if;
  if new.admission_basis is not null or new.validated_by is not null or new.validated_at is not null then
    raise exception 'FRAGMENT_MAPPING_CANDIDATE_CANNOT_CARRY_ADMISSION';
  end if;
  insert into public.audit_events (organization_id, assessment_id, event_type, subject_table, subject_id, actor_user_id, detail)
  values (new.organization_id, new.assessment_id, 'FRAGMENT_MAPPING_PROPOSED', 'fragment_mappings', new.id, auth.uid(),
          jsonb_build_object('capability_id', new.capability_id, 'target_type', new.target_type,
                             'target_ref', new.target_ref, 'proposed_by', new.proposed_by));
  return new;
end $$;
create trigger fragment_mappings_insert_guard before insert on public.fragment_mappings
  for each row execute function private.fragment_mappings_insert_guard();

create or replace function private.fragment_mappings_transition_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare _evento public.audit_event_type;
begin
  if new.organization_id <> old.organization_id or new.assessment_id <> old.assessment_id
     or new.fragment_id <> old.fragment_id or new.interpretation_id is distinct from old.interpretation_id
     or new.capability_id <> old.capability_id or new.target_type <> old.target_type
     or new.target_ref <> old.target_ref or new.knowledge_version_id <> old.knowledge_version_id
     or new.knowledge_pack_id <> old.knowledge_pack_id or new.knowledge_pack_version <> old.knowledge_pack_version
     or new.proposed_by <> old.proposed_by or new.proposer_model_id is distinct from old.proposer_model_id
     or new.created_at <> old.created_at then
    raise exception 'FRAGMENT_MAPPING_LINEAGE_IMMUTABLE';
  end if;
  if new.status = old.status then
    raise exception 'FRAGMENT_MAPPING_NO_STATUS_CHANGE';
  end if;
  if not ((old.status = 'CANDIDATE' and new.status in ('VALIDATED','REJECTED'))
       or (old.status = 'VALIDATED' and new.status = 'SUPERSEDED')) then
    raise exception 'FRAGMENT_MAPPING_INVALID_TRANSITION: % -> %', old.status, new.status;
  end if;
  _evento := case new.status
    when 'VALIDATED' then 'FRAGMENT_MAPPING_VALIDATED'::public.audit_event_type
    when 'REJECTED' then 'FRAGMENT_MAPPING_REJECTED'::public.audit_event_type
    else 'FRAGMENT_MAPPING_SUPERSEDED'::public.audit_event_type end;
  insert into public.audit_events (organization_id, assessment_id, event_type, subject_table, subject_id, actor_user_id, detail)
  values (new.organization_id, new.assessment_id, _evento, 'fragment_mappings', new.id, auth.uid(),
          jsonb_build_object('from', old.status, 'to', new.status, 'admission_basis', new.admission_basis,
                             'admission_rule_ref', new.admission_rule_ref, 'note', new.decision_note));
  return new;
end $$;
create trigger fragment_mappings_transition_guard before update on public.fragment_mappings
  for each row execute function private.fragment_mappings_transition_guard();
create trigger fragment_mappings_set_updated_at before update on public.fragment_mappings
  for each row execute function public.set_updated_at();

-- Decisión humana: solo ADMIN/OWNER de la organización
create or replace function public.validate_fragment_mapping(
  _mapping_id uuid,
  _decision public.mapping_status,
  _basis public.mapping_admission_basis,
  _rule_ref text,
  _note text
) returns void language plpgsql security definer set search_path = public as $$
declare _org uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select organization_id into _org from public.fragment_mappings where id = _mapping_id;
  if _org is null then raise exception 'FRAGMENT_MAPPING_NOT_FOUND'; end if;
  if not private.has_organization_role(_org, array['OWNER','ADMIN']::public.membership_role[]) then
    raise exception 'FRAGMENT_MAPPING_VALIDATION_FORBIDDEN';
  end if;
  if _decision not in ('VALIDATED','REJECTED') then
    raise exception 'FRAGMENT_MAPPING_INVALID_DECISION';
  end if;
  if _decision = 'VALIDATED' and _basis is null then
    raise exception 'FRAGMENT_MAPPING_ADMISSION_BASIS_REQUIRED';
  end if;
  update public.fragment_mappings
     set status = _decision,
         admission_basis = case when _decision = 'VALIDATED' then _basis else null end,
         admission_rule_ref = case when _decision = 'VALIDATED' then _rule_ref else null end,
         validated_by = auth.uid(),
         validated_at = now(),
         decision_note = _note
   where id = _mapping_id;
end $$;
revoke all on function public.validate_fragment_mapping(uuid, public.mapping_status, public.mapping_admission_basis, text, text) from public, anon;
grant execute on function public.validate_fragment_mapping(uuid, public.mapping_status, public.mapping_admission_basis, text, text) to authenticated, service_role;