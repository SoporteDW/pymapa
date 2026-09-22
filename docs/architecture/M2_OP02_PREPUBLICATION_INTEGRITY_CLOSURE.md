# M2-OP02-03 · Pre-Publication Integrity Closure

Estado: **CERRADO**. OP-02 permanece **`VALIDATED` / `REVIEW_REQUIRED`**, no publicado.
No se creó `governance-review.json`, ninguna aprobación humana ni estado `PUBLISHED`.
No se inició OP-03. No se introdujo Master Knowledge nuevo.

Secuencia de gobierno: M2-OP02-02 cerrado → **corregir IP05 + persistencia (este hito)** →
regresión completa → revisión humana de gobierno → publicar OP-02 → OP-03.

---

## 1. Corrección de transcripción IP05 Done Criteria

### 1.1 Fuente autoritativa

`knowledge/master/v1.0/capabilities/OP-02/raw/OP-02_Completo.txt`
(sha256 `db27a2976db128e87cbcfa9f2df1a40f461ff91cb0eb8b07110181b5c3b34800`, sin cambios).

| Línea raw | Texto literal |
| --- | --- |
| 6981 | `Done Criteria` (encabezado) |
| 6983 | `Las dependencias críticas seleccionadas tienen:` |
| 6984 | *(vacía)* |
| 6985 | `origen + receptor + necesidad + momento + mecanismo + responsabilidad + respuesta ante excepción` |
| 6986 | *(vacía)* |
| 6987 | `suficientemente claros y el mecanismo ha sido utilizado.` |

La fuente lo enuncia como **un único criterio compuesto** repartido en tres líneas.
Se transcribió el bloque 6983–6987 **byte a byte** (incluidas las líneas vacías
intermedias, `\n\n`) como **una sola entrada**: no se dividió, resumió,
normalizó ni se le asignó identificador (NE-OP02-06 sigue `NOT_EXPLICIT`).

### 1.2 Diff canonical (`canonical-baseline.json`)

Objeto `IP05` · anotación `PATTERN_DETAIL` (rango 6949–6987) · campo `doneCriteria`:

```diff
- "doneCriteria": []
+ "doneCriteria": [
+   "Las dependencias críticas seleccionadas tienen:\n\norigen + receptor + necesidad + momento + mecanismo + responsabilidad + respuesta ante excepción\n\nsuficientemente claros y el mecanismo ha sido utilizado."
+ ]
```

Historial de corrección añadido (`transcriptionCorrections`):

| Campo | Valor |
| --- | --- |
| id | `TC-OP02-01` |
| kind | `SOURCE_TO_CANONICAL_OMISSION` |
| detectedIn / correctedIn | `M2-OP02-02` / `M2-OP02-03` |
| objectKey · annotation · field | `IP05` · `PATTERN_DETAIL` · `doneCriteria` |
| before → after | `[]` → `[<bloque literal>]` |
| sourceLines | `[6983, 6987]` |
| rawSha256 | `db27a297…4800` |
| baselineChecksumBefore | `sha256:856633be10f2fc5d27f23ff6e0729da306431bb51585317ca1b38ae1e1ee3c59` |
| form | `SINGLE_COMPOSITE_STATEMENT` |

Checksum de la baseline: `sha256:856633be…3c59` → **`sha256:8c24e39e0d4f31ac1006fc18dad5094bf16a4755e7596dfa90b7c2c90d016a00`**.

### 1.3 Diff de la proyección ejecutable (`source.json`)

```diff
  IP05:
+   "doneCriteria": [{ "id": null, "statement": "<bloque literal 6983–6987>" }],
-   "identifierNote": "Done Criteria de este patrón no transcritos en la baseline canónica (…)"
+   "identifierNote": "Done Criteria sin identificador gobernado en la fuente (NE-OP02-06): (…) Transcripción corregida en M2-OP02-03 (TC-OP02-01)."
```

Checksums: fuente `sha256:8c7484979e…50c6` → **`sha256:7adea6a30966750ac06eded4d83491da0bc4c4b112f75ca9755d1cf616c638b4`**;
candidato `sha256:2106d4e2…f455` → **`sha256:7f8072073a12961bea852c5bee36cce1574836cb0bc59c8c27acbe6ae0ebc6cc`**.
`knowledge/manifest.json` y `knowledge/reports/OP-02.review.md` regenerados por el pipeline (`--write`).

### 1.4 Prueba de "única diferencia"

Tests verifican que **revertir** la corrección (restaurar `before`, quitar
`transcriptionCorrections`) reproduce **exactamente** el checksum de la baseline
previa `856633be…`, y que revertir la proyección reproduce exactamente el
`source.json` previo `8c748497…`. No cambió ningún otro objeto, conteo, gap,
supersesión ni la transcripción raw. 329 objetos, 54 tipos, 12/12 conteos de control, 10 gaps.

### 1.5 Validación genérica de correcciones

