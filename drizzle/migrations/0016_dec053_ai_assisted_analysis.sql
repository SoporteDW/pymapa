CREATE TABLE public.ai_assisted_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL,
  capability_id text NOT NULL,
  analysis_type text NOT NULL DEFAULT 'AI_ASSISTED_ANALYSIS' CHECK (analysis_type = 'AI_ASSISTED_ANALYSIS'),
  contract_version text NOT NULL,
  input_refs jsonb NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  items jsonb NOT NULL,
  rejected_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider text NOT NULL,
  model text NOT NULL,
  service_version text NOT NULL,
  run_id text,
  requested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_assisted_analyses TO authenticated;
GRANT ALL ON public.ai_assisted_analyses TO service_role;
ALTER TABLE public.ai_assisted_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY aaa_select_member ON public.ai_assisted_analyses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = ai_assisted_analyses.organization_id AND m.user_id = auth.uid()));

CREATE TABLE public.ai_assisted_analysis_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.ai_assisted_analyses(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('ACCEPTED','DISMISSED','NEEDS_INFORMATION')),
  note text NOT NULL CHECK (length(btrim(note)) >= 3),
  accepted_action text,
  reviewed_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_assisted_analysis_reviews TO authenticated;
GRANT ALL ON public.ai_assisted_analysis_reviews TO service_role;
ALTER TABLE public.ai_assisted_analysis_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY aaar_select_member ON public.ai_assisted_analysis_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = ai_assisted_analysis_reviews.organization_id AND m.user_id = auth.uid()));
CREATE POLICY aaar_insert_admin ON public.ai_assisted_analysis_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewed_by = auth.uid()
    AND private.has_organization_role(organization_id, ARRAY['OWNER','ADMIN']::public.membership_role[])
    AND EXISTS (SELECT 1 FROM public.ai_assisted_analyses a WHERE a.id = analysis_id AND a.organization_id = ai_assisted_analysis_reviews.organization_id)
  );