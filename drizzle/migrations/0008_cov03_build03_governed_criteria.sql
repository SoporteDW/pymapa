CREATE TABLE public.coverage_canonical_acquisitions (knowledge_version_id uuid NOT NULL, capability_id text NOT NULL, acquisition_ref text NOT NULL, pack_id text NOT NULL, pack_version text NOT NULL, pack_checksum text NOT NULL, variable_refs jsonb NOT NULL, source_text text NOT NULL, PRIMARY KEY(knowledge_version_id,capability_id,acquisition_ref));
GRANT SELECT ON public.coverage_canonical_acquisitions TO authenticated;
GRANT ALL ON public.coverage_canonical_acquisitions TO service_role;
ALTER TABLE public.coverage_canonical_acquisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY canonical_authenticated_read ON public.coverage_canonical_acquisitions FOR SELECT TO authenticated USING(true);
CREATE TABLE public.coverage_criteria_catalog (knowledge_version_id uuid NOT NULL, capability_id text NOT NULL, acquisition_ref text NOT NULL, criteria_version text NOT NULL, approval_status text NOT NULL DEFAULT 'PROPOSED' CHECK(approval_status IN ('PROPOSED','PILOT_TEST_GOVERNED','APPROVED')), approval_reference text NOT NULL, mapping_target_type text NOT NULL CHECK(mapping_target_type IN ('VARIABLE','ACQUISITION')), components jsonb NOT NULL CHECK(jsonb_typeof(components)='array' AND jsonb_array_length(components)>0), proposal_detail jsonb, PRIMARY KEY(knowledge_version_id,capability_id,acquisition_ref,criteria_version));
GRANT SELECT ON public.coverage_criteria_catalog TO authenticated;
GRANT ALL ON public.coverage_criteria_catalog TO service_role;
ALTER TABLE public.coverage_criteria_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY criteria_authenticated_read ON public.coverage_criteria_catalog FOR SELECT TO authenticated USING(true);
INSERT INTO public.coverage_criteria_catalog(knowledge_version_id,capability_id,acquisition_ref,criteria_version,approval_status,approval_reference,mapping_target_type,components)
SELECT k,c,a,v,s,r,t,public.approved_coverage_components(k,c,a,v) FROM (VALUES
('d1a25af1-3634-4c9b-9465-69ac25875e26'::uuid,'DG-01','ACQ·NI04','DG01-NI04-COV-1.0.0','APPROVED','INT-01-COV-QA-BUILD-QA01-QA02-v1.0','VARIABLE'),
('d1a25af1-3634-4c9b-9465-69ac25875e26'::uuid,'CM-05','ACQ·P1·01','CM05-P101-COV-1.0.0','PILOT_TEST_GOVERNED','INT-01-COV-03-BUILD-01','ACQUISITION'),
('d1a25af1-3634-4c9b-9465-69ac25875e26'::uuid,'OP-05','ACQ·VA01#NI@L254','OP05-VA01-L254-COV-1.0.0','PILOT_TEST_GOVERNED','INT-01-COV-03-BUILD-02','ACQUISITION')) AS baseline(k,c,a,v,s,r,t);
CREATE TABLE public.coverage_pilot_authorizations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), assessment_id uuid NOT NULL REFERENCES public.assessments(id), knowledge_version_id uuid NOT NULL, capability_id text NOT NULL, acquisition_ref text NOT NULL, criteria_version text NOT NULL, authorization_reference text NOT NULL, synthetic_qa boolean NOT NULL DEFAULT false CHECK(synthetic_qa), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,assessment_id,knowledge_version_id,capability_id,acquisition_ref,criteria_version), FOREIGN KEY(knowledge_version_id,capability_id,acquisition_ref,criteria_version) REFERENCES public.coverage_criteria_catalog(knowledge_version_id,capability_id,acquisition_ref,criteria_version));
GRANT SELECT ON public.coverage_pilot_authorizations TO authenticated;
GRANT ALL ON public.coverage_pilot_authorizations TO service_role;
ALTER TABLE public.coverage_pilot_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY pilot_member_read ON public.coverage_pilot_authorizations FOR SELECT TO authenticated USING(private.is_organization_member(organization_id));
CREATE TABLE public.coverage_criteria_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), knowledge_version_id uuid NOT NULL, capability_id text NOT NULL, acquisition_ref text NOT NULL, criteria_version text NOT NULL, event_type text NOT NULL, detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.coverage_criteria_events TO authenticated;
GRANT ALL ON public.coverage_criteria_events TO service_role;
ALTER TABLE public.coverage_criteria_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY criteria_events_read ON public.coverage_criteria_events FOR SELECT TO authenticated USING(true);
CREATE TRIGGER criteria_events_no_update BEFORE UPDATE ON public.coverage_criteria_events FOR EACH ROW EXECUTE FUNCTION private.document_first_prevent_update();
CREATE TRIGGER criteria_events_no_delete BEFORE DELETE ON public.coverage_criteria_events FOR EACH ROW EXECUTE FUNCTION private.document_first_prevent_delete();
CREATE FUNCTION private.coverage_criteria_lifecycle_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE component jsonb; seen text[]:=ARRAY[]::text[];
BEGIN
IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CRITERIA_APPEND_ONLY'; END IF;
IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'INSTITUTIONAL_GOVERNANCE_AUTHORITY_REQUIRED'; END IF;
IF NEW.approval_status<>'PROPOSED' THEN RAISE EXCEPTION 'INSTITUTIONAL_GOVERNANCE_AUTHORITY_REQUIRED'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.coverage_canonical_acquisitions a WHERE a.knowledge_version_id=NEW.knowledge_version_id AND a.capability_id=NEW.capability_id AND a.acquisition_ref=NEW.acquisition_ref) THEN RAISE EXCEPTION 'CANONICAL_ACQUISITION_NOT_FOUND'; END IF;
FOR component IN SELECT value FROM jsonb_array_elements(NEW.components) LOOP
IF length(trim(coalesce(component->>'componentKey','')))=0 OR length(trim(coalesce(component->>'componentDescription','')))=0 OR component->>'componentKey'=ANY(seen) THEN RAISE EXCEPTION 'CRITERIA_COMPONENTS_INVALID'; END IF;
seen:=array_append(seen,component->>'componentKey'); END LOOP;
INSERT INTO public.coverage_criteria_events(knowledge_version_id,capability_id,acquisition_ref,criteria_version,event_type,detail) VALUES(NEW.knowledge_version_id,NEW.capability_id,NEW.acquisition_ref,NEW.criteria_version,'PROPOSED',jsonb_build_object('approvalReference',NEW.approval_reference,'status',NEW.approval_status));
RETURN NEW; END $$;
CREATE TRIGGER coverage_criteria_lifecycle BEFORE INSERT OR UPDATE OR DELETE ON public.coverage_criteria_catalog FOR EACH ROW EXECUTE FUNCTION private.coverage_criteria_lifecycle_guard();
CREATE FUNCTION private.coverage_pilot_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM public.assessments a WHERE a.id=NEW.assessment_id AND a.organization_id=NEW.organization_id AND a.knowledge_version_id=NEW.knowledge_version_id) OR NOT EXISTS(SELECT 1 FROM public.coverage_criteria_catalog c WHERE c.knowledge_version_id=NEW.knowledge_version_id AND c.capability_id=NEW.capability_id AND c.acquisition_ref=NEW.acquisition_ref AND c.criteria_version=NEW.criteria_version AND c.approval_status='PILOT_TEST_GOVERNED') THEN RAISE EXCEPTION 'PILOT_CONTEXT_INVALID'; END IF; RETURN NEW; END $$;
CREATE TRIGGER coverage_pilot_context BEFORE INSERT OR UPDATE ON public.coverage_pilot_authorizations FOR EACH ROW EXECUTE FUNCTION private.coverage_pilot_guard();
CREATE FUNCTION private.coverage_decision_criteria_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.fragment_mappings%rowtype; c public.coverage_criteria_catalog%rowtype; a text;
BEGIN
SELECT * INTO m FROM public.fragment_mappings WHERE id=NEW.mapping_id;
a:=CASE WHEN m.target_type='ACQUISITION' THEN m.target_ref ELSE m.factual_correspondence_ref END;
IF NOT EXISTS(SELECT 1 FROM public.coverage_canonical_acquisitions x WHERE x.knowledge_version_id=m.knowledge_version_id AND x.capability_id=m.capability_id AND x.acquisition_ref=a AND x.pack_id=m.knowledge_pack_id AND x.pack_version=m.knowledge_pack_version) THEN RAISE EXCEPTION 'CANONICAL_ACQUISITION_NOT_FOUND'; END IF;
SELECT * INTO c FROM public.coverage_criteria_catalog WHERE knowledge_version_id=m.knowledge_version_id AND capability_id=m.capability_id AND acquisition_ref=a AND criteria_version=NEW.declaration->>'coverageCriteriaVersion';
IF NEW.result->>'coverageScope'='FULL' THEN
IF c.approval_status IS NULL OR c.approval_status='PROPOSED' OR c.mapping_target_type<>m.target_type THEN RAISE EXCEPTION 'CRITERIA_NOT_APPROVED'; END IF;
IF c.approval_status='PILOT_TEST_GOVERNED' AND NOT EXISTS(SELECT 1 FROM public.coverage_pilot_authorizations p WHERE p.organization_id=m.organization_id AND p.assessment_id=m.assessment_id AND p.knowledge_version_id=m.knowledge_version_id AND p.capability_id=m.capability_id AND p.acquisition_ref=a AND p.criteria_version=c.criteria_version AND p.synthetic_qa AND p.active) THEN RAISE EXCEPTION 'PILOT_QA_AUTHORIZATION_REQUIRED'; END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER coverage_decision_governance BEFORE INSERT ON public.coverage_decisions FOR EACH ROW EXECUTE FUNCTION private.coverage_decision_criteria_guard();
COMMENT ON TABLE public.coverage_criteria_catalog IS 'BUILD03 auxiliary lifecycle. Tenant owners cannot promote global criteria; institutional authority model is intentionally blocked.';
COMMENT ON TABLE public.coverage_pilot_authorizations IS 'Explicit synthetic QA scopes only. No authenticated write grant; cannot self-authorize by organization name or client flag.';