`validateCanonicalBaseline` (sin branching por capability) ahora exige, para
cada `transcriptionCorrections[]`: id único; `rawSha256` = raw vigente;
`before ≠ after`; toda hoja de `after` literal en `sourceLines`; rango contenido
en el del objeto/anotación; y que la baseline refleje **exactamente** `after`.
Nuevo código de issue `TRANSCRIPTION_CORRECTION`. Tests negativos: valor no
literal (`NOT_VERBATIM`), corrección registrada no aplicada, raw distinto,
rango fuera del objeto. Schema JSON documentado
(`knowledge/schemas/capability-canonical-baseline.schema.json`, +15 líneas, campo opcional).

### 1.6 Cadena IP05 → CRV (verificada en el engine genérico)

| Paso | Resultado |
| --- | --- |
| Actividades mínimas | 7, literales |
| Deliverable | `DEL-OP02-05` · "Mecanismo de coordinación para dependencias críticas." (`INS-OP02-05`) |
| Done Criteria | 1 criterio, `position: 1`, `id: null`, texto literal |
| Implementación | I3 solo con DC-A + DC-B + DC-C (con evidencia de adopción) + criterio 1 cumplido; sin criterio → `unmetDoneCriteriaPositions: [1]`; sin evidencia DC-C → no implementado; posición 2 → issue |
| CRV | `CRV-05`, dueño `INTERVENTION_PATTERN/IP05`, `GOVERNED_JUDGMENT` |
| Done ⇒ CRV? | **No**: `validationRequirementSatisfied: null`; evaluación automática → `REVIEW_REQUIRED`, `satisfied: false` |
| Done ⇒ efectividad? | **No**: `effectivenessStateRef: null`; R4 con I3 pero sin CRV satisfecho → no admisible |

El test previo "un patrón sin Done Criteria nunca alcanza I3 de forma vacía"
se conserva como guarda genérica sobre un pack derivado cuyo IP05 no declara criterios.

---

## 2. Persistencia de `findingsAwaitingResolution`

### 2.1 Engine (aditivo, capability-neutral)

`FindingAwaitingResolutionResult` añade: `unresolvedStates`
(`UNKNOWN`/`NOT_APPLICABLE`/`CONTRADICTORY` presentes), `evidenceIds`, y
`resolution: { requirement, acquisitionRefs }`:

| status | requirement | acquisitionRefs |
| --- | --- | --- |
| `AWAITING_INFORMATION` | `INFORMATION_REQUIRED` | adquisiciones del pack que capturan las variables UNKNOWN |
| `BLOCKED_BY_CONTRADICTION` | `CLARIFICATION_REQUIRED` | `clarificationAcquisitionRefs` de las contradicciones de sus variables |
| `EXCLUDED_NOT_APPLICABLE` | `NONE_EXCLUDED_BY_APPLICABILITY` | `[]` |

Solo referencias declaradas por el pack; no se infiere ninguna ruta. Sin
branching por capability. Las salidas existentes no cambian (campos nuevos).

### 2.2 Migraciones

Se evaluó reutilizar estructuras genéricas: `findings` violaría "nunca como
Finding"; `information_need_states` y `variable_evaluations` tienen otra
semántica (clave `need_ref`/`variable_ref`) y se perdería el significado. Se creó
la estructura mínima propia:

- `20260922204859_…sql` — tabla `public.finding_resolution_states`
  (organización, assessment, **evaluation_run_id**, knowledge_version_id,
  capability_id, finding_ref, status, unresolved_states, variable_states,
  observation_ids, evidence_ids, resolution_requirement,
  resolution_acquisition_refs, reason, detail con trazabilidad).
  - `unique (evaluation_run_id, finding_ref)`; CHECK de status, de
    coherencia status↔requirement y de estados no resueltos; **sin**
    lifecycle, severidad, polaridad ni revisión.
  - RLS activado; única política: lectura para miembros
    (`private.is_organization_member`). Escritura solo `service_role`.
  - Trigger `BEFORE UPDATE` → `FINDING_RESOLUTION_STATE_IMMUTABLE` (histórico append-only).
- `20260922205612_…sql` — `REVOKE` explícito: `anon` sin privilegios;
  `authenticated` solo `SELECT` (ver §5.3).

Verificado en la base real (bloque transaccional revertido, 0 filas
residuales): UPDATE rechazado por inmutabilidad, status/requirement incoherente
rechazado por CHECK, duplicado por run rechazado por UNIQUE. Privilegios
efectivos: anon ninguno; authenticated `SELECT`; service_role total.

### 2.3 Aplicación

- `ProductionRepository`: `insertFindingResolutionStates` (append-only, rechaza duplicado por run) y `listFindingResolutionStates`; implementación en memoria (filas congeladas) y en base de datos.
- `ejecutarEvaluacion` persiste la proyección en **cada** EvaluationRun, antes de cerrarlo, con `detail.notAFinding = true` y la trazabilidad completa (pack, versión, engine, KnowledgeVersion, observaciones).
- `ProductionAssessmentState.findingsAwaitingResolution` (estado de caso vivo).
- `listFindingsAwaitingResolution(deps, assessmentId, { evaluationRunId? })`: recarga del último run o de un run histórico, sin re-evaluar.
- `getOp01Findings` expone la proyección persistida en una clave separada de `findings`. Sin cambios de UX.

