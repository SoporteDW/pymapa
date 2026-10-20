CREATE TABLE public.semantic_qa_authorizations (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  execution_id text NOT NULL,
  corpus_version text NOT NULL,
  corpus_checksum text NOT NULL,
  authorization_reference text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, execution_id)
);
GRANT SELECT ON public.semantic_qa_authorizations TO authenticated;
GRANT ALL ON public.semantic_qa_authorizations TO service_role;
ALTER TABLE public.semantic_qa_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own semantic qa authorization" ON public.semantic_qa_authorizations
  FOR SELECT TO authenticated USING (private.is_organization_member(organization_id));

CREATE TABLE public.semantic_qa_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id uuid NOT NULL,
  execution_id text NOT NULL,
  document_id text NOT NULL,
  evidence_id uuid,
  outcome text NOT NULL CHECK (outcome IN ('REJECTED','TRANSMITTED_OK','TRANSMITTED_ERROR')),
  rejection_reason text,
  file_sha256 text,
  text_sha256 text,
  corpus_checksum text NOT NULL,
  provider text, model text, run_id text, prompt_version text,
  verified_count int, discarded_count int, contradiction_count int,
  result_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.semantic_qa_attempts TO authenticated;
GRANT ALL ON public.semantic_qa_attempts TO service_role;
ALTER TABLE public.semantic_qa_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners admins read own semantic qa attempts" ON public.semantic_qa_attempts
  FOR SELECT TO authenticated USING (organization_id IS NOT NULL AND private.has_organization_role(organization_id, ARRAY['OWNER','ADMIN']::membership_role[]));
CREATE TRIGGER semantic_qa_attempts_no_update BEFORE UPDATE ON public.semantic_qa_attempts FOR EACH ROW EXECUTE FUNCTION private.document_first_prevent_update();
CREATE TRIGGER semantic_qa_attempts_no_delete BEFORE DELETE ON public.semantic_qa_attempts FOR EACH ROW EXECUTE FUNCTION private.document_first_prevent_delete();

INSERT INTO public.semantic_qa_authorizations (organization_id, execution_id, corpus_version, corpus_checksum, authorization_reference)
VALUES ('a62e562b-f282-4915-a004-b3746ec7cdcd','SEM-QA-01','SEM-QA-01-CORPUS-1.0.0','6670bfdfb498210f202bd319d70bcb7bd40713d99cd40b383156914a6faa8f59','DEC-047 · SEM-QA-01 · org QA sintética limpia');