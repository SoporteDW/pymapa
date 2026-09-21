# M1-EFG · Adaptive + Collaborative + Evidence Diagnosis

Cierra M1-E, M1-F y M1-G sobre el núcleo productivo (PRODUCTION_ENGINE) sin tocar
`src/lib/motor`, las 12 capacidades restantes (MVP_ENGINE) ni el localStorage del MVP.
No se implementan Findings, Recommendations ni Intervention.

## 0 · Corrección de seguridad

- Eliminada la política genérica `organizations_insert_authenticated` (alta de
  organizaciones para cualquier autenticado).
- Sustituida por `organizations_insert_bootstrap`: solo puede crear una organización
  quien todavía no pertenece a ninguna.
- Añadida `memberships_insert_bootstrap_owner`: autoalta como `OWNER` solo en una
  organización sin miembros.
- `public.bootstrap_organization` pasa de `SECURITY DEFINER` a `SECURITY INVOKER`:
  el alta queda gobernada por RLS, no por privilegios elevados.
- `knowledge_versions`: se mantiene solo lectura autenticada de metadata no sensible
  (identifier, version, status, checksum, published_at). Sin escritura desde el cliente.
- Linter de base de datos: **0 hallazgos**.

## 1 · Knowledge Pack OP-01 1.0.0 (AT-04 Knowledge Source Package)

- Adquisiciones: `OP01-P01` + `OP01-P05` … `OP01-P15` (12).
- `OP01-P02`, `OP01-P03`, `OP01-P04` **no** existen: sin contenido explícito aprobado.
- Triggers declarativos con `classification`:
  - `DETERMINISTIC`: P05 (VA01 KNOWN + "Implícita"), P06 (VA02 no observada/UNKNOWN),
    P07 (VA03 no observada), P15 (cualquier variable en CONTRADICTORY).
  - `NOT_DETERMINISTIC`: P08–P14 (`questionSource: DERIVED_FROM_APPROVED_PURPOSE`).
    El motor **nunca** los sirve automáticamente.
- Candidatos de evidencia `OP01-EV01` … `OP01-EV09`, con `variableRefs` /
  `informationNeedRefs`: una evidencia puede soportar varias necesidades.
- `contradictionHandling`: aclaración vía `OP01-P15` + candidatos EV05/EV07/EV09.

## 2 · Adquisición adaptativa

- El runtime genérico (`packages/knowledge-engine`) evalúa triggers del pack contra
  observaciones, estados de variables y necesidades de información.
- No hay ningún `if capability === "OP-01"` en el motor ni branching de OP-01 en React.
- `getEligibleAcquisitions()` / `getNextAcquisition()` / `getClarificationCandidates()`.

## 3 · UNKNOWN ≠ NO

- `UNKNOWN` se preserva como estado de observación; la necesidad queda `PARTIAL`.
- No genera gap, conclusión adversa ni scoring; habilita delegación y evidencia.

## 4–6 · Colaborativo y delegación

- `respondents`, `assignments`, `invitations`. User ≠ Membership ≠ Respondent:
  `respondents.user_id` es nullable y no hay `membership_id`.
- Assignment scope-based: `DOMAIN` | `CAPABILITY` | `INFORMATION_NEED` | `SECTION`.
- RLS scope-based con helpers `private.is_assessment_respondent`,
  `private.is_case_respondent`, `private.is_own_respondent`: el invitado ve su Case,
  Assessment y alcance; nada más de la organización.
- Delegación: la asignación de origen pasa a `DELEGATED`, la nueva nace `PENDING`,
  con `delegated_from_assignment_id` y motivo.
- Invitaciones: solo se persiste `token_hash` (SHA-256); no existe columna de token en claro.

## 7 · Contradicción entre fuentes

- No se promedia, no se elige por jerarquía, no interviene ningún LLM.
- Dos observaciones KNOWN con valores distintos sobre la misma variable producen
  `CONTRADICTORY` con referencias a las observaciones en conflicto.
