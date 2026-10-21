CREATE TABLE public.prescriptive_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 assessment_id uuid NOT NULL REFERENCES public.assessments(id),
 finding_id uuid NOT NULL REFERENCES public.findings(id),
 request_id uuid NOT NULL,
 contract_id text NOT NULL DEFAULT 'PRESC-OP01-H04',
 contract_version text NOT NULL DEFAULT '0.3.0',
 actor uuid NOT NULL,
 prior_decision_ref uuid REFERENCES public.prescriptive_decisions(id),
 emission_decision text NOT NULL DEFAULT 'BLOCKED' CHECK (emission_decision = 'BLOCKED'),
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (organization_id, request_id)
);
GRANT SELECT ON public.prescriptive_decisions TO authenticated;
GRANT ALL ON public.prescriptive_decisions TO service_role;
ALTER TABLE public.prescriptive_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own prescriptive decisions" ON public.prescriptive_decisions FOR SELECT TO authenticated USING (private.is_organization_member(organization_id));
CREATE FUNCTION public.guard_prescriptive_decision() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'PRESCRIPTIVE_HISTORY_IMMUTABLE'; END IF;
 IF NEW.contract_id <> 'PRESC-OP01-H04' OR NEW.contract_version <> '0.3.0' OR NEW.payload->>'emissionDecision' IS DISTINCT FROM 'BLOCKED' OR NEW.payload->>'publicationState' IS DISTINCT FROM 'UNPUBLISHED' OR NEW.payload->>'activationApprovalId' IS NOT NULL THEN RAISE EXCEPTION 'PRESCRIPTIVE_EMISSION_BLOCKED'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.assessments a JOIN public.findings f ON f.assessment_id=a.id WHERE a.id=NEW.assessment_id AND a.organization_id=NEW.organization_id AND f.id=NEW.finding_id AND f.organization_id=NEW.organization_id AND f.capability_id='OP-01' AND f.finding_ref='H04') THEN RAISE EXCEPTION 'PRESCRIPTIVE_SCOPE_MISMATCH'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id=NEW.organization_id AND m.user_id=NEW.actor AND m.role IN ('OWNER','ADMIN')) THEN RAISE EXCEPTION 'PRESCRIPTIVE_ROLE_FORBIDDEN'; END IF;
 IF NEW.prior_decision_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.prescriptive_decisions p WHERE p.id=NEW.prior_decision_ref AND p.organization_id=NEW.organization_id AND p.assessment_id=NEW.assessment_id AND p.finding_id=NEW.finding_id) THEN RAISE EXCEPTION 'PRESCRIPTIVE_HISTORY_SCOPE_MISMATCH'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prescriptive_decision_guard BEFORE INSERT OR UPDATE OR DELETE ON public.prescriptive_decisions FOR EACH ROW EXECUTE FUNCTION public.guard_prescriptive_decision();
COMMENT ON TABLE public.prescriptive_decisions IS 'DEC-046 complementary internal decisions; append-only; no authenticated writes; REC-01 emission and publication locked.';