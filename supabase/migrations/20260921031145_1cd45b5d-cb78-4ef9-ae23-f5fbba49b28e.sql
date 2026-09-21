-- Enums
CREATE TYPE public.finding_polarity AS ENUM ('ADVERSE', 'STRENGTH');
CREATE TYPE public.finding_lifecycle_state AS ENUM ('CANDIDATE', 'NEEDS_REVIEW', 'CONFIRMED', 'SUPERSEDED', 'DISMISSED');
CREATE TYPE public.recommendation_selection_status AS ENUM ('CANDIDATE', 'SELECTED', 'REJECTED');
CREATE TYPE public.intervention_status AS ENUM ('PROPOSED', 'ACCEPTED', 'IN_EXECUTION');
CREATE TYPE public.execution_state AS ENUM ('PENDING', 'EXECUTING', 'DELIVERABLE_PRODUCED');
CREATE TYPE public.audit_event_type AS ENUM (
  'FINDING_CREATED', 'FINDING_REVIEWED', 'FINDING_CONFIRMED', 'FINDING_DISMISSED', 'FINDING_SUPERSEDED',
  'RECOMMENDATION_SELECTED', 'RECOMMENDATION_REJECTED',
  'INTERVENTION_CREATED', 'ACTIVITY_STATE_CHANGED', 'DELIVERABLE_REGISTERED'
);

-- Findings ------------------------------------------------------------------
CREATE TABLE public.findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id),
  evaluation_run_id uuid NOT NULL REFERENCES public.evaluation_runs(id),
  knowledge_version_id uuid NOT NULL REFERENCES public.knowledge_versions(id),
  capability_id text NOT NULL,
  finding_ref text NOT NULL,
  polarity public.finding_polarity NOT NULL,
  lifecycle_state public.finding_lifecycle_state NOT NULL DEFAULT 'CANDIDATE',
  severity_qualitative text,
  severity_reason text NOT NULL DEFAULT 'NOT_EXPLICIT_IN_KNOWLEDGE_MASTER',
  knowledge_pack_id text NOT NULL,
  knowledge_pack_version text NOT NULL,
  engine_version text NOT NULL,
  rule_refs text[] NOT NULL DEFAULT '{}',
  variable_refs text[] NOT NULL DEFAULT '{}',
  detail jsonb,
  superseded_by_finding_id uuid REFERENCES public.findings(id),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.findings TO authenticated;
GRANT ALL ON public.findings TO service_role;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "findings_select_members" ON public.findings FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE TRIGGER findings_set_updated_at BEFORE UPDATE ON public.findings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX findings_assessment_idx ON public.findings (assessment_id, finding_ref);

CREATE TABLE public.finding_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  finding_id uuid NOT NULL REFERENCES public.findings(id),
  observation_id uuid NOT NULL REFERENCES public.observations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (finding_id, observation_id)
);
GRANT SELECT ON public.finding_observations TO authenticated;
GRANT ALL ON public.finding_observations TO service_role;
ALTER TABLE public.finding_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finding_observations_select_members" ON public.finding_observations FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));

CREATE TABLE public.finding_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  finding_id uuid NOT NULL REFERENCES public.findings(id),
  evidence_id uuid NOT NULL REFERENCES public.evidence(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (finding_id, evidence_id)
);
GRANT SELECT ON public.finding_evidence TO authenticated;
GRANT ALL ON public.finding_evidence TO service_role;
ALTER TABLE public.finding_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finding_evidence_select_members" ON public.finding_evidence FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));

-- Cross-capability references ----------------------------------------------
CREATE TABLE public.derived_dependency_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id),
  finding_id uuid REFERENCES public.findings(id),
  cause text NOT NULL,
  source_capability_id text NOT NULL,
  target_capability_id text,
  target_domain_id text,
  executable boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT derived_dependency_never_executable CHECK (executable = false)
);
GRANT SELECT ON public.derived_dependency_references TO authenticated;
GRANT ALL ON public.derived_dependency_references TO service_role;
ALTER TABLE public.derived_dependency_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ddr_select_members" ON public.derived_dependency_references FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));

