# M1-KL · CRV + Validation + Reassessment

Cierra el vertical productivo OP-01 desde Deliverable hasta Consolidación y Reevaluación,
preservando las separaciones conceptuales del Knowledge Master.
No avanza a M1-M. No reabre M1-HIJ.

## 1. Separaciones preservadas

`Activity ≠ Deliverable ≠ Done ≠ CRV ≠ Validation`.

- Un Deliverable registrado deja la actividad en `DELIVERABLE_PRODUCED`; nunca `done`.
- `Done` es un hecho propio de la actividad (`activities.done_at`, `done_by`) y exige
  un entregable previo (`DELIVERABLE_REQUIRED_BEFORE_DONE`).
- `Done` no implica Validation: abrir una Validation requiere Done y nunca decide sola.
- El CRV no es un KPI: `validation_requirements` no tiene columna de puntaje, umbral ni
  madurez, y el schema del pack fuerza `formula: "NOT_A_SCORE"`.
- La Validation no reutiliza scoring del MVP: solo consume la evaluación del CRV.

## 2. Archivos, tablas y policies

Migración M1-KL:

- Enum `execution_state` extendido: `PENDING`, `EXECUTING`, `DELIVERABLE_PRODUCED`,
  `VALIDATED`, `FOLLOW_UP`, `CONSOLIDATED`, `NEEDS_ADJUSTMENT`.
- Enum `audit_event_type` extendido: `ACTIVITY_MARKED_DONE`,
  `VALIDATION_REQUIREMENT_REGISTERED`, `VALIDATION_CASE_REGISTERED`, `VALIDATION_DECIDED`,
  `FOLLOW_UP_STARTED`, `FOLLOW_UP_DECIDED`, `REASSESSMENT_STARTED`, `SNAPSHOT_CREATED`,
  `LEARNING_CANDIDATE_CREATED`.
- Nuevos enums: `validation_requirement_status`
  (`VALIDATION_REQUIREMENT_NOT_EXPLICIT | PENDING | IN_PROGRESS | SATISFIED | NOT_SATISFIED`),
  `validation_case_outcome` (`CORRECT | INCORRECT`), `validation_status`
  (`PENDING | IN_REVIEW | VALIDATED | NOT_VALIDATED | INSUFFICIENT_EVIDENCE`),
  `follow_up_outcome` (`OPEN | CONSOLIDATED | NEEDS_ADJUSTMENT`).
- Nuevas tablas: `validation_requirements`, `validation_requirement_cases`, `validations`,
  `validation_evidence`, `follow_ups`, `learning_candidates`, `assessment_snapshots`.
- `activities` gana `done_at` y `done_by`.

RLS: todas las nuevas tablas son tenant-owned (`organization_id`), con lectura para
`authenticated` solo vía `private.is_organization_member(organization_id)` y escritura
exclusiva de `service_role`. El cliente nunca escribe outputs gobernados. Sin GRANT a `anon`.
Aislamiento cross-tenant intacto; linter Supabase sin hallazgos.

Código:

- `src/lib/production/puertos.ts` — registros y 26 métodos nuevos de repositorio + repositorio
  en memoria con membresías.
- `src/lib/production/runtime.server.ts` — persistencia real y mapeos.
- `src/lib/production/caso-uso.ts` — casos de uso M1-KL.
- `src/lib/production/op01.functions.ts` — 10 server functions autenticadas.
- `src/services/production/production-client.ts` — cliente productivo.
- `src/routes/_authenticated/capacidad.op-01.tsx` — UI extendida (misma pantalla).
- `packages/knowledge-schema/src/index.ts`, `packages/knowledge-engine/src/index.ts`,
  `knowledge/packs/op-01/1.0.0/pack.json`.

## 3. Modelo CRV

`validation_requirements` conserva: `organization_id`, `case_id`, `assessment_id`,
`intervention_id`, `activity_id` (cuando corresponde), `knowledge_version_id`,
`knowledge_pack_id`, `knowledge_pack_version`, `engine_version`, `requirement_ref`,
`activity_ref`, `definition`, `definition_source`, `status`,
`primary_executor_respondent_id`, `required_case_count`, `detail`, `created_by`, timestamps.
Evidencia por referencia mediante `validation_requirement_cases.evidence_id` y
`validation_evidence`.

## 4. Implementación exacta de A04

Único CRV explícito: `CRV-A04-01`, definición literal
*"Second executor correctly completes 3 consecutive cases without critical assistance."*,
`formula: "NOT_A_SCORE"`, con tres condiciones conjuntas:

1. `DISTINCT_SECOND_EXECUTOR` — ejecutor distinto del habitual.
2. `CONSECUTIVE_CORRECT_CASES` con `requiredCount: 3`.
3. `NO_CRITICAL_ASSISTANCE`.

`evaluateValidationRequirement` calcula la mejor racha consecutiva correcta sin asistencia
crítica por ejecutor secundario. Dos casos ⇒ `IN_PROGRESS`. Asistencia crítica rompe la racha.
Tres casos del ejecutor original no satisfacen la condición de segundo ejecutor.
No se transforma en score ni en porcentaje.

