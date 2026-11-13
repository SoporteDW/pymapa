DROP POLICY IF EXISTS canonical_authenticated_read ON public.coverage_canonical_acquisitions;
DROP POLICY IF EXISTS criteria_events_read ON public.coverage_criteria_events;
REVOKE SELECT ON public.coverage_canonical_acquisitions FROM authenticated, anon;
REVOKE SELECT ON public.coverage_criteria_events FROM authenticated, anon;
GRANT ALL ON public.coverage_canonical_acquisitions TO service_role;
GRANT ALL ON public.coverage_criteria_events TO service_role;