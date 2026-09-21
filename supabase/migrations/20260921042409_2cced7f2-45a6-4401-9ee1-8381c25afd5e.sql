-- M1-KL · CRV + Validation + Follow-up + Reassessment
ALTER TYPE public.execution_state ADD VALUE IF NOT EXISTS 'VALIDATED';
ALTER TYPE public.execution_state ADD VALUE IF NOT EXISTS 'FOLLOW_UP';
ALTER TYPE public.execution_state ADD VALUE IF NOT EXISTS 'CONSOLIDATED';
ALTER TYPE public.execution_state ADD VALUE IF NOT EXISTS 'NEEDS_ADJUSTMENT';

ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'ACTIVITY_MARKED_DONE';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'VALIDATION_REQUIREMENT_REGISTERED';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'VALIDATION_CASE_REGISTERED';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'VALIDATION_DECIDED';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'FOLLOW_UP_STARTED';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'FOLLOW_UP_DECIDED';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'REASSESSMENT_STARTED';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'SNAPSHOT_CREATED';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'LEARNING_CANDIDATE_CREATED';

CREATE TYPE public.validation_requirement_status AS ENUM (
  'VALIDATION_REQUIREMENT_NOT_EXPLICIT', 'PENDING', 'IN_PROGRESS', 'SATISFIED', 'NOT_SATISFIED'
);
CREATE TYPE public.validation_case_outcome AS ENUM ('CORRECT', 'INCORRECT');
CREATE TYPE public.validation_status AS ENUM (
  'PENDING', 'IN_REVIEW', 'VALIDATED', 'NOT_VALIDATED', 'INSUFFICIENT_EVIDENCE'
);
CREATE TYPE public.follow_up_outcome AS ENUM ('OPEN', 'CONSOLIDATED', 'NEEDS_ADJUSTMENT');

-- Done ≠ Deliverable: marcar ejecución terminada no valida nada.
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS done_at timestamptz;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS done_by uuid;

-- ValidationRequirement / CRV ----------------------------------------------
CREATE TABLE public.validation_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id),
  intervention_id uuid NOT NULL REFERENCES public.interventions(id),
  activity_id uuid REFERENCES public.activities(id),
  knowledge_version_id uuid NOT NULL REFERENCES public.knowledge_versions(id),
  knowledge_pack_id text NOT NULL,
  knowledge_pack_version text NOT NULL,
  engine_version text NOT NULL,
  requirement_ref text,
  activity_ref text,
  definition text NOT NULL,
  definition_source text NOT NULL,
  status public.validation_requirement_status NOT NULL DEFAULT 'PENDING',
  primary_executor_respondent_id uuid REFERENCES public.respondents(id),
  required_case_count integer,
  detail jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.validation_requirements TO authenticated;
GRANT ALL ON public.validation_requirements TO service_role;
ALTER TABLE public.validation_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "validation_requirements_select_members" ON public.validation_requirements FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE TRIGGER validation_requirements_set_updated_at BEFORE UPDATE ON public.validation_requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX validation_requirements_activity_idx ON public.validation_requirements (activity_id);

CREATE TABLE public.validation_requirement_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  validation_requirement_id uuid NOT NULL REFERENCES public.validation_requirements(id),
  sequence_index integer NOT NULL,
  executor_respondent_id uuid NOT NULL REFERENCES public.respondents(id),
  outcome public.validation_case_outcome NOT NULL,
  critical_assistance boolean NOT NULL DEFAULT false,
  evidence_id uuid REFERENCES public.evidence(id),
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  registered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (validation_requirement_id, sequence_index)
);
GRANT SELECT ON public.validation_requirement_cases TO authenticated;
GRANT ALL ON public.validation_requirement_cases TO service_role;
ALTER TABLE public.validation_requirement_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "validation_requirement_cases_select_members" ON public.validation_requirement_cases FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));

-- Validation ---------------------------------------------------------------
CREATE TABLE public.validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id),
  intervention_id uuid NOT NULL REFERENCES public.interventions(id),
  activity_id uuid REFERENCES public.activities(id),
  validation_requirement_id uuid REFERENCES public.validation_requirements(id),
  evaluation_run_id uuid REFERENCES public.evaluation_runs(id),
  knowledge_version_id uuid NOT NULL REFERENCES public.knowledge_versions(id),
  engine_version text NOT NULL,
  status public.validation_status NOT NULL DEFAULT 'PENDING',
  decision_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.validations TO authenticated;
GRANT ALL ON public.validations TO service_role;
ALTER TABLE public.validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "validations_select_members" ON public.validations FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE TRIGGER validations_set_updated_at BEFORE UPDATE ON public.validations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX validations_intervention_idx ON public.validations (intervention_id);

CREATE TABLE public.validation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  validation_id uuid NOT NULL REFERENCES public.validations(id),
  evidence_id uuid NOT NULL REFERENCES public.evidence(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (validation_id, evidence_id)
);
GRANT SELECT ON public.validation_evidence TO authenticated;
GRANT ALL ON public.validation_evidence TO service_role;
ALTER TABLE public.validation_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "validation_evidence_select_members" ON public.validation_evidence FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));

-- Follow-up ----------------------------------------------------------------
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  activity_id uuid NOT NULL REFERENCES public.activities(id),
  validation_id uuid NOT NULL REFERENCES public.validations(id),
  status public.follow_up_outcome NOT NULL DEFAULT 'OPEN',
  note text,
  evidence_id uuid REFERENCES public.evidence(id),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow_ups_select_members" ON public.follow_ups FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE TRIGGER follow_ups_set_updated_at BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LearningCandidate ≠ Master Knowledge -------------------------------------
CREATE TABLE public.learning_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  assessment_id uuid REFERENCES public.assessments(id),
  validation_id uuid REFERENCES public.validations(id),
  knowledge_version_id uuid NOT NULL REFERENCES public.knowledge_versions(id),
  source_table text NOT NULL,
  source_id uuid,
  statement text NOT NULL,
  status text NOT NULL DEFAULT 'CANDIDATE',
  applied_to_master boolean NOT NULL DEFAULT false CHECK (applied_to_master = false),
  detail jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_candidates TO authenticated;
GRANT ALL ON public.learning_candidates TO service_role;
ALTER TABLE public.learning_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_candidates_select_members" ON public.learning_candidates FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE TRIGGER learning_candidates_set_updated_at BEFORE UPDATE ON public.learning_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reproducibilidad histórica (snapshot puntual, no event sourcing) ---------
CREATE TABLE public.assessment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id),
  knowledge_version_id uuid NOT NULL REFERENCES public.knowledge_versions(id),
  engine_version text NOT NULL,
  reason text NOT NULL,
  payload jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assessment_snapshots TO authenticated;
GRANT ALL ON public.assessment_snapshots TO service_role;
ALTER TABLE public.assessment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_snapshots_select_members" ON public.assessment_snapshots FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE INDEX assessment_snapshots_assessment_idx ON public.assessment_snapshots (assessment_id);