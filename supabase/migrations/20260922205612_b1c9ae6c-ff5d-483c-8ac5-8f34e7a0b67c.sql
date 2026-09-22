revoke all on public.finding_resolution_states from anon;
revoke insert, update, delete, truncate, references, trigger on public.finding_resolution_states from authenticated;
grant select on public.finding_resolution_states to authenticated;
grant all on public.finding_resolution_states to service_role;