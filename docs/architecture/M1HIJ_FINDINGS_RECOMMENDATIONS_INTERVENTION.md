# M1-HIJ · Findings + Recommendations + Intervention / Execution Setup

Ejecución agrupada de M1-H, M1-I y M1-J sobre M1-EFG (aprobado y congelado).
No avanza a CRV, Validation ni Reassessment.

## 1. Archivos creados / modificados

Creados:
- `src/lib/production/findings-intervencion.test.ts` (18 tests)
- `docs/architecture/M1HIJ_FINDINGS_RECOMMENDATIONS_INTERVENTION.md`
- Migración productiva M1-HIJ en `supabase/migrations/`

Modificados:
- `knowledge/packs/op-01/1.0.0/pack.json` (findings H01–H08 con polarity/ruleRefs/variableRefs/severity/mappingStatus; recommendations R01–R09; activities A01–A09; interventionPrinciple; KCC-AT04-09..11)
- `packages/knowledge-schema/src/index.ts` (validación de findings/recommendations/activities/interventionPrinciple; rechazo de severidad numérica; integridad referencial de ruleRefs/variableRefs/findingRefs)
- `packages/knowledge-engine/src/index.ts` (`FindingCandidateResult`, `DerivedDependencyReferenceResult`, `RecommendationCandidateResult`; `evaluate()` produce `findingCandidates` y `derivedDependencyReferences`; `getRecommendationCandidates`, `getInterventionPrinciple`, `listActivityIdentities`)
- `src/lib/production/puertos.ts` (FindingRecord y enlaces, DerivedDependencyReferenceRecord, RecommendationCandidateRecord, InterventionRecord, ActivityRecord, DeliverableRecord, AuditEventRecord; 25 métodos nuevos de repositorio; repositorio en memoria)
- `src/lib/production/runtime.server.ts` (persistencia Supabase de las nuevas tablas)
- `src/lib/production/caso-uso.ts` (materialización de findings con lineage y superseding, revisión humana, candidatos de recomendación, interventions, activities, deliverables, auditoría)
- `src/lib/production/op01.functions.ts` (server functions autenticadas: getOp01Findings, reviewOp01Finding, createOp01RecommendationCandidate, decideOp01Recommendation, createOp01Intervention, createOp01Activity, changeOp01ActivityState, registerOp01Deliverable)
- `src/services/production/production-client.ts` (contratos de cliente; el frontend no importa el Knowledge Engine)
- `src/routes/_authenticated/capacidad.op-01.tsx` (hallazgos, referencias cruzadas, propuestas, planes de trabajo)
- `src/lib/datos-productivos/esquema.test.ts` (24 tablas + 6 tests M1-HIJ)
- `src/lib/production/arquitectura.test.ts`, `src/lib/production/vertical-op01.test.ts` (KCC-AT04-09..11)

## 2. Tablas y policies

Enums: `finding_polarity`, `finding_lifecycle_state`, `recommendation_selection_status`,
`intervention_status`, `execution_state` (PENDING | EXECUTING | DELIVERABLE_PRODUCED),
`audit_event_type`.

Tablas (todas con `organization_id`, timestamps, RLS y `GRANT` explícito):
- `findings` — lineage obligatorio: assessment, case, capability, knowledge_version, knowledge_pack_id/version, engine_version, evaluation_run, rule_refs, variable_refs; `severity_qualitative` nullable + `severity_reason`; `superseded_by_finding_id`.
- `finding_observations`, `finding_evidence` — lineage a Observation y Evidence (UNIQUE por par).
- `derived_dependency_references` — `executable boolean not null default false` con `CHECK (executable = false)`.
- `recommendation_candidates` — `content_status`, `mapping_status`, `status`, decisión humana (`decided_by`, `decided_at`, `decision_note`).
- `interventions` — `status`, `selection_note`, `accepted_by/at`, referencias opcionales a candidato y finding.
- `activities` — pertenecen a una `intervention`; `state execution_state`.
- `deliverables` — pertenecen a una `activity`; `evidence_id` opcional.
- `audit_events` — evento, tabla y id del sujeto, actor, detalle.

