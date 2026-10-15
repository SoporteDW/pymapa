# Document-First · Bloque 1 · Contrato técnico corregido (sin ejecutar)

Alcance: solo persistencia de fragmentos, interpretaciones y correspondencias candidatas/validadas, con RLS, permisos e historial. No toca Knowledge Master, los 31 packs, Engine 0.2.0, ni la lógica de evaluación. No hay extracción con IA, interfaz ni checklist en este bloque.

## 1. Cadena de estados (cada uno es su propio registro; ninguno implica el siguiente)

```text
evidence (existente, versión de documento)
  -> document_extractions        EXTRAÍDO        (corrida de extracción: modelo, prompt, versión)
     -> evidence_fragments       FRAGMENTO       (cita literal y ubicación, solo se añaden)
        -> fragment_interpretations  HECHO INTERPRETADO (afirmación derivada, siempre candidata)
           -> fragment_mappings  CORRESPONDENCIA CANDIDATA -> VALIDADA | RECHAZADA
              (solo la validada y basada en una regla puede producir, en bloques posteriores:)
              -> observations / observation_evidence (existentes) OBSERVACIÓN ADMITIDA
                 -> answeredAcquisitionRefs  ADQUISICIÓN RESPONDIDA
                    -> Engine 0.2.0          CIERRE DIAGNÓSTICO (lo decide solo el Engine)
```

Reglas del contrato:
- C1 Mapeo gobernado: `fragment_mappings.status` empieza en `CANDIDATE`. Solo pasa a `VALIDATED` si hay `admission_basis` en (`GOVERNED_RULE`, `HUMAN_VALIDATION`) y además `admission_rule_ref` o `validated_by`. La similitud semántica (`proposed_by = AI`) nunca es fundamento de admisión: un trigger rechaza `VALIDATED` con `admission_basis = 'AI_SIMILARITY'` (ese valor no existe en el enum).
- C2 Estados separados: cada transición es una fila nueva o un cambio de estado auditado; no hay triggers que propaguen estados aguas abajo.
- C3 Persistencia segura: claves compuestas `(organization_id, id)` y FKs compuestas para que un fragmento, una interpretación o una correspondencia no puedan apuntar a la evidencia de otra organización. Versionado: `evidence_versions` (hash del archivo, ruta y versión) y `document_extractions.extraction_version`. Trazabilidad: `model_id`, `model_provider`, `prompt_ref`, `knowledge_version_id`, `knowledge_pack_id` y `knowledge_pack_version` en la extracción y en la correspondencia.
- C4 Control de preguntas: `answeredAcquisitionRefs` se construye en bloques posteriores solo a partir de observaciones admitidas (respuestas vigentes o correspondencias `VALIDATED` de tipo `ACQUISITION`). Una correspondencia candidata nunca alimenta `answeredAcquisitionRefs`, NI ni el cierre. Esto se documenta en AGENTS.md y lo verifica una prueba.
- C5 CM-05 y las 12 capacidades progresivas: una correspondencia con `target_type = 'VARIABLE'` es inadmisible cuando la variable proviene de una adquisición CAPABILITY_PROGRESSIVE con varias variables, salvo `factual_correspondence_ref` explícita. Las correspondencias progresivas se registran como `target_type = 'ACQUISITION'` (independientes entre sí). El servidor aplica la regla al validar; la prueba cubre el caso de VA01.
- C6 Inmutabilidad: las tablas nuevas no escriben en `knowledge_versions` ni en los packs; los identificadores (CE/VA/NI/ACQ) son texto validado en el servidor contra el registry estático y no se crean en la base.

## 2. Permisos (tres niveles con `membership_role`)

| Acción | MEMBER | ADMIN | OWNER | service_role |
|---|---|---|---|---|
| Leer fragmentos, interpretaciones y correspondencias de su organización | sí | sí | sí | sí |
| Crear extracción, fragmento o interpretación | no (solo el servidor) | no | no | sí |
| Proponer correspondencia candidata | no | no | no | sí |
| Validar o rechazar correspondencia | no | sí | sí | sí (solo con regla) |
| Retirar o reemplazar una extracción (`superseded`) | no | no | sí | sí |
| DELETE en cualquier tabla nueva | no | no | no | no (bloqueado por trigger) |

El rol anónimo no tiene acceso. Los clientes autenticados solo reciben `SELECT` y, en `fragment_mappings`, `UPDATE` de columnas de decisión vía una función `validate_fragment_mapping` con SECURITY DEFINER que comprueba el rol con `private.is_organization_member` más el rol en `memberships`.

## 3. SQL propuesto (no ejecutado)

