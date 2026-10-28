CREATE TABLE public.transformation_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  proposal_key TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('ACCEPTED','MODIFIED','DISCARDED')),
  modified_action TEXT,
  note TEXT NOT NULL CHECK (char_length(btrim(note)) >= 3),
  decided_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX transformation_decisions_org_key ON public.transformation_decisions (organization_id, proposal_key, created_at DESC);
GRANT SELECT, INSERT ON public.transformation_decisions TO authenticated;
GRANT ALL ON public.transformation_decisions TO service_role;
ALTER TABLE public.transformation_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transformation_decisions_select ON public.transformation_decisions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = transformation_decisions.organization_id AND m.user_id = auth.uid()));
CREATE POLICY transformation_decisions_insert ON public.transformation_decisions FOR INSERT TO authenticated
  WITH CHECK (decided_by = auth.uid() AND private.has_organization_role(organization_id, ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role]));