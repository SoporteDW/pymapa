# Productive Data Foundation (M1-C)

Primera fundación de datos productiva de Pymapa. Estructura únicamente: sin lógica
diagnóstica, sin reglas de conocimiento, sin contenido de capacidades.

## Tenancy

- `organizations` es el tenant root.
- Shared schema + organization ownership + RLS. **No** hay una base de datos por organización.
- Toda tabla tenant-owned incluye `organization_id` con FK a `organizations`, de modo que
  cualquier fila se traza inequívocamente hasta su tenant sin joins ambiguos.

## Identity boundaries

- `User ≠ Membership`. El usuario autenticado vive en el sistema de autenticación;
  `memberships` es la relación usuario ↔ organización, con rol `OWNER | ADMIN | MEMBER`.
- No se introducen Respondent externo ni Assignment externo en esta etapa.

## Case / Assessment

- `cases`: caso de transformación de largo plazo de una organización.
- `assessments`: evaluación temporal dentro de un caso.
  - `knowledge_version_id` es **obligatorio** (`not null`, FK `on delete restrict`):
    ningún assessment puede recalcularse silenciosamente contra otra versión de conocimiento.
  - `type`: `BASELINE | REASSESSMENT | FOLLOW_UP`.

## Response ≠ Observation

- `responses` preserva la entrada aportada por la persona (`payload jsonb`, `acquisition_ref`,
  `submitted_by`). Es append-only desde la aplicación.
- `observations` representa información estructurada aceptada para evaluación
  (`variable_ref`, `value`).
- `observations.source_response_id` es **nullable**: no toda Response produce Observation,
  y no toda Observation proviene de una Response. Cuando existe origen, la trazabilidad
  queda registrada.
- No hay AI extraction en esta etapa.

## Knowledge Version

`knowledge_versions`: `identifier`, `version`, `status`
(`DRAFT | VALIDATED | PUBLISHED | SUPERSEDED`), `checksum` (integridad), `published_at`,
`created_at`, `updated_at`; unicidad por (`identifier`, `version`).
Una versión `PUBLISHED` se trata conceptualmente como inmutable: no hay GRANT de escritura
para `authenticated`; solo el servidor puede publicar o superseder.

## Evaluation Run

`evaluation_runs`: `assessment_id`, `knowledge_version_id`, `engine_version`, `trigger`,
`status`, `started_at`, `completed_at`, `created_at`.

- Triggers: `RESPONSE_ACCEPTED`, `EVIDENCE_ADDED`, `OBSERVATION_UPDATED`,
  `CONTRADICTION_RESOLVED`, `MANUAL_REEVALUATION`, `REASSESSMENT_STARTED`,
  `VALIDATION_COMPLETED`.
- Estados: `PENDING`, `PROCESSING`, `PROCESSED`, `FAILED`, `NEEDS_REVIEW`.
- El Knowledge Engine no se ejecuta todavía; la tabla es el registro de auditoría preparado.

## Variable Evaluations

`variable_evaluations` cuelga de `evaluation_run_id` con unicidad por
(`evaluation_run_id`, `variable_ref`). `state` es `text` deliberadamente: los estados
semánticos los definirá el Knowledge Engine gobernado. **No** se inventan escalas numéricas
ni reglas de evaluación aquí.

## Information Need States

`information_need_states` (`assessment_id`, `need_ref`, `state`, `evaluation_run_id`)
permite que el futuro engine registre qué información falta, para que la Application API
pueda retornar `NextAcquisitionDTO`. No se definen reglas de selección de preguntas.

## Compatibilidad

El frontend actual **no** está conectado a estas tablas. `AssessmentClient` (M1-B) sigue
usando `ExecutionSource.MVP_ENGINE` y el estado del MVP continúa en localStorage.
