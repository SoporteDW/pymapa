# KNOW-EXEC-03 · Cierre del ciclo técnico (Bloques A–D) y expediente documental (E)

Autorización: Gate 02 · KNOW-EXEC-03-AUT. Publicación y ejecución diagnóstica NO autorizadas.

## 1. Archivos
Creados:
- `packages/knowledge-schema/src/staging.ts` — contrato aditivo `PYMAPA-DIAGNOSTIC-TRANSLATION-CANDIDATE 0.1.0`.
- `packages/knowledge-pipeline/src/diagnostic-translation.ts` — traductor reutilizable K4 → staging.
- `packages/knowledge-pipeline/src/diagnostic-translation.test.ts` — 11 pruebas.
- `scripts/knowledge-staging.ts` — CLI `--write` / `--check`.
- `knowledge/staging/_inputs/KNOW-EXEC-03-S.lote1.json` — matriz Fase 2 (S1–S4) convertida literal, con sha256 del xlsx.
- `knowledge/staging/OP-03|OP-04|OP-05/candidate.json`.

Modificados (solo una línea de re-export cada uno): `packages/knowledge-schema/src/index.ts`, `packages/knowledge-pipeline/src/index.ts`.

## 2. Componentes reutilizables
- `stagingCandidateSchema`: literales obligatorios `executable:false`, `bindingApproved:false`, `emissionApproved:false`, `predicate:null`, `publicationAuthorized:false`, `counts.executable/emitted = 0`.
- `translateCapability()`: sin branching por capacidad; texto siempre desde el baseline; divergencias, reglas ausentes y excepciones se registran y se continúa.

## 3–4. Resultados por capacidad
| Capacidad | Reglas | Diagnósticas | Guardrails | Con ref. HF documental | Compuestas | Excepciones | Ejecutables |
|---|---|---|---|---|---|---|---|
| OP-03 | 11 | 8 | 3 | 8 | 0 | 18 | 0 |
| OP-04 | 21 | 13 | 8 | 13 | 10 | 28 | 0 |
| OP-05 | 12 | 11 | 1 | 11 | 5 | 19 | 0 |
| Total | 44 | 32 | 12 | 32 | 15 | 65 | 0 |

Divergencias de texto matriz vs baseline: 0. Reglas de la matriz ausentes del baseline: 0.

## 5. Pruebas
- Nuevas: 11/11 PASS (conteos, independencia, texto/procedencia, guardrails, no ejecución, rechazo de schema, excepción por ausencia, relación compuesta, aislamiento, packs intactos, determinismo).
- Suite completa: 1160/1161. El único fallo es preexistente y ajeno: `arquitectura.test.ts` detecta imports de `@pymapa/knowledge-*` en `src/lib/piloto-dg01/` (DG01-VERTICAL-01/02). No se tocó.
- `knowledge:validate`, `knowledge:factory:check`, `knowledge:seal:check`: PASS. OP-01/OP-02 sin regresión.

## 6. Conservación
sha256 de 95 artefactos protegidos (31 `pack.json`, 31 `published.json`, baselines canónicas, `knowledge/manifest.json`, `packs-registry.ts`, Engine `index.ts`) idéntico antes y después.

## 7. Aislamiento de staging
Ningún archivo de `src/` ni del Engine referencia `knowledge/staging` (prueba automática). `packs-registry.ts` no cambió.

## 8. Excepciones pendientes
| ID | Alcance | Asunto | Autoridad |
|---|---|---|---|
| EX-01 | 3 cap. | Guardrails no son brecha | Conocimiento |
| EX-02 | 3 cap. | Predicado y suficiencia no formalizados | Conocimiento |
| EX-03 | Reglas sin vínculo | Vínculo R–HF no identificado | Conocimiento / Gobierno |
| EX-04 | OP-04 | HF04–HF07 compuestas; HF08 requiere evidencia afirmativa | Conocimiento |
| EX-05 | OP-05 | HF01/HF05 agrupan reglas; entrega ≠ adopción | Conocimiento |
| EX-06 | OP-03 | Atribución causal; R00, R03A, R06A guardrails | Conocimiento |
| EX-07 | 3 cap. | Pregunta↔regla no verificada | Conocimiento + Arquitectura |
| EX-08 | 3 cap. | Pack/Engine sin reglas ni findings publicados | Arquitectura / Gate 02 / Gobierno |
| EX-09 | 3 cap. | IA no autorizada (SEM-QA-01) | Gobierno |
Más 44 excepciones particulares (una por regla) dentro de cada `candidate.json`.

## 9. Bloqueos para publicación futura
B01 publicación (contratos de decisión no aprobados) · B02 emisión (sin binding) · B03 rol de guardrails · B04 conciliación de adquisiciones · B05 IA · B06 adaptador de interfaz/Engine. Además: un pack v1.0.x nuevo requeriría versión nueva, nuevo `published.json`, actualización del registro y del manifiesto runtime — fuera de este mandato.

## 10. Recomendación para el siguiente lote
Reutilizar `translateCapability` + `knowledge-staging.ts` cambiando solo la lista de capacidades y la matriz de entrada; exigir que Fase 2 entregue la misma estructura S1–S4. Priorizar antes la resolución de EX-02 y EX-07 en el Lote 1, porque bloquean cualquier predicado.