```sql
-- Enums
create type public.extraction_status as enum ('PENDING','PROCESSING','COMPLETED','FAILED','SUPERSEDED');
create type public.mapping_status as enum ('CANDIDATE','VALIDATED','REJECTED','SUPERSEDED');
create type public.mapping_target_type as enum ('ACQUISITION','INFORMATION_NEED','VARIABLE','EVIDENCE_CRITERION');
create type public.mapping_admission_basis as enum ('GOVERNED_RULE','HUMAN_VALIDATION');
create type public.mapping_proposer as enum ('AI','HUMAN','DETERMINISTIC_RULE');

-- Clave compuesta de soporte en evidence (sin cambiar datos)
create unique index evidence_org_id_unique on public.evidence (organization_id, id);

-- Versiones de documento
create table public.evidence_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  evidence_id uuid not null,
  version_number integer not null,
  content_sha256 text not null,
  storage_bucket text, storage_path text, mime_type text, byte_size bigint,
  created_by uuid, created_at timestamptz not null default now(),
  foreign key (organization_id, evidence_id) references public.evidence (organization_id, id) on delete restrict,
  unique (evidence_id, version_number),
  unique (organization_id, id)
);

-- Corrida de extracción
create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  evidence_version_id uuid not null,
  extraction_version integer not null,
  status public.extraction_status not null default 'PENDING',
  model_provider text not null, model_id text not null, prompt_ref text not null,
  knowledge_version_id uuid not null references public.knowledge_versions (id) on delete restrict,
  superseded_by_extraction_id uuid references public.document_extractions (id),
  error_detail jsonb, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, evidence_version_id) references public.evidence_versions (organization_id, id) on delete restrict,
  unique (evidence_version_id, extraction_version),
  unique (organization_id, id)
);

-- Fragmento literal (solo se añaden)
create table public.evidence_fragments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  extraction_id uuid not null,
  sequence_index integer not null,
  verbatim_text text not null,
  locator jsonb not null,            -- página, desplazamiento, celda...
  text_sha256 text not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, extraction_id) references public.document_extractions (organization_id, id) on delete restrict,
  unique (extraction_id, sequence_index),
  unique (organization_id, id)
);

-- Hecho interpretado (siempre candidato)
create table public.fragment_interpretations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  fragment_id uuid not null,
  statement text not null,
  model_provider text not null, model_id text not null, prompt_ref text not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, fragment_id) references public.evidence_fragments (organization_id, id) on delete restrict,
  unique (organization_id, id)
);

-- Correspondencia candidata o validada
create table public.fragment_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  assessment_id uuid not null references public.assessments (id) on delete restrict,
  fragment_id uuid not null,
  interpretation_id uuid,
  capability_id text not null,
  target_type public.mapping_target_type not null,
  target_ref text not null,
  knowledge_version_id uuid not null references public.knowledge_versions (id) on delete restrict,
  knowledge_pack_id text not null, knowledge_pack_version text not null,
  proposed_by public.mapping_proposer not null,
  proposer_model_id text,
  status public.mapping_status not null default 'CANDIDATE',
  admission_basis public.mapping_admission_basis,
  admission_rule_ref text,
  factual_correspondence_ref text,
  validated_by uuid, validated_at timestamptz, decision_note text,
  supersedes_mapping_id uuid references public.fragment_mappings (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, fragment_id) references public.evidence_fragments (organization_id, id) on delete restrict,
  foreign key (organization_id, interpretation_id) references public.fragment_interpretations (organization_id, id) on delete restrict,
  constraint mapping_validated_requires_basis check (
    status <> 'VALIDATED' or (admission_basis is not null and
      (admission_rule_ref is not null or validated_by is not null)))
);

-- Grants (sin anon), RLS y políticas de lectura por membresía
grant select on public.evidence_versions, public.document_extractions, public.evidence_fragments,
  public.fragment_interpretations, public.fragment_mappings to authenticated;
grant all on public.evidence_versions to service_role;
grant all on public.document_extractions to service_role;
grant all on public.evidence_fragments to service_role;
grant all on public.fragment_interpretations to service_role;
grant all on public.fragment_mappings to service_role;
alter table public.evidence_versions enable row level security;
alter table public.document_extractions enable row level security;
alter table public.evidence_fragments enable row level security;
alter table public.fragment_interpretations enable row level security;
alter table public.fragment_mappings enable row level security;
create policy "<tabla>_select_members" on public.<tabla> for select to authenticated
  using (private.is_organization_member(organization_id));   -- una por tabla

-- Triggers de integridad
--  * prevent_delete(): RAISE en DELETE para las 5 tablas (también para service_role).
--  * fragments_immutable(): RAISE en UPDATE de evidence_fragments y fragment_interpretations.
--  * mapping_transition_guard(): solo permite CANDIDATE->VALIDATED|REJECTED y
--    VALIDATED->SUPERSEDED; impide cambiar fragment_id, target_*, capability_id,
--    knowledge_*; exige assessment.organization_id = organization_id;
--    escribe audit_events en cada transición.
--  * set_updated_at() existente en fragment_mappings.

-- Auditoría: ampliar el enum existente (cambio solo aditivo)
alter type public.audit_event_type add value 'FRAGMENT_MAPPING_PROPOSED';
alter type public.audit_event_type add value 'FRAGMENT_MAPPING_VALIDATED';
alter type public.audit_event_type add value 'FRAGMENT_MAPPING_REJECTED';
alter type public.audit_event_type add value 'EXTRACTION_SUPERSEDED';

-- Validación con rol (ADMIN/OWNER), SECURITY DEFINER, search_path=public
create function public.validate_fragment_mapping(_mapping_id uuid, _decision public.mapping_status,
  _basis public.mapping_admission_basis, _rule_ref text, _note text) returns void ...;
grant execute on function public.validate_fragment_mapping to authenticated;
```