Actividades sin CRV explícito (A01–A03, A05–A09): se registra
`VALIDATION_REQUIREMENT_NOT_EXPLICIT` y no se admiten casos; el gap queda trazable.

## 5. Validation

`validations` referencia intervention, activity, validation_requirement, evaluation_run,
knowledge_version, engine_version, `status`, `decision_reason`, `reviewed_by`, `reviewed_at`.
`VALIDATED` solo es posible con CRV explícito satisfecho (`VALIDATION_NOT_GOVERNED`,
`VALIDATION_NOT_VALIDATED`) y con membresía en la organización
(`VALIDATION_PERMISSION_REQUIRED`): un respondent externo puede aportar evidencia pero no
validar.

## 6. Follow-up

`Pending → Executing → Deliverable produced → Validated → Follow-up → Consolidated /
Needs adjustment`. El follow-up solo abre sobre una Validation `VALIDATED`, y
`CONSOLIDATED` / `NEEDS_ADJUSTMENT` exigen provenance (decisor + nota o evidencia).

## 7. Reassessment, pinning y reproducibilidad

`iniciarReassessment` crea un `assessment_snapshots` del baseline y un Assessment nuevo
`type = REASSESSMENT` en el mismo Case, con `EvaluationRun` de trigger `REASSESSMENT_STARTED`.
No sobrescribe responses, observations, evidence, runs, findings ni validations previas.
Cada Assessment queda pinneado a su `knowledge_version_id`; consultar el baseline sigue
usando su versión original. Baseline → KV A y Reassessment → KV B pueden coexistir.
Reproducibilidad por Assessment + KnowledgeVersion + EngineVersion + inputs + runs + outputs;
snapshot solo donde preserva un estado significativo. Sin event sourcing.

## 8. Comparación Baseline / Reassessment

`compararAssessments` devuelve transiciones por variable
(`UNCHANGED | MORE_INFORMATION | LESS_INFORMATION | CONTRADICTION_RESOLVED |
CONTRADICTION_INTRODUCED | CHANGED | NEW | REMOVED`) con `improvement: null` y
`maturityScore: null`. `UNKNOWN → KNOWN` es más información; `CONTRADICTORY → KNOWN` es
contradicción resuelta. Ninguna se etiqueta como mejora empresarial.

## 9. LearningCandidate

`learning_candidates` con `applied_to_master boolean not null default false` y
`check (applied_to_master = false)`. Ningún resultado del cliente modifica el pack publicado.
Sin auto-learning.

## 10. Journeys verificados en la aplicación real

- **A · A04 + CRV**: tarea A04 → entregable → Done → casos 1 y 2 correctos sin asistencia
  crítica → CRV `IN_PROGRESS`, Validation `INSUFFICIENT_EVIDENCE` y confirmación rechazada →
  caso 3 → CRV `SATISFIED` → Validation `VALIDATED` → Follow-up `OPEN`.
- **B · Missing CRV**: tarea sin CRV explícito → entregable → Done →
  `VALIDATION_REQUIREMENT_NOT_EXPLICIT`, sin validación automática.
- **C · Reassessment**: nuevo Assessment `REASSESSMENT` en el mismo Case con run propio;
  el baseline conserva 3 observations, 4 runs y 4 findings.
- **D · Version change**: pinning verificado en tests; en la base solo existe la versión
  publicada 1.0.0, así que no se fabricó una KnowledgeVersion B ficticia.

## 11. Tests

`src/lib/production/crv-validacion-reassessment.test.ts` (27 tests) más los checks de esquema
M1-KL en `src/lib/datos-productivos/esquema.test.ts`.
Total: **369 tests verdes en 23 archivos** (334 previos intactos).
`bunx tsgo --noEmit` limpio. Linter Supabase sin hallazgos.

## 12. NOT EXPLICIT IN KNOWLEDGE MASTER

- CRV para A01–A03 y A05–A09.
- Interpretación de Validation/Reassessment como mejora empresarial.
- Contenido de recomendaciones R01–R09 y actividades A01–A09.
- Severidad y prioridad.

## 13. KCC

Preservados KCC-AT04-01..11. Nuevos:

- **KCC-AT04-12** — no existe CRV explícito para A01–A03 ni A05–A09.
- **KCC-AT04-13** — no existe algoritmo aprobado para interpretar Validation/Reassessment
  como mejora empresarial.

## 14. No implementado (deliberado)

CRV inventados, KPI como sustituto de CRV, maturity score universal, priority algorithm,
Capability Gap / Bottleneck formal, Build/Access/Hybrid/Specialist, Specialist Escalation,
ejecución PC-02, OpenAI como autoridad de Validation, modificación automática del Knowledge
Master, full event sourcing.

## 15. Bloqueos

Journey D no pudo demostrarse contra una segunda KnowledgeVersion publicada real porque el
Knowledge Master solo tiene OP-01 1.0.0 publicada; el pinning queda cubierto por tests.
