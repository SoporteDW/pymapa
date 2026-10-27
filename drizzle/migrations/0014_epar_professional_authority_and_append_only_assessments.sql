CREATE TABLE public.professional_governance_authorities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 approval_reference text NOT NULL, valid_from timestamptz NOT NULL, valid_until timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professional_governance_authorities TO authenticated;
GRANT ALL ON public.professional_governance_authorities TO service_role;
ALTER TABLE public.professional_governance_authorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY governance_read_self ON public.professional_governance_authorities FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE TABLE public.professional_governance_revocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), authority_id uuid NOT NULL REFERENCES public.professional_governance_authorities(id),
 approval_reference text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(authority_id)
);
GRANT SELECT ON public.professional_governance_revocations TO authenticated;
GRANT ALL ON public.professional_governance_revocations TO service_role;
ALTER TABLE public.professional_governance_revocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY governance_revocations_read_self ON public.professional_governance_revocations FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.professional_governance_authorities a WHERE a.id=authority_id AND a.user_id=auth.uid()));
CREATE TABLE public.professional_authorities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
 evaluator_user_id uuid NOT NULL, assessment_id uuid REFERENCES public.assessments(id),
 authority_type text NOT NULL DEFAULT 'AUTHORIZED_PROFESSIONAL_EVALUATOR' CHECK(authority_type='AUTHORIZED_PROFESSIONAL_EVALUATOR'),
 capability_ids text[] NOT NULL, valid_from timestamptz NOT NULL, valid_until timestamptz NOT NULL,
 governance_authority_id uuid NOT NULL REFERENCES public.professional_governance_authorities(id),
 issued_by uuid NOT NULL, approval_reference text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professional_authorities TO authenticated;
GRANT ALL ON public.professional_authorities TO service_role;
ALTER TABLE public.professional_authorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_authority_member_read ON public.professional_authorities FOR SELECT TO authenticated USING(private.is_organization_member(organization_id));
CREATE TABLE public.professional_authority_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
 authority_id uuid NOT NULL REFERENCES public.professional_authorities(id),
 event_type text NOT NULL DEFAULT 'REVOKED' CHECK(event_type='REVOKED'),
 governance_authority_id uuid NOT NULL REFERENCES public.professional_governance_authorities(id),
 actor_user_id uuid NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(authority_id)
);
GRANT SELECT ON public.professional_authority_events TO authenticated;
GRANT ALL ON public.professional_authority_events TO service_role;
ALTER TABLE public.professional_authority_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_authority_event_member_read ON public.professional_authority_events FOR SELECT TO authenticated USING(private.is_organization_member(organization_id));
CREATE TABLE public.professional_assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), evaluation_id uuid NOT NULL, version integer NOT NULL,
 previous_version_id uuid REFERENCES public.professional_assessments(id),
 organization_id uuid NOT NULL REFERENCES public.organizations(id), assessment_id uuid NOT NULL REFERENCES public.assessments(id),
 capability_id text NOT NULL, knowledge_version_id uuid NOT NULL REFERENCES public.knowledge_versions(id),
 origin text NOT NULL DEFAULT 'PROFESSIONAL_ASSESSMENT' CHECK(origin='PROFESSIONAL_ASSESSMENT'),
 evaluator_user_id uuid NOT NULL, authority_id uuid NOT NULL REFERENCES public.professional_authorities(id),
 state text NOT NULL CHECK(state IN ('SUBSTANTIATED','INSUFFICIENT_INFORMATION','CONTRADICTORY_INFORMATION','NOT_APPLICABLE','REVIEW_REQUIRED')),
 conclusion text, justification text NOT NULL, limitations text NOT NULL, uncertainty text NOT NULL,
 pending_information text NOT NULL, sources text NOT NULL, source_date timestamptz NOT NULL, valid_until timestamptz NOT NULL,
 response_ids uuid[] NOT NULL DEFAULT '{}', evidence_ids uuid[] NOT NULL DEFAULT '{}', source_snapshot jsonb NOT NULL,
 review_state text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(review_state='PENDING_REVIEW'),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(evaluation_id,version), UNIQUE(previous_version_id),
 CHECK((state<>'SUBSTANTIATED' OR (conclusion IS NOT NULL AND length(trim(conclusion))>0 AND cardinality(response_ids)+cardinality(evidence_ids)>0)) AND (state NOT IN ('INSUFFICIENT_INFORMATION','CONTRADICTORY_INFORMATION','NOT_APPLICABLE') OR conclusion IS NULL))
);
GRANT SELECT ON public.professional_assessments TO authenticated;
GRANT ALL ON public.professional_assessments TO service_role;
ALTER TABLE public.professional_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_assessment_member_read ON public.professional_assessments FOR SELECT TO authenticated USING(private.is_organization_member(organization_id));
CREATE TABLE public.professional_assessment_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
 assessment_id uuid NOT NULL REFERENCES public.assessments(id), capability_id text NOT NULL,
 version_id uuid NOT NULL REFERENCES public.professional_assessments(id), authority_id uuid NOT NULL REFERENCES public.professional_authorities(id),
 reviewer_user_id uuid NOT NULL, decision text NOT NULL CHECK(decision IN ('REVIEWED','CHANGES_REQUESTED')),
 note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professional_assessment_reviews TO authenticated;