El bucket `evidence` y sus políticas de almacenamiento no cambian (ya se aíslan por carpeta de organización).

## 4. Archivos y contratos que se modificarían

- `supabase/migrations/<ts>_document_first_block1.sql`: el SQL anterior.
- `packages/contracts/src/index.ts`: solo tipos `EvidenceFragmentDTO`, `FragmentInterpretationDTO`, `FragmentMappingDTO`, `MappingStatus`, `MappingTargetType`, `AdmissionBasis` (sin lógica).
- `src/lib/production/fragment-mapping-guard.ts` (nuevo, puro): `puedeAdmitirse(mapping, pack)` aplica C1 y C5 contra `packs-registry.ts` (solo lectura). Comprueba que `target_ref` existe en el pack, rechaza `VARIABLE` en progresivas con varias variables sin `factual_correspondence_ref` y rechaza la admisión sin fundamento.
- `src/lib/datos-productivos/esquema.test.ts`: añadir las 5 tablas a `TABLAS` y nuevos invariantes.
- `AGENTS.md`: una regla nueva: "Las correspondencias de fragmentos son candidatas hasta su admisión gobernada; solo las observaciones admitidas alimentan answeredAcquisitionRefs."
- Sin cambios en `caso-uso.ts`, `actionable.ts`, el Engine, los packs ni la interfaz en este bloque.

## 5. Pruebas

Estáticas sobre las migraciones (`esquema.test.ts`):
- Las 5 tablas: uuid, `organization_id` NOT NULL, RLS, grant a service_role, sin anon, sin `using (true)`.
- Las FKs compuestas `(organization_id, …)` existen en cada eslabón.
- Existe el check `mapping_validated_requires_basis`; `mapping_admission_basis` no contiene ningún valor de similitud.
- Existen triggers anti-DELETE y de inmutabilidad de fragmentos.
- Ningún `insert`/`update` sobre `knowledge_versions` en la migración.

Unitarias (`fragment-mapping-guard.test.ts`):
- Candidata de IA sin regla → no admisible.
- CM-05: candidata `VARIABLE`/VA01 desde ACQ·P1·01 y P1·02 → inadmisible; como `ACQUISITION` → dos registros independientes, sin contradicción.
- `target_ref` inexistente en el pack → rechazo. Recorrido de las 31 capacidades sin modificar `published.json` (se recalcula el checksum para comprobar).
- Una candidata no altera `answeredAcquisitionRefs` ni `evaluarAssessment()` (regresión con fixture CM-05 histórico).

De integración con RLS (organización QA aislada más una segunda organización QA; sin escrituras en Digiway Corp):
- Un MEMBER de la org A no ve fragmentos de la org B; un INSERT cruzado (fragmento de A con extracción de B) falla por la FK compuesta.
- MEMBER no puede validar; ADMIN sí; OWNER puede reemplazar extracciones.
- DELETE falla para todos los roles; UPDATE de `verbatim_text` falla.
- Una transición inválida (REJECTED→VALIDATED) falla; cada transición válida deja un registro en `audit_events`.
- Una nueva versión de documento o extracción conserva las anteriores consultables.
- Suite completa con `bunx vitest run`: reportar el total de aprobadas, fallidas y omitidas.

## 6. Dependencias mínimas para bloques posteriores

- Bloque 2 (checklist): catálogo de documentos derivado de la evidencia citada en los packs, solo lectura; no requiere más tablas que `evidence_versions`.
- Bloque 3 (extracción con IA): función de servidor con Lovable AI Gateway que escribe solo con service_role en `document_extractions`, `evidence_fragments` e `fragment_interpretations`; límites de tamaño, tipo y costo; registrar modelo y prompt.
- Bloque 4 (admisión): reglas gobernadas (`admission_rule_ref`) aprobadas por gobierno; sin reglas, solo validación humana. Puente desde VALIDATED a `observations`/`observation_evidence` con `capabilityId` y procedencia.
- Bloque 5 (preguntas y conversación): `answeredAcquisitionRefs` desde observaciones admitidas; sigue pendiente el defecto de aclaraciones cruzadas con VA01, que debe resolverse antes de admitir correspondencias de tipo VARIABLE en progresivas.
- Siguen bloqueados: la suficiencia automática de NI y el cierre de capacidad sin reglas aprobadas.
