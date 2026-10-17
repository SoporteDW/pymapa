-- INT-01 · E1 · Puente de admisión documental: idempotencia y auditoría
-- Índice único parcial: una correspondencia documental admite a lo sumo UNA
-- observación física (control efectivo de base de datos, no solo en memoria).
create unique index if not exists observations_document_mapping_unique
  on public.observations ((value->'documentProvenance'->>'mappingId'))
  where value->'documentProvenance'->>'mappingId' is not null;

-- Eventos de auditoría del puente (aditivos; no alteran eventos existentes).
alter type public.audit_event_type add value if not exists 'DOCUMENT_OBSERVATION_ADMITTED';
alter type public.audit_event_type add value if not exists 'DOCUMENT_OBSERVATION_INVALIDATED';