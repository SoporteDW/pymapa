-- INT-01-R1 · Revocación gobernada de correspondencias documentales.
-- Operación separada de validate_fragment_mapping (que solo decide
-- CANDIDATE → VALIDATED/REJECTED). Aquí solo VALIDATED → SUPERSEDED,
-- transición ya admitida por fragment_mappings_transition_guard (Bloque 1),
-- que registra FRAGMENT_MAPPING_SUPERSEDED en audit_events (append-only).
-- Idempotente: revocar una correspondencia ya SUPERSEDED es no-op.
create or replace function public.revoke_fragment_mapping(
  _mapping_id uuid,
  _note text
) returns void language plpgsql security definer set search_path = public as $$
declare _org uuid; _status public.mapping_status;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select organization_id, status into _org, _status
    from public.fragment_mappings where id = _mapping_id;
  if _org is null then raise exception 'FRAGMENT_MAPPING_NOT_FOUND'; end if;
  if not private.has_organization_role(_org, array['OWNER','ADMIN']::public.membership_role[]) then
    raise exception 'FRAGMENT_MAPPING_REVOCATION_FORBIDDEN';
  end if;
  if _status = 'SUPERSEDED' then return; end if; -- idempotente
  if _status <> 'VALIDATED' then
    raise exception 'FRAGMENT_MAPPING_REVOKE_REQUIRES_VALIDATED';
  end if;
  update public.fragment_mappings
     set status = 'SUPERSEDED',
         decision_note = _note
   where id = _mapping_id;
end $$;
revoke all on function public.revoke_fragment_mapping(uuid, text) from public, anon;
grant execute on function public.revoke_fragment_mapping(uuid, text) to authenticated, service_role;