-- Recommendation candidates -------------------------------------------------
CREATE TABLE public.recommendation_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id),
  finding_id uuid REFERENCES public.findings(id),
  recommendation_ref text NOT NULL,
  content_status text NOT NULL DEFAULT 'NOT_EXPLICIT_IN_KNOWLEDGE_MASTER',
  mapping_status text NOT NULL DEFAULT 'NOT_GOVERNED',
  title text,
  status public.recommendation_selection_status NOT NULL DEFAULT 'CANDIDATE',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.recommendation_candidates TO authenticated;
GRANT ALL ON public.recommendation_candidates TO service_role;
ALTER TABLE public.recommendation_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_select_members" ON public.recommendation_candidates FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE POLICY "rec_update_members" ON public.recommendation_candidates FOR UPDATE TO authenticated
  USING (private.is_organization_member(organization_id))
  WITH CHECK (private.is_organization_member(organization_id));
CREATE TRIGGER recommendation_candidates_set_updated_at BEFORE UPDATE ON public.recommendation_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Interventions -------------------------------------------------------------
CREATE TABLE public.interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id),
  recommendation_candidate_id uuid REFERENCES public.recommendation_candidates(id),
  finding_id uuid REFERENCES public.findings(id),
  title text NOT NULL,
  status public.intervention_status NOT NULL DEFAULT 'PROPOSED',
  selection_note text,
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.interventions TO authenticated;
GRANT ALL ON public.interventions TO service_role;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interventions_select_members" ON public.interventions FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE POLICY "interventions_insert_members" ON public.interventions FOR INSERT TO authenticated
  WITH CHECK (private.is_organization_member(organization_id));
CREATE POLICY "interventions_update_members" ON public.interventions FOR UPDATE TO authenticated
  USING (private.is_organization_member(organization_id))
  WITH CHECK (private.is_organization_member(organization_id));
CREATE TRIGGER interventions_set_updated_at BEFORE UPDATE ON public.interventions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Activities ----------------------------------------------------------------
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  intervention_id uuid NOT NULL REFERENCES public.interventions(id),
  activity_ref text,
  content_status text NOT NULL DEFAULT 'NOT_EXPLICIT_IN_KNOWLEDGE_MASTER',
  mapping_status text NOT NULL DEFAULT 'NOT_GOVERNED',
  title text NOT NULL,
  state public.execution_state NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_select_members" ON public.activities FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE POLICY "activities_insert_members" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (private.is_organization_member(organization_id));
CREATE POLICY "activities_update_members" ON public.activities FOR UPDATE TO authenticated
  USING (private.is_organization_member(organization_id))
  WITH CHECK (private.is_organization_member(organization_id));
CREATE TRIGGER activities_set_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Deliverables --------------------------------------------------------------
CREATE TABLE public.deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  activity_id uuid NOT NULL REFERENCES public.activities(id),
  evidence_id uuid REFERENCES public.evidence(id),
  title text NOT NULL,
  note text,
  registered_by uuid,
  registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.deliverables TO authenticated;
GRANT ALL ON public.deliverables TO service_role;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliverables_select_members" ON public.deliverables FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE POLICY "deliverables_insert_members" ON public.deliverables FOR INSERT TO authenticated
  WITH CHECK (private.is_organization_member(organization_id));
CREATE TRIGGER deliverables_set_updated_at BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit ---------------------------------------------------------------------
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  assessment_id uuid REFERENCES public.assessments(id),
  event_type public.audit_event_type NOT NULL,
  subject_table text NOT NULL,
  subject_id uuid,
  actor_user_id uuid,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_events_select_members" ON public.audit_events FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE INDEX audit_events_org_idx ON public.audit_events (organization_id, created_at DESC);