Policies: lectura para miembros de la organización (`private.is_organization_member`).
Los outputs del engine (`findings`, enlaces, `derived_dependency_references`, `audit_events`) no
tienen INSERT/UPDATE para `authenticated`: se escriben server-side. Las decisiones humanas
(recomendaciones, interventions, activities, deliverables) permiten INSERT/UPDATE solo a miembros.
Ninguna tabla permite DELETE. Linter Supabase: sin hallazgos.

## 3. Findings implementados

Identidades aprobadas H01–H08 con polaridad y mapeo a reglas/variables aprobadas:
H01→R-OP01-01 (VA01–VA03); H02→R-OP01-03 (VA04); H03→R-OP01-04 (VA06);
H04→R-OP01-02+R-OP01-05 (VA07); H05→R-OP01-06 (VA08/VA09); H06→R-OP01-05 (VA07/VA08);
H07→R-OP01-07+R-OP01-11 (VA08/VA10); H08→R-OP01-12 (VA01/VA06/VA09, STRENGTH).

Candidatos vs. confirmables con el conocimiento actual: **ninguno es confirmable
automáticamente**. Las 13 reglas del pack son `GOVERNED_JUDGMENT` con `implemented: false`, así
que todo finding nace como candidato en `NEEDS_REVIEW`. La confirmación es siempre una decisión
humana registrada (`reviewed_by`, `reviewed_at`, auditoría). H08 no se confirma por ningún
threshold: se emite con la razón "no existe gate formal de evidencia positiva (KCC-AT04-03)".

Severidad y prioridad: `severity_qualitative` queda sin resolver con
`NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`. No hay algoritmo de severidad, no hay algoritmo de prioridad
y el schema rechaza severidades numéricas. No se reutiliza el scoring del MVP.

## 4. Lifecycle de Finding

`CANDIDATE` (solo si todas sus reglas fueran DETERMINISTIC e implementadas) → `NEEDS_REVIEW` →
`CONFIRMED` | `DISMISSED`, y `SUPERSEDED` cuando una reevaluación posterior produce el mismo
`finding_ref` en el mismo assessment. El finding anterior se conserva con
`superseded_by_finding_id`: el histórico no se pierde y la auditoría registra `FINDING_SUPERSEDED`.

## 5. Cross-capability references

`derived_dependency_references` declara competency-related cause → PC-02, technology-related cause
→ dominio DT (sin capacidad inferida), execution consistency → OP-02, end-to-end process → OP-03,
simplification/automation → OP-04. Son declarativas: `executable = false` por constraint y no hay
ningún camino de código que active la capacidad destino. PC-02 sigue sin Knowledge Pack ejecutable.

## 6. RecommendationCandidate

R01–R09 se registran solo como identidades gobernadas: `title = null`,
`content_status = NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`, `mapping_status = NOT_GOVERNED`. Un candidato
requiere un finding revisado (confirmado o revisado explícitamente); nunca se genera automáticamente.
Finding ≠ RecommendationCandidate como entidades separadas.

## 7. Intervention

Entidad propia. Requiere un candidato `SELECTED` o una nota de selección explícita; nace en
`PROPOSED`. Conserva referencia al candidato y/o finding. El principio
`MINIMUM_SUFFICIENT_INTERVENTION` se registra como principio con `formula: NOT_EXPLICIT`: cuando
varias intervenciones son plausibles, la selección queda en revisión humana.

## 8. Activities y Deliverables

