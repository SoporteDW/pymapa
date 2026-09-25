# M2-FINAL-15 · Single Build Fix + Final 31/31 Publication

Autoridad: `PROJECT_OWNER / KNOWLEDGE_GOVERNANCE_AUTHORITY` (ROLE_ONLY). Engine 0.2.0 sin cambios. Nada activado en la aplicación. EC-01 excluida.

## 1. Archivos modificados
- `packages/knowledge-pipeline/src/source-structure.ts` — `extractProgressiveAcquisition` (lectura literal: «Resultan N NI…», núcleo, P1/P2/P3; excluye ejemplos negativos «No preguntaremos»).
- `packages/knowledge-pipeline/src/runnable-projection.ts` — canales B/C, que solo se aplican cuando quedan VA sin vía tras los canales explícitos.
- `packages/knowledge-schema/src/index.ts`, `packages/knowledge-pipeline/src/master.ts`, `knowledge/schemas/capability-source.schema.json` — contrato.
- Tests: `runnable-projection.test.ts` (+5), `pipeline.test.ts` (+1, y 1 actualizado).
- Generados: 15 `source.json`, 15 fixtures `unknown-preserved`, 15 `governance-review.json`, 15 packs `1.0.0`, dossiers, manifest y sellos.

## 2. Cambios de schema
- `acquisitionResolution`: ACQUISITION_EXPLICIT · INFORMATION_NEED · GOVERNED_STRUCTURAL_MAPPING · **GOVERNED_STRUCTURAL_CORRESPONDENCE** · **CAPABILITY_PROGRESSIVE** · UNRESOLVED.
- `acquisitionMode`: QUESTION · INFORMATION_NEED · **GOVERNED_STRUCTURAL_CORRESPONDENCE** · **CAPABILITY_PROGRESSIVE**.
- Tipos de gap: **INFORMATION_NEED_NOT_ENUMERATED** (no bloqueante) y **ACQUISITION_SEMANTICS_MISSING** (bloqueante). La validación global no se debilitó.

## 3. Grupo B (DT-02, DT-03, DT-06)
Se crea un canal `ACQ·NI-CORRESPONDENCE·VAnn` por VA, con `informationNeedStatus = DECLARED_NOT_ENUMERATED` y la declaración literal de la fuente con su línea. No lleva pregunta, `informationNeedRef` ni ID NI. Además se agregan las preguntas P1 literales para servir el cuestionario.

## 4. Grupo C (DT-04, DT-05, CM-01..06, EC-02..05)
Cada pregunta P1 literal se proyecta como un canal `ACQ·P1·nn` en modo `CAPABILITY_PROGRESSIVE` sobre las VA pendientes. Cada canal incluye `progressiveContext` con: conteo NI declarado, DECLARED_NOT_ENUMERATED, núcleo, P2, P3 y líneas de la fuente. No se crea ningún mapeo ordinal.

| Cap | NI decl. | Corresp. | Núcleo | P1 | P2 | P3 |
|---|---|---|---|---|---|---|
| DT-02 | 17 | sí | — | 5 | 13 | 11 |
| DT-03 | 17 | sí | — | 5 | 16 | 11 |
| DT-04 | 18 | no | — | 5 | 14 | 11 |
| DT-05 | 22 | no | sí | 5 | 21 | 9 |
| DT-06 | 23 | sí | sí | 5 | 16 | 12 |
| CM-01 | 21 | no | sí | 6 | 15 | 12 |
| CM-02 | 22 | no | sí | 6 | 15 | 10 |
| CM-03 | 23 | no | sí | 6 | 17 | 12 |
| CM-04 | 21 | no | sí | 6 | 16 | 10 |
| CM-05 | 23 | no | sí | 7 | 16 | 11 |
| CM-06 | 24 | no | sí | 6 | 16 | 12 |
| EC-02 | 21 | no | sí | 7 | 16 | 11 |
| EC-03 | 23 | no | sí | 8 | 18 | 10 |
| EC-04 | 24 | no | sí | 7 | 18 | 10 |
| EC-05 | 26 | no | sí | 8 | 21 | 8 |

## 5. Gaps antes y después
- Antes: 15 × `NE-<ID>-VA-ACQUISITION`, todos bloqueantes.
- Después: 0 bloqueantes. Hay 15 × `NI-NOT-ENUMERATED-<ID>` no bloqueantes. Se preservan NE-DEFINITION y NE-CRITICALITY.

## 6–8. Packs, fixtures y Engine
- 15 packs generados y validados.
- Fixtures: 2 por capacidad (`no-observations` y `unknown-preserved`), todas PASS.
- Compatibilidad con Engine 0.2.0: PASS, sin cambios en el Engine.

## 9. Publicadas en esta ejecución
DT-02..06, CM-01..06 y EC-02..05, todas como `1.0.0`, con revisión fechada 2026-09-25.

## 10. Manifest 31/31
En todas las filas SOURCE, CANONICAL, PACK, ENGINE y GOVERNANCE están en orden (fuente registrada, K4-v1.0 aceptada, válido, PASS, APPROVED role-only).

| Capacidades | PUBLICATION |
|---|---|
| OP-01..05 (5) | PUBLISHED@1.0.0 |
| DG-01..05 (5) | PUBLISHED@1.0.0 |
| PC-01..05 (5) | PUBLISHED@1.0.0 |
| DT-01..06 (6) | PUBLISHED@1.0.0 |
| CM-01..06 (6) | PUBLISHED@1.0.0 |
| EC-02..05 (4) | PUBLISHED@1.0.0 |
| **Total 31** | 31 PUBLISHED |

## 11. Verificación
- 774/774 tests.
- Typecheck OK.
- `knowledge:validate` PASS=31, `knowledge:seal:check` y `knowledge:factory:check` sin FAIL.
- Integridad por hash: canonical-baseline, canonical-acceptance, los 16 packs ya publicados y los `source.json` de las 16 publicadas previamente siguen idénticos (incluidos OP-01 Golden, OP-02 y DT-01).
- Engine y migraciones sin cambios, así que los EvaluationRuns históricos no se tocaron.

## 12. Bloqueos restantes
Ninguno.

M2_KNOWLEDGE_31_OF_31_INDUSTRIALIZED
