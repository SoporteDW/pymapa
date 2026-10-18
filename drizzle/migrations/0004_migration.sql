-- INT-01-COV-02 · Contrato gobernado de cobertura documental (alternativa B).
-- Campo estructurado coverage_scope FULL/PARTIAL (default conservador PARTIAL),
-- decisión humana OWNER/ADMIN con justificación, trazable y revocable.
-- Aditivo: ningún registro histórico se convierte en FULL.

alter type public.audit_event_type add value if not exists 'FRAGMENT_MAPPING_COVERAGE_DECIDED';

alter table public.fragment_mappings
  add column coverage_scope text not null default 'PARTIAL',
  add column coverage_acquisition_ref text,
  add column coverage_justification text,
  add column coverage_decided_by uuid,
  add column coverage_decided_at timestamptz;

alter table public.fragment_mappings
  add constraint fragment_mappings_coverage_scope_check check (coverage_scope in ('FULL','PARTIAL')),
  add constraint fragment_mappings_coverage_full_check check (
    coverage_scope <> 'FULL' or (coverage_acquisition_ref is not null and coverage_justification is not null
      and coverage_decided_by is not null and coverage_decided_at is not null));

comment on column public.fragment_mappings.coverage_scope is 'COV-02: cobertura documental gobernada de la adquisición factual. FULL solo por decisión OWNER/ADMIN; PARTIAL nunca descuenta.';

-- Guarda de transiciones: admite actualizaciones SOLO de cobertura (estado
-- sin cambiar, resto de campos intactos) y audita cada decisión. Al salir de
-- VALIDATED (SUPERSEDED) la cobertura queda sin efecto.
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
    -- COV-02: única actualización permitida sin cambio de estado.
    if new.admission_basis is not distinct from old.admission_basis
       and new.admission_rule_ref is not distinct from old.admission_rule_ref
       and new.factual_correspondence_ref is not distinct from old.factual_correspondence_ref
       and new.validated_by is not distinct from old.validated_by
       and new.validated_at is not distinct from old.validated_at
       and new.decision_note is not distinct from old.decision_note
       and new.supersedes_mapping_id is not distinct from old.supersedes_mapping_id
       and (new.coverage_scope is distinct from old.coverage_scope
         or new.coverage_acquisition_ref is distinct from old.coverage_acquisition_ref
         or new.coverage_justification is distinct from old.coverage_justification
         or new.coverage_decided_by is distinct from old.coverage_decided_by
         or new.coverage_decided_at is distinct from old.coverage_decided_at) then
      insert into public.audit_events (organization_id, assessment_id, event_type, subject_table, subject_id, actor_user_id, detail)
      values (new.organization_id, new.assessment_id, 'FRAGMENT_MAPPING_COVERAGE_DECIDED', 'fragment_mappings', new.id, auth.uid(),
              jsonb_build_object('scope', new.coverage_scope, 'acquisition_ref', new.coverage_acquisition_ref,
                                 'justification', new.coverage_justification, 'previous_scope', old.coverage_scope));
      return new;
    end if;
    raise exception 'FRAGMENT_MAPPING_NO_STATUS_CHANGE';
  end if;
  if not ((old.status = 'CANDIDATE' and new.status in ('VALIDATED','REJECTED'))
       or (old.status = 'VALIDATED' and new.status = 'SUPERSEDED')) then
    raise exception 'FRAGMENT_MAPPING_INVALID_TRANSITION: % -> %', old.status, new.status;
  end if;
  if new.status = 'SUPERSEDED' then
    new.coverage_scope := 'PARTIAL';
    new.coverage_acquisition_ref := null;
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

-- Decisión gobernada de cobertura: solo OWNER/ADMIN, solo mappings VALIDATED,
-- FULL exige justificación y adquisición igual a la correspondencia factual.
-- Idempotente: repetir la misma decisión vigente es no-op.
create or replace function public.set_fragment_mapping_coverage(
  _mapping_id uuid,
  _scope text,
  _acquisition_ref text,
  _justification text
) returns void language plpgsql security definer set search_path = public as $$
declare _org uuid; _status public.mapping_status; _factual text;
  _cur_scope text; _cur_acq text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select organization_id, status, factual_correspondence_ref, coverage_scope, coverage_acquisition_ref
    into _org, _status, _factual, _cur_scope, _cur_acq
    from public.fragment_mappings where id = _mapping_id;
  if _org is null then raise exception 'FRAGMENT_MAPPING_NOT_FOUND'; end if;
  if not private.has_organization_role(_org, array['OWNER','ADMIN']::public.membership_role[]) then
    raise exception 'FRAGMENT_MAPPING_COVERAGE_FORBIDDEN';
  end if;
  if _status <> 'VALIDATED' then raise exception 'COVERAGE_REQUIRES_VALIDATED_MAPPING'; end if;
  if _scope not in ('FULL','PARTIAL') then raise exception 'COVERAGE_SCOPE_INVALID'; end if;
  if _justification is null or length(trim(_justification)) < 10 then
    raise exception 'COVERAGE_JUSTIFICATION_REQUIRED';
  end if;
  if _scope = 'FULL' then
    if _factual is null then raise exception 'COVERAGE_REQUIRES_FACTUAL_MAPPING'; end if;
    if _acquisition_ref is null or _acquisition_ref <> _factual then
      raise exception 'COVERAGE_ACQUISITION_MUST_MATCH_FACTUAL_CORRESPONDENCE';
    end if;
  end if;
  if _cur_scope = _scope and (_scope = 'PARTIAL' or _cur_acq = _acquisition_ref) then return; end if;
  update public.fragment_mappings
     set coverage_scope = _scope,
         coverage_acquisition_ref = case when _scope = 'FULL' then _acquisition_ref else null end,
         coverage_justification = _justification,
         coverage_decided_by = auth.uid(),
         coverage_decided_at = now()
   where id = _mapping_id;
end $$;
revoke all on function public.set_fragment_mapping_coverage(uuid, text, text, text) from public, anon;
grant execute on function public.set_fragment_mapping_coverage(uuid, text, text, text) to authenticated, service_role;