A01–A09 son identidades gobernadas sin texto ni mapeo aprobado; los mapeos Finding→Activity son
candidatos, nunca automatismos. Toda Activity pertenece a una Intervention. Los Deliverables
pertenecen a una Activity y pueden vincularse a Evidence. Registrar un Deliverable mueve la
Activity a `DELIVERABLE_PRODUCED` y audita `validated: false` de forma explícita: no existe estado
`VALIDATED` en el modelo (pertenece a M1-KL). CRV no está implementado.

## 9. Auditabilidad

`audit_events` registra FINDING_CREATED, FINDING_REVIEWED, FINDING_CONFIRMED, FINDING_DISMISSED,
FINDING_SUPERSEDED, RECOMMENDATION_SELECTED, RECOMMENDATION_REJECTED, INTERVENTION_CREATED,
ACTIVITY_STATE_CHANGED, DELIVERABLE_REGISTERED. No es event sourcing: es un registro de acciones.

## 10. Journeys verificados en la aplicación real

- **A · Governed Finding**: respuesta registrada → nueva evaluación → H01 y H08 creados en
  `NEEDS_REVIEW`, severidad sin definir, sin confirmación automática; la reevaluación posterior
  dejó los anteriores en `SUPERSEDED`.
- **B · Recommendation separation**: H01 confirmado → RecommendationCandidate R01 (`CANDIDATE`) →
  selección humana (`SELECTED`) → Intervention `PROPOSED`: tres objetos distintos en tablas
  distintas.
- **C · Execution preparation**: Intervention → Activity → Deliverable; la Activity quedó en
  `DELIVERABLE_PRODUCED` y ninguna validación se marcó.
- **D · Cross-capability**: 5 referencias derivadas visibles en pantalla, ninguna ejecuta la
  capacidad destino.

Auditoría observada: FINDING_CREATED ×4, FINDING_SUPERSEDED ×2, FINDING_CONFIRMED,
RECOMMENDATION_SELECTED, INTERVENTION_CREATED, ACTIVITY_STATE_CHANGED, DELIVERABLE_REGISTERED.

## 11. Tests

Nuevos: 18 en `findings-intervencion.test.ts` + 6 en `esquema.test.ts` = **24 nuevos**.
Total: **334 tests verdes** en 22 archivos (310 previos intactos).
Cubren: juicio gobernado no confirma automáticamente; lineage completo; superseding con histórico;
H08 sin threshold inventado; sin severity numérica ni priority; RecommendationCandidate ≠ Finding ≠
Intervention; Intervention exige selección; Activity pertenece a Intervention; Deliverable ≠
Activity; Deliverable ≠ Validation; referencia cross-capability no ejecuta destino; PC-02 sin pack;
frontend no importa el Knowledge Engine; aislamiento por organización; otras capacidades en
MVP_ENGINE.

`bunx tsgo --noEmit`: limpio. `bunx vitest run`: 334/334.

## 12. NOT EXPLICIT IN KNOWLEDGE MASTER

- Algoritmo de severidad y de prioridad (no existe; severidad cualitativa sin resolver).
- Texto y contenido de R01–R09 y de A01–A09.
- Mapeo gobernado Finding → Recommendation → Activity.
- Fórmula de Minimum Sufficient Intervention.
- Criterio formal de evidencia positiva para confirmar H08.

## 13. KCC

Preservados: KCC-AT04-01..08 (ninguno resuelto).
Nuevos: KCC-AT04-09 (el mapeo Finding→reglas/variables deriva del enunciado de las reglas
aprobadas), KCC-AT04-10 (no existe texto aprobado para R01–R09 ni A01–A09), KCC-AT04-11 (no existe
mapeo gobernado Finding→Recommendation→Activity).

## 14. Bloqueos

- Los findings solo pueden quedar como candidatos hasta que exista definición explícita de
  severidad y de criterios de confirmación.
- Sin texto aprobado de recomendaciones y actividades, la UI solo puede mostrar identidades.
- Journey B/C dependen de decisiones humanas: no hay ninguna vía automática, por diseño.

M1-HIJ cerrado. No se avanza a CRV, Validation ni Reassessment.
