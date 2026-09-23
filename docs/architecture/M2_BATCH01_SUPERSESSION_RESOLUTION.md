# M2-BATCH-01R · Governed Supersession Resolution + Canonical Acceptance

Punto de partida: M2-BATCH-01 `FACTORY_TRACTION_PARTIAL` (OP-03/04/05 `REVIEW_REQUIRED`, 0 FAIL).
Engine `pymapa-knowledge-engine/0.2.0` sin cambios. No se publicó OP-03/04/05 y no se inició
DG/PC/DT/CM/EC. OP-01 y el pack publicado `op-02@1.0.0` no se tocaron.

## 1 · Qué se construyó

| Pieza                                                  | Rol                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supersession-resolver.ts` (`pymapa-governed-supersession-resolver@0.1.0`) | Resolver genérico, sin identificadores de capacidad (lo verifica un test). Resuelve un ID repetido **solo** con evidencia literal explícita de la fuente.                                                                                                   |
| `structural-extractor.ts` `0.2.0`                      | Modo `GOVERNED` (por defecto) aplica el resolver y las decisiones de gobierno. Modo `NONE` reproduce la línea base `0.1.0` byte a byte (25 / 33 / 14).                                                                                           |
| `governance-decisions.ts` + `knowledge/intake/OP-0{3,4,5}/governance-decisions.json` | Decisiones humanas selladas (cierre, conteos aprobados, backlog). El extractor verifica cada una **literalmente** contra la fuente; una decisión no literal genera error de gobierno y un archivo alterado sin resellar se rechaza por checksum. |
| `cross-capability.ts` + `knowledge/factory/cross-capability-registry.json` | Registro gobernado entre capacidades (A-OP02-02, BOUND-OP05-02). Verifica evidencia literal por SHA-256 de la fuente, inmutabilidad del pack publicado citado y el estado efectivo de cada condición. Nunca cierra entradas por sí mismo.                |
| `previewCanonicalProjection` (candidate.ts)            | Proyección candidato → baseline **sin** aceptación, solo para comprobar la integridad source→canonical. No se escribe ni habilita la promoción.                                                                                                   |
| Factory                                                | Nuevo motivo genérico `PROVENANCE_VOCABULARY_REQUIRED`; `knowledge:factory` valida y muestra el registro cross-capability (FAIL bloquea CI).                                                                                                       |
| Schemas                                                | `knowledge/schemas/governance-decisions.schema.json`, `cross-capability-registry.schema.json`.                                                                                                                                                   |

## 2 · Reglas del resolver (todas literales)

| Regla                    | Evidencia aceptada                                                                                                                                                                                                                                                                  | Resultado                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| R1 `EXPLICIT_ELIMINATION`   | `Se elimina como` / `SE ELIMINA(N)` / `ELIMINADO/A(S)` / `ELIMINATED` en la sección propia del ID (sin subsecciones de otros IDs, sin otro ID de la familia en la línea). Minúscula suelta (“qué se elimina”) **no** cuenta.                                                   | `ELIMINATED`                                                                 |
| R2 `EXPLICIT_REFORMULATION` | heading anidado de la misma familia con `SE MANTIENE` / `REFORMULADA`, o heading `Reformulación de <ID>`                                                                                                                                                                         | `SUPERSEDED_BY_SUCCESSOR` (clasificación `SUPERSEDED`, con `canonicalKey`)    |
| R3 `GOVERNED_FREEZE`        | marcador de etapa `…-vX · … CANDIDATE-FROZEN` declarado como línea propia; ámbito A = [declaración, siguiente marcador), ámbito B = [promoción `READY-TO-FREEZE` / `FOUNDATION-SUPPORTED`, declaración]. Si una versión posterior del área reabre la familia, R3 no aplica. | una sola definición canónica; previas `SUPERSEDED_BY_GOVERNED_STAGE` / `…_FROZEN_STATEMENT`; ausentes `NOT_IN_FROZEN_ARCHITECTURE` |
| R4 `FROZEN_HEADING`         | única ocurrencia con token `CANDIDATE-FROZEN` en su propio heading                                                                                                                                                                                                                  | `CANONICAL_SELECTED`                                                         |
| R5 `VERBATIM_DUPLICATE`     | todas las ocurrencias con heading y **sección completa** idénticos byte a byte (no aplica si el heading es borrador)                                                                                                                                                                  | primera = definición; resto `RESTATEMENT_OF_CANONICAL`                        |

Invariantes: la cronología sola y la última aparición sola **nunca** deciden (test sintético);
si una ocurrencia de un ID queda sin explicación, el ID entero queda `REVIEW_REQUIRED`; toda
versión previa se conserva en el candidato con su evidencia (test: los 679 ítems de la línea base
siguen presentes). El validador de candidatos verifica cada evidencia literal, la coherencia
kind→clasificación, que `canonicalKey` apunte a la definición FINAL_APPROVED y que la cadena de
supersesión termine sin ciclos.

## 3 · Decisiones de gobierno aplicadas (verificadas literalmente)

| Capacidad | Cierre que rige                                                                                                                              | Otras apariciones                                                    | Conteos aprobados verificados                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP-03     | L6078 bajo `34. Cierre formal OP-03`                                                                                                         | L6152 = confirmación                                                 | CE 4 (L6082) · VA 8 (L6083) → materializados 4 / 8                                                                                                                         |
| OP-04     | L5993 (única)                                                                                                                                | —                                                                    | CE 3 (`\| CE \| 3 \|` L5380) · VA 9 (L5381) → 3 / 9                                                                                                                        |
| OP-05     | L1673, precedido por `DoD: 27/27 PASS`, `A–V: 22/22 PASS`, `K1–K4: 4/4 PASS`                                                                 | L1631 = estado provisional `K4 DOCUMENTARY VALIDATION REQUIRED`, rechazado | CE 4 (L1606) · VA 10 (L1607) → 4 / 10 · Reglas primarias 11 · Familias de hallazgo 8 · Patrones 8 · Instrumentos 8 · Entregables 8 · CRV principales 8 (L1608–1613, literales; sin familia materializable por prefijo → no comparables) |

Backlog gobernado OP-03 (no bloqueante, literal, 1 línea de cuerpo cada uno):
`A-OP03-01 · Academic reinforcement`, `A-OP03-02 · Contextual KPI Library`,
`A-OP03-03 · Machine-readable Knowledge Pack`. No se infirió backlog adicional.

## 4 · Ejemplos de certificación (emergen de la evidencia, sin mapeos)

- **OP-03**: `VA09` → `ELIMINATED` por R1 (L668 “Se elimina como VA independiente.”); `VA10` →
  `SUPERSEDED_BY_SUCCESSOR` por R2 con `canonicalKey` en la VA08 final; CE01–04 y VA01–08 canónicas
  por R3 bajo `OP03-CEVA-v0.4 · CANDIDATE-FROZEN` (L1759; promoción L1298/L1346). Resultado 4 CE / 8 VA.
- **OP-04**: `CE04` (L258) → `NOT_IN_FROZEN_ARCHITECTURE` por R3 bajo `OP04-CEVA-v0.4 · CANDIDATE-FROZEN`
  (L1661; promoción L1262); CE01–03 y VA01–09 canónicas. Resultado 3 CE / 9 VA.
- **OP-05**: VA01–10 canónicas por R3 bajo `OP05-CEVA-v0.2 · FOUNDATION-SUPPORTED · CANDIDATE-FROZEN` (L249).

## 5 · Antes / después

| Métrica                                       | OP-03 antes → después | OP-04 antes → después | OP-05 antes → después | Lote antes → después |
| --------------------------------------------- | --------------------- | --------------------- | --------------------- | -------------------- |
| IDs ambiguos                                  | 25 → **12**           | 33 → **21**           | 14 → **4**            | 72 → **37**          |
| Resueltos automáticamente por evidencia       | 13                    | 12                    | 10                    | **35 (48,6 %)**      |
| Ítems candidatos                              | 286 → 289 (+3 backlog) | 257 → 257            | 136 → 136             | 679 → 682            |
| FINAL_APPROVED (objetos canónicos candidatos) | 158 → 170             | 152 → 163             | 107 → 117             | 417 → 450            |
| SUPERSEDED                                    | 0 → 9                 | 0 → 0                 | 0 → 0                 | 0 → 9                |
| HISTORICAL_DRAFT                              | 128 → 107             | 97 → 86               | 29 → 19               | 254 → 212            |
| Ítems con evidencia de supersesión            | 0 → 84                | 0 → 50                | 0 → 20                | 0 → 154              |
| Objetos en revisión humana (ocurrencias de IDs ambiguos) | 125 → **44**  | 97 → **48**           | 28 → **8**            | 250 → **100**        |
| `HUMAN_REVIEW_OBJECTS / CANONICAL_OBJECTS` (FINAL_APPROVED candidatos) | 0,791 → **0,259** | 0,638 → **0,294** | 0,262 → **0,068** | 0,600 → **0,222** |
| `CONTROL_COUNT_MISMATCH`                      | 3 → 1 (CRV)           | 3 → 1 (CRV)           | 1 → 0                 | 7 → 2                |
| Motivos REVIEW de la Factory                  | 29 → 15               | 37 → 24               | 16 → 6                | 82 → 45              |
| Aceptaciones canónicas                        | 0                     | 0                     | 0                     | 0                    |
| Source gaps (SCNR) / NOT_EXPLICIT declarados  | 0 / 0                 | 0 / 0                 | 0 / 0                 | 0 / 0 (no se infieren) |
| GENERIC_RUNTIME_EXTENSION_REQUIRED            | no evaluable          | no evaluable          | no evaluable          | —                    |
| Fixtures                                      | NOT_RUN               | NOT_RUN               | NOT_RUN               | —                    |
| FAIL                                          | 0                     | 0                     | 0                     | 0                    |

“Objetos canónicos” = FINAL_APPROVED **candidatos**; ninguno es canónico aceptado mientras no exista
`canonical-acceptance.json`. Los motivos REVIEW “después” incluyen el nuevo
`PROVENANCE_VOCABULARY_REQUIRED` (1 por capacidad) y `CANONICAL_ACCEPTANCE_REQUIRED`.

## 6 · Lo que queda para revisión humana (genuinamente no resuelto)

| Capacidad | IDs                                                           | Por qué no resuelve el resolver                                                                                                                                                         |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP-03     | IP01–IP08 (4–5 ocurrencias: L3356–3363 índice, L3366–3527, L3926–4152, L4530–4646) | etapas INT-v0.1/v0.2/v0.3 sin marcador `CANDIDATE-FROZEN` ni eliminación/reformulación explícita; solo cronología                                                                       |
| OP-03     | P-OP03-02 (L759, L1155) · P1 (L1845–1878) · REC-OP03-01 (L379, L3333) · REUSE-OP03-01 (L1641, L1842) | definiciones distintas sin transición explícita                                                                                                                                          |
| OP-04     | HF01–HF08 (L2872–2965 vs L5722–5778)                          | reaparecen en la sección de conocimiento con cuerpo distinto; sin declaración de supersesión                                                                                            |
| OP-04     | IP01–IP08 (L3419–3597 vs L3951–4170)                          | INTERVENTIONS-v0.1 vs EXECUTION-v0.1 sin freeze de familia IP; R5 no aplica porque la sección completa difiere                                                                          |
| OP-04     | K1–K4 · UA-OP04-v0.4 (L1282, L1663: dos headings con token de congelación) | varias definiciones; R4 exige una única                                                                                                                                                  |
| OP-05     | K1–K4 (L1506–1661)                                            | dos definiciones cada uno sin transición explícita                                                                                                                                      |
| OP-03 / OP-04 | familia CRV: 10 FINAL_APPROVED vs 8 declarados           | OP-03: `CRV-OP03-01..08` (L4533–4649) + `CRV02`/`CRV03` (L5040/5042); OP-04: `CRV01..08` (L4506–4581) + `CRV-OP04-01` (L4499) / `CRV-OP04-09` (L4608). Dos tipos semánticos bajo el mismo prefijo: decisión humana de tipo. |
| Todas     | `provenanceVocabulary` vacío                                  | la baseline canónica lo exige; el extractor estructural no lo produce. Único defecto de la proyección previa (schema); el resto de campos es literal.                                   |

## 7 · Cross-capability

| Entrada          | Decisión humana                                   | Estado efectivo validado                    | Evidencia literal                                                                                                                                            |
| ---------------- | ------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-OP02-02        | `KEEP_OPEN_PENDING_OP03_CANONICAL_ACCEPTANCE`     | `OPEN_PENDING_CANONICAL_ACCEPTANCE`         | OP-02 L12432, L12434; OP-03 L831, L5713 “Con esto queda resuelto A-OP02-02 desde el lado de OP-03.”, L5715–5717 “local/intraoperacional → OP-02 / versus / articulación estructural transversal → OP-03.” |
| BOUND-OP05-02    | `ACCEPTED_CONDITIONAL`                            | `CONDITION_MET`                             | OP-05 L59–60; definición única FINAL_APPROVED, ninguna aparición posterior, sin evidencia de supersesión                                                     |

Con una aceptación canónica vigente de OP-03 el validador pasa A-OP02-02 a
`RESOLUTION_EVENT_ELIGIBLE` (test); un evento registrado sin esa aceptación, un pack
`op-02@1.0.0` alterado o una evidencia no literal son FAIL. El pack publicado no se modificó.

## 8 · Runtime y fixtures

No se ejecutaron: exigen una baseline canónica **aceptada**. La proyección previa confirma que, tras
resolver los puntos de §6, la única objeción estructural restante es `provenanceVocabulary`. No se
declara compatibilidad 0.2.0 ni se registra `GENERIC_RUNTIME_EXTENSION_REQUIRED`.

## 9 · Throughput

| Paso                                     | OP-03    | OP-04    | OP-05  | Lote     |
| ---------------------------------------- | -------- | -------- | ------ | -------- |
| Extracción 0.1.0 (sin resolver)          | 46 ms    | 32 ms    | 10 ms  | 88 ms    |
| Extracción 0.2.0 (resolver + decisiones) | 108 ms   | 61 ms    | 19 ms  | 188 ms   |
| Evaluación Factory                       | 3 101 ms | 2 617 ms | 908 ms | 6 626 ms |

Tokens / créditos: no expuestos programáticamente; no se estiman.

## 10 · Validación

`bunx vitest run` 34 archivos · **760/760** · `typecheck` ✓ · `knowledge:validate` ✓ ·
`knowledge:seal:check` ✓ · `knowledge:factory:check` ✓ (manifest, benchmark y dossiers al día) ·
prettier ✓ · eslint: archivos nuevos limpios; 2 `no-explicit-any` previos en `factory.test.ts` y
`op02-prepublication.test.ts` preservados como deuda. Sin cambios de base de datos, RLS,
dependencias ni código de aplicación.

## 11 · Decisiones humanas siguientes (exactas)

1. OP-03: seleccionar definición vigente (o declarar supersesión) para IP01–IP08, P-OP03-02, P1, REC-OP03-01, REUSE-OP03-01.
2. OP-04: ídem para HF01–HF08, IP01–IP08, K1–K4 y UA-OP04-v0.4.
3. OP-05: ídem para K1–K4.
4. OP-03 / OP-04: decidir el tipo semántico de las dos series CRV (8 declarados vs 10 materializados).
5. Las tres: transcribir literalmente el vocabulario de provenance de la fuente o registrar su ausencia.
6. Registrar `canonical-acceptance.json` sobre el checksum vigente del candidato; después, registrar el evento de resolución de A-OP02-02 en el registro cross-capability.

FACTORY_TRACTION_PARTIAL