GRANT ALL ON public.professional_assessment_reviews TO service_role;
ALTER TABLE public.professional_assessment_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_review_member_read ON public.professional_assessment_reviews FOR SELECT TO authenticated USING(private.is_organization_member(organization_id));
CREATE INDEX professional_assessment_scope ON public.professional_assessments(organization_id,assessment_id,capability_id,created_at);
CREATE INDEX professional_authority_scope ON public.professional_authorities(organization_id,evaluator_user_id);

CREATE FUNCTION public.epar_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'EPAR_APPEND_ONLY'; END $$;
CREATE TRIGGER immutable_governance BEFORE UPDATE OR DELETE ON public.professional_governance_authorities FOR EACH ROW EXECUTE FUNCTION public.epar_immutable();
CREATE TRIGGER immutable_governance_revocation BEFORE UPDATE OR DELETE ON public.professional_governance_revocations FOR EACH ROW EXECUTE FUNCTION public.epar_immutable();
CREATE TRIGGER immutable_professional_authority BEFORE UPDATE OR DELETE ON public.professional_authorities FOR EACH ROW EXECUTE FUNCTION public.epar_immutable();
CREATE TRIGGER immutable_professional_authority_event BEFORE UPDATE OR DELETE ON public.professional_authority_events FOR EACH ROW EXECUTE FUNCTION public.epar_immutable();
CREATE TRIGGER immutable_professional_assessment BEFORE UPDATE OR DELETE ON public.professional_assessments FOR EACH ROW EXECUTE FUNCTION public.epar_immutable();
CREATE TRIGGER immutable_professional_review BEFORE UPDATE OR DELETE ON public.professional_assessment_reviews FOR EACH ROW EXECUTE FUNCTION public.epar_immutable();

CREATE FUNCTION public.epar_governance_id() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g uuid;
BEGIN
 SELECT a.id INTO g FROM public.professional_governance_authorities a WHERE a.user_id=auth.uid() AND a.valid_from<=now() AND now()<a.valid_until AND NOT EXISTS(SELECT 1 FROM public.professional_governance_revocations r WHERE r.authority_id=a.id) ORDER BY a.created_at DESC LIMIT 1 FOR UPDATE;
 IF g IS NULL THEN RAISE EXCEPTION 'EPAR_GOVERNANCE_DENIED'; END IF;
 RETURN g;
