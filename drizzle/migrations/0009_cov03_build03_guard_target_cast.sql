CREATE OR REPLACE FUNCTION private.coverage_decision_criteria_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.fragment_mappings%rowtype; c public.coverage_criteria_catalog%rowtype; a text;
BEGIN
SELECT * INTO m FROM public.fragment_mappings WHERE id=NEW.mapping_id;
a:=CASE WHEN m.target_type='ACQUISITION' THEN m.target_ref ELSE m.factual_correspondence_ref END;
IF NOT EXISTS(SELECT 1 FROM public.coverage_canonical_acquisitions x WHERE x.knowledge_version_id=m.knowledge_version_id AND x.capability_id=m.capability_id AND x.acquisition_ref=a AND x.pack_id=m.knowledge_pack_id AND x.pack_version=m.knowledge_pack_version) THEN RAISE EXCEPTION 'CANONICAL_ACQUISITION_NOT_FOUND'; END IF;
SELECT * INTO c FROM public.coverage_criteria_catalog WHERE knowledge_version_id=m.knowledge_version_id AND capability_id=m.capability_id AND acquisition_ref=a AND criteria_version=NEW.declaration->>'coverageCriteriaVersion';
IF NEW.result->>'coverageScope'='FULL' THEN
IF c.approval_status IS NULL OR c.approval_status='PROPOSED' OR c.mapping_target_type<>m.target_type::text THEN RAISE EXCEPTION 'CRITERIA_NOT_APPROVED'; END IF;
IF c.approval_status='PILOT_TEST_GOVERNED' AND NOT EXISTS(SELECT 1 FROM public.coverage_pilot_authorizations p WHERE p.organization_id=m.organization_id AND p.assessment_id=m.assessment_id AND p.knowledge_version_id=m.knowledge_version_id AND p.capability_id=m.capability_id AND p.acquisition_ref=a AND p.criteria_version=c.criteria_version AND p.synthetic_qa AND p.active) THEN RAISE EXCEPTION 'PILOT_QA_AUTHORIZATION_REQUIRED'; END IF;
END IF; RETURN NEW; END $$;