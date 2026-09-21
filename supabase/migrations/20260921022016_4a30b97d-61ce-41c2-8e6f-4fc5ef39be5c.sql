CREATE OR REPLACE FUNCTION public.bootstrap_organization(_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT m.organization_id
    INTO _org_id
    FROM public.memberships m
   WHERE m.user_id = _user_id
   ORDER BY m.created_at ASC
   LIMIT 1;

  IF _org_id IS NOT NULL THEN
    RETURN _org_id;
  END IF;

  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NULLIF(btrim(_name), ''), 'Organización de trabajo'))
  RETURNING id INTO _org_id;

  INSERT INTO public.memberships (organization_id, user_id, role)
  VALUES (_org_id, _user_id, 'OWNER');

  RETURN _org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_organization(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_organization(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_organization(text) TO authenticated;