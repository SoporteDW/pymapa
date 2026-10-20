-- MVP-BETA-INT-01 · additive only.
-- 1) Server-side allowlist for SYNTHETIC_QA_ONLY deterministic ingestion.
CREATE TABLE public.synthetic_qa_ingestion_authorizations (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  authorization_reference text NOT NULL,
  rule_set_version text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.synthetic_qa_ingestion_authorizations TO authenticated;
GRANT ALL ON public.synthetic_qa_ingestion_authorizations TO service_role;
ALTER TABLE public.synthetic_qa_ingestion_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own synthetic qa authorization"
  ON public.synthetic_qa_ingestion_authorizations FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
COMMENT ON TABLE public.synthetic_qa_ingestion_authorizations IS
  'MVP-BETA-INT-01: organizations allowed to run SYNTHETIC_QA_ONLY deterministic document ingestion. No client write policies; rows are managed only by governed operators.';

-- 2) Activity owner and due date (human action planning, nullable).
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS responsible_label text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS due_date date;