- Caso de referencia: líder "Todos realizan el proceso de la misma forma." vs. ejecutor
  "Cada persona decide cómo hacerlo." → VA06 `CONTRADICTORY` → P15 como aclaración.

## 8 · Evidence Store

- `evidence` (organization, case, assessment, type, source, `storage_bucket`,
  `storage_path`, `external_reference`, submitter, respondent, timestamps) y
  `observation_evidence` (N:M, único por par).
- Archivos en el almacén privado `evidence`, carpeta por organización, con políticas
  RLS en `storage.objects` limitadas a miembros de esa organización. Sin binarios en Postgres.

## 9 · E0–E3

- Estados de requisito (`EVIDENCE_REQUIREMENT_REVIEW_REQUIRED`), nunca scores.
- VA05/VA08 son condicionales sin fórmula aprobada → el run cierra en `NEEDS_REVIEW`
  conservando provenance. No se inventa ninguna fórmula de riesgo.

## 10–11 · Lineage

`Response → Observation → Evaluation` separados; `Evidence` es entidad propia.
Cada Observation conserva `source_response_id`, `respondent_id` y sus enlaces a Evidence.

## 12 · UI

Se amplía la pantalla existente `/capacidad/op-01`: respuesta abierta o semántica,
pendiente sin penalización, invitar/delegar con alcance, estado de cada persona,
adjuntar archivo o referencia y vincularla a respuestas, y aclaraciones por contradicción.
No hay app paralela ni conocimiento diagnóstico en el frontend.

## 13 · Fuera de alcance (no implementado)

Findings H01–H08, severity, priority, Recommendations, Interventions, Activities, CRV,
Validation, Reassessment, PC-02, Build/Access/Hybrid/Specialist, Capability Gap/Bottleneck,
fórmulas numéricas de confidence/sufficiency, OpenAI como juez, auto-learning.

## 14 · Tests

`bunx tsgo --noEmit` limpio. `bunx vitest run`: **310 tests verdes** (283 previos + 27).
Nuevos: `src/lib/production/colaborativo-evidencia.test.ts` (20), ampliaciones en
`vertical-op01.test.ts` y `datos-productivos/esquema.test.ts`.

## 15 · Journeys verificados en la app real

- **A · Delegación**: respuesta UNKNOWN → necesidad abierta → invitación con alcance
  `SECTION` (OP01-P06) a `owner.proceso@digiwaycorp.com`, asignación `PENDING`.
- **B · Contradicción**: verificado en pruebas con el caso de referencia (VA06
  `CONTRADICTORY`, P15 como candidato de aclaración).
- **C · Evidencia**: archivo subido al almacén privado, `evidence` + vínculo a la
  Observation de VA01, nuevo `evaluation_run` (`EVIDENCE_ADDED`) conservando lineage.

Persistencia observada tras los journeys: respondents 2, assignments 2, invitations 1,
evidence 1, observation_evidence 1, evaluation_runs 2, archivos en almacén 1.

## NOT EXPLICIT IN KNOWLEDGE MASTER

- Necesidades NI02–NI06 y su mapeo a variables.
- Umbral/condición exacta que hace suficiente una necesidad de información.
- Fórmula de evidencia condicional E1/E2 según riesgo.

## KNOWLEDGE CHANGE CANDIDATE

- `KCC-AT04-05`: redacción derivada de propósitos aprobados para P08–P14.
- `KCC-AT04-06`: mappings adquisición→variable no explícitos en el Master.
- `KCC-AT04-07`: clasificación de triggers no determinísticos.
- `KCC-AT04-08`: catálogo de evidencias EV01–EV09.

## Bloqueos

- P02–P04 no implementables sin contenido aprobado.
- La condición de suficiencia y la fórmula de evidencia condicional requieren decisión
  de conocimiento; hoy quedan en `NEEDS_REVIEW`.
- El acceso del respondent invitado se valida por RLS y pruebas; el flujo de canje del
  token por correo no forma parte de M1-EFG.
