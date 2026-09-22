# M2-OP02-02 · Generic Runtime Compatibility Closure

Estado: **TECHNICALLY COMPLETE · OP-02 REVIEW_REQUIRED · NOT PUBLISHED**
Alcance: cerrar los gaps de compatibilidad del runtime genérico expuestos por OP-02.
Fuera de alcance: publicación de OP-02, OP-03, rediseño UX, cambios en OP-01.

---

## 1. Resultado

| Área | Resultado |
|---|---|
| GRE-OP02-01..04 | `CLOSED_BY_GENERIC_RUNTIME_EXTENSION` (preservados en la baseline; resolución registrada en `source.json`) |
| NE-OP02-01..06 | Preservados como `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER` (sin resolución: el silencio de la fuente no se cierra) |
| OP-01 Golden | Byte-idéntico (source, pack, published, governance-review, 4 fixtures, baseline, raw) |
| OP-02 baseline canónica + raw | Sin cambios (checksum anclado) |
| Pipeline | PASS=1 (OP-01), REVIEW_REQUIRED=1 (OP-02), FAIL=0 · señal `AUTHORITATIVE_SOURCE_REQUIRED` (2/31) |
| Tests | 643/643 (28 archivos) · typecheck limpio · `knowledge:validate` y `knowledge:seal:check` OK |
| Branching por capacidad | Ninguno en engine / schema / pipeline (test de guarda + búsqueda) |
| Base de datos / RLS | Sin cambios (no hay migraciones en este hito) |

## 2. Extensiones genéricas (schema + engine)

Todas son opcionales en el pack; un pack que no las declara (OP-01) se comporta igual que antes.

### A. Dueño y condiciones de CRV
- `owner { kind: ACTIVITY | INTERVENTION_PATTERN | DELIVERABLE, ref }`. `activityRef` sigue válido; si coexisten deben coincidir.
- Nuevos tipos de condición: `GOVERNED_STATEMENT` (texto literal del CRV) y `JUSTIFYING_CONDITION_REFERENCE`.
- `GOVERNED_JUDGMENT` exige un `GOVERNED_STATEMENT`; `DETERMINISTIC_CONDITIONS` exige una condición determinística.
- Engine: `getValidationRequirementsForOwner`, `assessValidationRequirementJudgment`. Un CRV de juicio gobernado devuelve siempre `REVIEW_REQUIRED` desde `evaluateValidationRequirement`; solo un juicio humano (persona + evidencia + condición justificante) puede satisfacerlo. KPI no sustituye evidencia.

### B. Patrones de intervención y Done
- `interventionPatterns` (instrumentos, deliverables, actividades mínimas literales, Done Criteria con o sin ID).
- `implementationModel`: capas de Done y estados de ejecución (uno solo `implemented`).
- `evaluateImplementation`: implementado solo si todas las capas están completas, las capas que exigen evidencia la tienen y se cumplen todos los Done Criteria. Criterios sin ID se direccionan por posición. Estados previos a I3 son `GOVERNED_JUDGMENT`. Un patrón sin Done Criteria explícitos devuelve `DONE_CRITERIA_NOT_EXPLICIT` y nunca se implementa de forma vacía. Done no implica CRV ni efectividad (`validationRequirementSatisfied: null`, `effectivenessStateRef: null`).

### C. Efectividad, atribución, decisión, follow-up, reassessment
- `effectivenessModel`, `attributionModel`, `validationModel`, `followUp`, `reassessment`.
- `assessValidation`: sin estado implementado no hay efectividad; el estado superior exige CRV satisfecho y evidencia; efecto negativo material fuerza el estado negativo declarado y la decisión gobernada correspondiente; atribución independiente de efectividad; follow-up y reassessment se señalan como `REVIEW_REQUIRED`, sin frecuencia ni fórmula. Nunca produce madurez ni score.

### D. Resolución de propiedades
- `PROPERTY_RESOLUTION_MODES`: `FIXED` / `CONTEXTUAL` / `NOT_EXPLICIT`.
- `severity` (niveles + guardas severidad×confianza), `contextualization`, `engineActions`.
- Candidatos: `severity` y `confidence` declaran `resolution` y `admissibleLevels`, con `state: null` cuando son contextuales. `assessFindingConsolidation` aplica las guardas declaradas (bloquea solo la afirmación causal).

