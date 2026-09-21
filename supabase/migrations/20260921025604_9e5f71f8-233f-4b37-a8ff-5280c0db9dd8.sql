-- Alta de organización acotada: solo quien aún no pertenece a ninguna.
CREATE POLICY "organizations_insert_bootstrap"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.memberships m WHERE m.user_id = auth.uid()
  )
);

-- Autoalta como OWNER solo en una organización sin miembros todavía.
CREATE POLICY "memberships_insert_bootstrap_owner"
ON public.memberships FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'OWNER'::membership_role
  AND NOT EXISTS (
    SELECT 1 FROM public.memberships m WHERE m.organization_id = memberships.organization_id
  )
);

-- La función deja de ser SECURITY DEFINER: las reglas RLS de arriba la gobiernan.
CREATE OR REPLACE FUNCTION public.bootstrap_organization(_name text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
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
$function$;