---

## 3. Tests añadidos (30)

`packages/knowledge-pipeline/src/op02-prepublication.test.ts` (13): fuente
6983–6987; baseline literal; registro de corrección; única diferencia
(baseline y source); validación sin issues con conteos/gaps/NE; 4 negativos
del validador; cadena IP05 → CRV (3).

`src/lib/production/resolucion-pendiente.test.ts` (17), ejecutados con **OP-01 y
OP-02 por el mismo caso de uso**: UNKNOWN / NOT_APPLICABLE / CONTRADICTORY
persistidos con motivo, observaciones, lineage y requisito; evidencias
vinculadas; nunca en `findings`; **resolución UNKNOWN→KNOWN en un run
posterior** (sale de pendientes, aparece como candidato no confirmado del run
nuevo); **run histórico intacto y recargable por id**; **reproducibilidad**
(re-evaluar las observaciones del run 1 reproduce lo persistido); append-only;
coherencia con el estado de caso; run inexistente; SQL/RLS/REVOKE/inmutabilidad.

Ajustes a tests existentes (sin debilitar): guarda de IP05 vacío movida a pack
derivado; inventario de tablas y de módulos autorizados actualizado.

---

## 4. Resultados de regresión e integridad

| Verificación | Resultado |
| --- | --- |
| source→canonical (literal por rangos, identidad raw, correcciones) | OK, 0 issues |
| canonical→pack (proyección literal, ids, gaps) | OK |
| `knowledge:validate` | OK |
| `knowledge:seal:check` | OK |
| Pipeline | PASS=1 (OP-01) · REVIEW_REQUIRED=1 (OP-02) · FAIL=0 · 2/31 con fuente · `AUTHORITATIVE_SOURCE_REQUIRED` |
| OP-01 Golden byte-equivalencia | 9/9 archivos idénticos (pack, published, README, source, governance-review, 4 fixtures) |
| OP-01 runtime regression | OK (fixtures, H01/H08, A04 único CRV determinístico) |
| OP-02 runtime certification | OK (29 + 3 nuevos) · 10 fixtures sin FAIL ni findings confirmados |
| IP05 Done→CRV | OK |
| Persistencia/recarga, resolución posterior, reproducibilidad | OK |
| Suite completa | **673/673** (30 archivos) |
| Typecheck | limpio |
| Linter de base de datos | sin issues |
| Security scan | sin issues |
| Branching por capability en engine/schema/pipeline | ninguno |

---

## 5. Estado de gaps y observaciones

### 5.1 Gaps

- GRE-OP02-01..04: `CLOSED_BY_GENERIC_RUNTIME_EXTENSION` (sin cambios).
- NE-OP02-01..06: `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER` (preservados; test explícito).
- Backlog A-OP02-01..03: idéntico byte a byte.

### 5.2 Observación de reproducibilidad (para la revisión de gobierno)

`ENGINE_VERSION` sigue siendo `pymapa-knowledge-engine/0.1.0`, aunque M2-OP02-02
cambió la semántica de candidatos (UNKNOWN/NA/CONTRADICTORY ya no los crean) y
este hito añade campos. La base tiene 5 EvaluationRuns históricos, todos con
esa misma versión y previos a la tabla nueva: no tienen filas de
`finding_resolution_states` y **no se rellenaron** (hacerlo re-evaluaría el
histórico con un engine distinto bajo la misma versión). Decisión sugerida
antes de publicar: versionar el engine (p. ej. `0.2.0`). No se cambió aquí
para no alterar la trazabilidad de OP-01 sin aprobación.

### 5.3 Observación de seguridad (preexistente, fuera de alcance)

Los privilegios por defecto del esquema `public` conceden a `anon` y
`authenticated` todos los privilegios de tabla en **todas** las tablas
existentes (los `GRANT SELECT` de las migraciones no los restringen). RLS
bloquea las operaciones por la API, pero la defensa en profundidad depende solo
de RLS. Se corrigió únicamente en la tabla nueva. Recomendado: un hito de
endurecimiento con `REVOKE` por tabla.

---

## 6. Blockers restantes antes de publicar OP-02

1. **Revisión humana de gobierno** y creación de `governance-review.json` (no creada por regla).
2. Decisión sobre versionado del engine (§5.2) — recomendado, no técnico-bloqueante.
3. Tras publicar: registrar el pack OP-02 en `PACKS_REGISTRADOS` para activarlo en producción; el flujo productivo de CRV propiedad de patrón (OP-02) todavía no se ejerce en la app (hoy solo OP-01 está activo).

No quedan defectos de integridad conocidos entre la fuente, la baseline canónica, la proyección y el runtime.
