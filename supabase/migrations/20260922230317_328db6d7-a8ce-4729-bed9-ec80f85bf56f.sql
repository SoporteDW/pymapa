-- EvaluationRun lineage is immutable: the engine version and knowledge version
-- recorded at creation can never be rewritten (no backfill, no relabelling).
create or replace function private.evaluation_runs_lineage_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.engine_version is distinct from old.engine_version then
    raise exception 'EVALUATION_RUN_ENGINE_VERSION_IMMUTABLE';
  end if;
  if new.knowledge_version_id is distinct from old.knowledge_version_id then
    raise exception 'EVALUATION_RUN_KNOWLEDGE_VERSION_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger evaluation_runs_lineage_immutable
  before update on public.evaluation_runs
  for each row execute function private.evaluation_runs_lineage_immutable();