-- INSERT ... RETURNING fails under RLS because the new org is not yet visible
-- (membership is created right after). The function already enforces auth.uid()
-- and idempotency (one org per user), so it runs as definer.
ALTER FUNCTION public.bootstrap_organization(text) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.bootstrap_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_organization(text) TO authenticated;