END $$;
REVOKE ALL ON FUNCTION public.epar_governance_id() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.epar_assert_authority(_authority uuid,_organization uuid,_assessment uuid,_capability text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.professional_authorities;
BEGIN
 SELECT * INTO a FROM public.professional_authorities WHERE id=_authority FOR UPDATE;
 IF a.id IS NULL OR a.organization_id<>_organization OR a.evaluator_user_id<>auth.uid() OR (a.assessment_id IS NOT NULL AND a.assessment_id<>_assessment) OR NOT (_capability=ANY(a.capability_ids)) OR now()<a.valid_from OR now()>=a.valid_until OR EXISTS(SELECT 1 FROM public.professional_authority_events WHERE authority_id=a.id) OR NOT private.is_organization_member(_organization) OR NOT EXISTS(SELECT 1 FROM public.assessments WHERE id=_assessment AND organization_id=_organization) THEN RAISE EXCEPTION 'EPAR_AUTHORITY_DENIED'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.epar_assert_authority(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.grant_professional_authority(_organization uuid,_evaluator uuid,_assessment uuid,_capabilities text[],_from timestamptz,_until timestamptz,_approval text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g uuid; result uuid;
BEGIN
 g:=public.epar_governance_id();
 IF auth.uid()=_evaluator OR _from>=_until OR _until<=now() OR length(trim(_approval))=0 OR cardinality(_capabilities)=0 OR _capabilities IS NULL OR EXISTS(SELECT 1 FROM unnest(_capabilities) c WHERE c IS NULL OR c NOT IN ('OP-01','OP-02','OP-03','OP-04','OP-05','DG-01','DG-02','DG-03','DG-04','DG-05','PC-01','PC-02','PC-03','PC-04','PC-05','DT-01','DT-02','DT-03','DT-04','DT-05','DT-06','CM-01','CM-02','CM-03','CM-04','CM-05','CM-06','EC-02','EC-03','EC-04','EC-05')) OR NOT EXISTS(SELECT 1 FROM public.memberships WHERE organization_id=_organization AND user_id=_evaluator) OR (_assessment IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.assessments WHERE id=_assessment AND organization_id=_organization)) THEN RAISE EXCEPTION 'EPAR_DESIGNATION_INVALID'; END IF;
 INSERT INTO public.professional_authorities(organization_id,evaluator_user_id,assessment_id,capability_ids,valid_from,valid_until,governance_authority_id,issued_by,approval_reference) VALUES(_organization,_evaluator,_assessment,_capabilities,_from,_until,g,auth.uid(),_approval) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.grant_professional_authority(uuid,uuid,uuid,text[],timestamptz,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grant_professional_authority(uuid,uuid,uuid,text[],timestamptz,timestamptz,text) TO authenticated;
CREATE FUNCTION public.revoke_professional_authority(_authority uuid,_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g uuid; a public.professional_authorities; result uuid;
BEGIN
 g:=public.epar_governance_id(); SELECT * INTO a FROM public.professional_authorities WHERE id=_authority FOR UPDATE;
 IF a.id IS NULL OR length(trim(_note))=0 THEN RAISE EXCEPTION 'EPAR_REVOCATION_INVALID'; END IF;
 INSERT INTO public.professional_authority_events(organization_id,authority_id,governance_authority_id,actor_user_id,note) VALUES(a.organization_id,a.id,g,auth.uid(),_note) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.revoke_professional_authority(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revoke_professional_authority(uuid,text) TO authenticated;

CREATE FUNCTION public.register_professional_assessment(_organization uuid,_assessment uuid,_capability text,_body jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE authority uuid:=(_body->>'authorityId')::uuid; ev uuid:=(_body->>'evaluationId')::uuid; prev uuid:=(_body->>'previousVersionId')::uuid; p public.professional_assessments; v integer:=1; result uuid; rs uuid[]; es uuid[]; snapshot jsonb; kv uuid; st text:=_body->>'state';
BEGIN
 PERFORM public.epar_assert_authority(authority,_organization,_assessment,_capability);
 IF _body IS NULL OR st IS NULL OR st NOT IN ('SUBSTANTIATED','INSUFFICIENT_INFORMATION','CONTRADICTORY_INFORMATION','NOT_APPLICABLE','REVIEW_REQUIRED') OR coalesce(length(trim(_body->>'justification')),0)=0 OR coalesce(length(trim(_body->>'limitations')),0)=0 OR coalesce(length(trim(_body->>'uncertainty')),0)=0 OR coalesce(length(trim(_body->>'sources')),0)=0 OR (_body->>'pendingInformation') IS NULL OR (_body->>'validUntil') IS NULL OR (_body->>'sourceDate') IS NULL OR (_body->>'validUntil')::timestamptz<=now() OR (_body->>'sourceDate')::timestamptz>now() THEN RAISE EXCEPTION 'EPAR_BODY_INVALID'; END IF;
 SELECT coalesce(array_agg(x::uuid),'{}'::uuid[]) INTO rs FROM jsonb_array_elements_text(_body->'responseIds') x;
 SELECT coalesce(array_agg(x::uuid),'{}'::uuid[]) INTO es FROM jsonb_array_elements_text(_body->'evidenceIds') x;
 IF EXISTS(SELECT 1 FROM unnest(rs) rid WHERE NOT EXISTS(SELECT 1 FROM public.responses r WHERE r.id=rid AND r.organization_id=_organization AND r.assessment_id=_assessment AND coalesce(r.payload->>'capabilityId','OP-01')=_capability)) OR EXISTS(SELECT 1 FROM unnest(es) eid WHERE NOT EXISTS(SELECT 1 FROM public.evidence e WHERE e.id=eid AND e.organization_id=_organization AND e.assessment_id=_assessment)) THEN RAISE EXCEPTION 'EPAR_REFERENCE_FORBIDDEN'; END IF;
 IF (ev IS NULL)<>(prev IS NULL) THEN RAISE EXCEPTION 'EPAR_PREVIOUS_VERSION_REQUIRED'; END IF;
 IF ev IS NULL THEN ev:=gen_random_uuid(); ELSE
 SELECT * INTO p FROM public.professional_assessments WHERE id=prev FOR UPDATE;
 IF p.id IS NULL OR p.evaluation_id<>ev OR p.organization_id<>_organization OR p.assessment_id<>_assessment OR p.capability_id<>_capability OR EXISTS(SELECT 1 FROM public.professional_assessments WHERE previous_version_id=prev) THEN RAISE EXCEPTION 'EPAR_STALE_VERSION'; END IF;
 v:=p.version+1;
 END IF;
 SELECT knowledge_version_id INTO kv FROM public.assessments WHERE id=_assessment AND organization_id=_organization;
 SELECT jsonb_build_object('responses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'payload',r.payload,'recordedAt',r.created_at,'author',r.submitted_by)) FROM public.responses r WHERE r.id=ANY(rs)),'[]'::jsonb),'evidence',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'source',e.source,'capturedAt',e.captured_at,'reference',e.external_reference)) FROM public.evidence e WHERE e.id=ANY(es)),'[]'::jsonb)) INTO snapshot;
 INSERT INTO public.professional_assessments(evaluation_id,version,previous_version_id,organization_id,assessment_id,capability_id,knowledge_version_id,evaluator_user_id,authority_id,state,conclusion,justification,limitations,uncertainty,pending_information,sources,source_date,valid_until,response_ids,evidence_ids,source_snapshot)
 VALUES(ev,v,prev,_organization,_assessment,_capability,kv,auth.uid(),authority,st,nullif(trim(_body->>'conclusion'),''),_body->>'justification',_body->>'limitations',_body->>'uncertainty',_body->>'pendingInformation',_body->>'sources',(_body->>'sourceDate')::timestamptz,(_body->>'validUntil')::timestamptz,rs,es,snapshot) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.register_professional_assessment(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_professional_assessment(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.review_professional_assessment(_version uuid,_organization uuid,_assessment uuid,_capability text,_authority uuid,_decision text,_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.professional_assessments; result uuid;
BEGIN
 PERFORM public.epar_assert_authority(_authority,_organization,_assessment,_capability);
 SELECT * INTO p FROM public.professional_assessments WHERE id=_version FOR UPDATE;
 IF p.id IS NULL OR p.organization_id<>_organization OR p.assessment_id<>_assessment OR p.capability_id<>_capability OR EXISTS(SELECT 1 FROM public.professional_assessments WHERE previous_version_id=_version) OR p.valid_until<=now() OR _decision IS NULL OR _decision NOT IN ('REVIEWED','CHANGES_REQUESTED') OR coalesce(length(trim(_note)),0)=0 THEN RAISE EXCEPTION 'EPAR_REVIEW_INVALID'; END IF;
 INSERT INTO public.professional_assessment_reviews(organization_id,assessment_id,capability_id,version_id,authority_id,reviewer_user_id,decision,note) VALUES(_organization,_assessment,_capability,_version,_authority,auth.uid(),_decision,_note) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.review_professional_assessment(uuid,uuid,uuid,text,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_professional_assessment(uuid,uuid,uuid,text,uuid,text,text) TO authenticated;
COMMENT ON TABLE public.professional_governance_authorities IS 'Only externally mandated PYMAPA Government designations; empty by default, no app bootstrap or self-service writes.';
COMMENT ON TABLE public.professional_assessments IS 'Append-only professional judgment; never Engine findings, institutional knowledge or automatic recommendations.';