### E. UNKNOWN / NOT_APPLICABLE / CONTRADICTORY (defecto genérico corregido)
Antes, cualquier observación vinculada creaba un candidato de finding, incluso UNKNOWN o NOT_APPLICABLE. Ahora solo `KNOWN` aporta soporte; el resto se reporta en `findingsAwaitingResolution`:
- UNKNOWN → `AWAITING_INFORMATION`
- todas NOT_APPLICABLE → `EXCLUDED_NOT_APPLICABLE`
- alguna CONTRADICTORY → `BLOCKED_BY_CONTRADICTION`

El harness de fixtures y `capability-fixture.schema.json` comparan este campo.

## 3. OP-02 · proyección y certificación

`source.json` proyecta desde la baseline canónica (sin editarla): 8 patrones IP01–IP08, DC-A/B/C, I0–I3, R0–R4, AC0–AC3, decisiones de validación, FOLLOWUP-OP02-01/02, reassessment, S0–S3 con guarda CONF-SEV-OP02-02, CTX-OP02-01..07, 7 acciones del engine y 9 CRV (CRV-01..08 + CRV-06A/B) con dueño `INTERVENTION_PATTERN`.

Certificación (`op02-runtime-closure.test.ts`, 29 tests): todo texto proyectado es literal del raw; todo ID proyectado existe en la baseline; fórmulas silenciadas siguen `NOT_EXPLICIT`; CRV, Done, efectividad, decisión, follow-up, reassessment, severidad/confianza y UNKNOWN/NA/CONTRA ejercitados por el engine compartido; el schema rechaza CRV y modelos mal formados. Los 10 fixtures OP-02 pasan por el mismo harness.

## 4. OP-01 · equivalencia

- **Bytes**: idénticos (hashes verificados contra el snapshot previo).
- **Runtime** (mismo pack, engine extendido):
  - Observaciones KNOWN: mismos candidatos H01/H08, severidad `NOT_EXPLICIT`.
  - Observaciones UNKNOWN / NOT_APPLICABLE / CONTRADICTORY: ya no crean candidatos; aparecen en `findingsAwaitingResolution`. Es la corrección genérica de §2.E; no se declara en los fixtures OP-01 (no tenían `findingCandidateRefs`).
  - A04 sigue siendo el único CRV, determinístico, dueño `ACTIVITY/A04`.
  - APIs de ciclo de vida responden `*_NOT_EXPLICIT` o listas vacías; no se inventa nada para OP-01.

## 5. Defectos y pendientes (no corregidos por regla de gobierno)

| ID | Descripción | Acción |
|---|---|---|
| TRX-OP02-IP05 | El raw contiene el Done Criteria de IP05 (líneas 6983–6987: "Las dependencias críticas seleccionadas tienen: origen + receptor + necesidad + momento + mecanismo + responsabilidad + respuesta ante excepción suficientemente claros y el mecanismo ha sido utilizado."), pero la baseline canónica no lo transcribió. | Defecto de transcripción demostrable. No se corrigió: cambiar la baseline sellada requiere revisión de gobierno. Mientras tanto IP05 devuelve `DONE_CRITERIA_NOT_EXPLICIT` y no puede llegar a I3. |
| PERSIST-01 | `src/lib/production/caso-uso.ts` persiste `findingCandidates` pero todavía no persiste `findingsAwaitingResolution`. | Cambio de persistencia/producto fuera del cierre de runtime; recomendado para el próximo hito productivo. |
| GOV-OP02 | Falta `governance-review.json` de OP-02. | Publicación bloqueada hasta la revisión humana. |

## 6. Archivos

- Schema: `packages/knowledge-schema/src/index.ts`
- Engine: `packages/knowledge-engine/src/index.ts`
- Pipeline: `validators.ts`, `master.ts` (resolución de gaps), `generator.ts` (secciones de ciclo de vida), `fixtures.ts`, `runtime-harness.ts`
- Datos: `knowledge/master/v1.0/capabilities/OP-02/source.json`, `knowledge/fixtures/op-02/*.fixture.json`, `knowledge/schemas/capability-fixture.schema.json`, `knowledge/manifest.json`, `knowledge/reports/OP-02.review.md`
- Tests: `op02-runtime-closure.test.ts` (nuevo), `op02.test.ts` (actualizado para GRE cerrados)

## 7. Conclusión

El runtime genérico ejecuta OP-02 completo (diagnóstico + ciclo de vida) sin lógica específica de capacidad y sin inventar conocimiento. OP-01 Golden conserva sus bytes; la única diferencia de runtime es la corrección genérica UNKNOWN/NA/CONTRA. OP-02 queda `VALIDATED` / `REVIEW_REQUIRED`, no publicado. Hito detenido.
