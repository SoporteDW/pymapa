# M2-FACTORY-01 · Knowledge Factory Transition + OP-02 Closure

Estado: **cerrado**. Resultado final: **KNOWLEDGE_FACTORY_READY_FOR_BATCH_01** (con precondiciones de entrada, §17).
OP-02: **READY_FOR_HUMAN_PUBLICATION_AUTHORIZATION** — no publicado.

Alcance respetado (C): no se inició OP-03, no se ingestó ningún Word nuevo, no se rediseñó UX, OP-02 no se activó
en la app, no se tocó funcionalidad comercial, no se añadieron features de IA de producto, no se abordó el
hardening amplio de grants, no hubo reformateo masivo y no se fabricó contenido del Knowledge Master.

---

## 1. Prontitud técnica de publicación de OP-02

| Evidencia | Valor |
|---|---|
| Cierre histórico (provenance, no publicación) | `OP02-K4-v1.0 · K4-VALIDATED · CLOSED` (raw línea 12319) |
| Original DOCX | `OP-02_Completo.docx` · sha256 `646fc9d1e7fc7df4825bf16a82687387437ed333204ffaff4c620a3b6ebb3da5` |
| Raw text | `raw/OP-02_Completo.txt` · sha256 `db27a2976db128e87cbcfa9f2df1a40f461ff91cb0eb8b07110181b5c3b34800` · 12 503 líneas |
| Canonical baseline | `sha256:8c24e39e0d4f31ac1006fc18dad5094bf16a4755e7596dfa90b7c2c90d016a00` · 329 objetos |
| Source ejecutable | `sha256:7adea6a30966750ac06eded4d83491da0bc4c4b112f75ca9755d1cf616c638b4` |
| Pack candidato | `op-02@1.0.0` · `sha256:7f8072073a12961bea852c5bee36cce1574836cb0bc59c8c27acbe6ae0ebc6cc` |
| Corrección de transcripción | `TC-OP02-01` (SOURCE_TO_CANONICAL_OMISSION, IP05) |
| Extensiones runtime | GRE-OP02-01..04 → GRX-001..004 · **CLOSED** en engine 0.2.0 |
| NOT_EXPLICIT | NE-OP02-01..06 (preservados, sin rellenar) |
| Backlog gobernado | A-OP02-01..03 |
| Candidatos transversales | 12 (no promovidos) |
| Fixtures | 10 · 7 PASS · 3 GOVERNED_JUDGMENT (esperado) · 0 FAIL |
| Regresión OP-01 Golden | PASS |
| Branching capability-specific | ninguno |

Checks automáticos de la Factory para OP-02: 11 PASS, `CANDIDATE_BOUNDARY` NOT_RUN (baseline ya canónica, sin
candidato pendiente), `GOLDEN_REGRESSION` NOT_APPLICABLE (OP-02 no es Golden; la regresión se ejecuta sobre OP-01).

Dossier: `knowledge/factory/evidence/OP-02.governance-evidence.json`
(`PRE_PUBLICATION_GOVERNANCE_EVIDENCE`, checksum `sha256:986948ec…22d9`). No contiene identidad, firma, revisor ni
fecha de aprobación: `humanAuthorization.present = false`.

## 2. Evidencia de engine 0.2.0

- `packages/knowledge-engine/src/index.ts`: `ENGINE_SEMVER = "0.2.0"`, `ENGINE_VERSION = "pymapa-knowledge-engine/0.2.0"`;
  `packages/knowledge-engine/package.json` → `0.2.0`.
- `ENGINE_SEMANTIC_HISTORY` documenta los cambios **genéricos** (sin IDs de capacidad en el texto; test lo verifica):

| ID | Semántica genérica |
|---|---|
| ENG-0.2-01 | CONTEXTUAL_GOVERNED_PROPERTIES — severidad/confianza contextuales gobernadas |
| ENG-0.2-02 | INTERVENTION_PATTERN_OWNED_VALIDATION_REQUIREMENTS — CRV propiedad del patrón de intervención |
| ENG-0.2-03 | DONE_IMPLEMENTATION_LIFECYCLE — Done/implementation state sin implicar CRV |
| ENG-0.2-04 | EFFECTIVENESS — efectividad evaluada aparte |
| ENG-0.2-05 | ATTRIBUTION — atribución independiente de efectividad |
| ENG-0.2-06 | FOLLOW_UP_REASSESSMENT — follow-up/reassessment gobernados |
| ENG-0.2-07 | UNRESOLVED_FINDING_PROJECTION — proyección persistida de findings no resueltos |
| ENG-0.2-08 | UNKNOWN_NOT_APPLICABLE_CONTRADICTORY_CORRECTION — semántica corregida de estados no conocidos |

- Versión del engine y versión del Knowledge Pack son independientes (test: `engineVersion` ≠ `packVersion`;
  OP-01 sigue `op-01@1.0.0` con `requiredEngineVersion 0.1.0`, compatible con 0.2.0).

## 3. Evidencia de EvaluationRuns históricos

- Sin backfill ni recálculo. Base de datos al cierre: **5 evaluation_runs, todos `pymapa-knowledge-engine/0.1.0`**.
- Migración `evaluation_runs_lineage_immutable` (trigger BEFORE UPDATE): cualquier cambio de `engine_version` o
  `knowledge_version_id` lanza `EVALUATION_RUN_ENGINE_VERSION_IMMUTABLE` / `EVALUATION_RUN_KNOWLEDGE_VERSION_IMMUTABLE`.
- Verificación en vivo: sonda con rollback que intenta reetiquetar un run histórico a 0.2.0 → rechazada por el trigger;
  recuento posterior sin cambios.
- `src/lib/production/engine-version.test.ts` (6 tests): run nuevo registra 0.2.0; run histórico 0.1.0 intacto tras
  nuevas evaluaciones; `runtime.server.ts` nunca emite updates de `engine_version`/`knowledge_version_id`; la migración
  contiene el trigger y ambas excepciones.

## 4. Arquitectura batch implementada

```text
original (DOCX/PDF/TXT) ──register──▶ knowledge/intake/<ID>/registration.json   [REGISTERED]
                                      + original/ inmutable + text/ determinista
candidate.json (tool | humano | IA) ─────────────────────────────────────────▶ [EXTRACTED_CANDIDATE]
validateExtractionCandidate ─────────────────────────────────────────────────▶ [CANONICAL_REVIEW_REQUIRED]
canonical-acceptance.json (humano, ligado al checksum) ──promote──▶ canonical-baseline.json (master)
source.json + pack candidato ──14 checks──▶ [VALIDATED] ──dossier──▶ [READY_FOR_PUBLICATION]
governance-review.json (humano) ─────────────────────────────────────────────▶ [PUBLISHED]
```

Cada capacidad recorre su propia máquina de estados; `runFactoryBatch` evalúa todas en aislamiento
(excepción capturada por capacidad) y consolida el manifest.

## 5. Archivos, scripts y contratos

Añadidos:
- `packages/knowledge-pipeline/src/factory.ts` — estados, checks, `runFactoryBatch`, dossiers, benchmark, guardia anti-branching.
- `packages/knowledge-pipeline/src/raw-source.ts` — registro raw y extractores DOCX/TEXT/PDF.
- `packages/knowledge-pipeline/src/candidate.ts` — frontera de candidato y promoción gobernada.
- `packages/knowledge-pipeline/src/runtime-extensions.ts` — registro de extensiones genéricas.
- `packages/knowledge-pipeline/src/factory.test.ts` (32 tests), `src/lib/production/engine-version.test.ts` (6 tests).
- `scripts/knowledge-factory.ts` — CLI.
- `knowledge/factory/runtime-extensions.json`, `batch-manifest.json`, `evidence/OP-02.governance-evidence.json`, `reports/benchmark.md`.
- `knowledge/intake/README.md` (zona de entrada, vacía).
- Schemas: `runtime-extension-registry`, `raw-source-registration`, `extraction-candidate`, `canonical-acceptance`
  (`knowledge/schemas/*.schema.json`; el contrato autoritativo es el zod del módulo correspondiente).
- Migración: trigger `evaluation_runs_lineage_immutable`.

Cambiados:
- `packages/knowledge-engine/src/index.ts`, `packages/knowledge-engine/package.json` — engine 0.2.0 + historial.
- `packages/knowledge-pipeline/src/loader.ts` — descubre intake/baselines; ignora directorios sin `source.json` en el pipeline de packs.
- `packages/knowledge-pipeline/src/index.ts` — exports.
- `package.json` — `knowledge:factory`, `knowledge:factory:write`, `knowledge:factory:check`.
- `.github/workflows/knowledge-pipeline.yml` — rutas `knowledge/factory/**`, `knowledge/intake/**` y paso `knowledge:factory:check`.
- `src/lib/production/arquitectura.test.ts` — alta del nuevo test en la lista autorizada.

CLI:
```
bun run knowledge:factory                     # evalúa el lote
bun run knowledge:factory:write               # regenera manifest, dossiers y benchmark
bun run knowledge:factory:check               # CI: falla con FAIL o artefactos desactualizados
bun run knowledge:factory -- register --capability XX-00 --domain XX --file <ruta> [--marker "<literal>"]
bun run knowledge:factory -- promote  --capability XX-00
```

## 6. Registro de fuente raw (B2)

- El original se copia a `knowledge/intake/<ID>/original/` y se identifica por SHA-256 de bytes; nunca se modifica.
- Extracción determinista, citable por línea:
  - **DOCX**: parser ZIP en TypeScript puro (stored/deflate), convención de texto documentada (headings con nivel,
    listas, tablas, marcas de imagen no transcrita, revisiones borradas omitidas y contadas). Contrastado con pandoc
    sobre OP-02: cobertura completa de palabras de más de 3 caracteres; re-extracción idéntica.
  - **TEXT**: normalización de saltos de línea únicamente.
  - **PDF**: `pdftotext` vía runner inyectable; si no hay herramienta → `EXTRACTOR_UNAVAILABLE` (nunca texto parcial silencioso).
- `registration.json` registra identidad, extractor y versión, SHA-256 del texto, outline de headings con línea,
  inicio de páginas (PDF), marcador histórico declarado localizado literalmente y checksum propio.
- `verifyRawSourceRegistration` re-extrae y compara byte a byte. Declaración fija: *la extracción raw no es conocimiento canónico*.

## 7. Frontera de extracción de candidatos (B3)

Clasificaciones: FINAL_APPROVED, HISTORICAL_DRAFT, SUPERSEDED, GOVERNED_BACKLOG, TRANSVERSAL_CANDIDATE, NOT_EXPLICIT,
SOURCE_CONTENT_NOT_RECOVERED, POTENTIAL_TRANSCRIPTION_DEFECT, GENERIC_RUNTIME_EXTENSION_REQUIRED.

Reglas deterministas:
- Todo campo de objeto debe aparecer literalmente en el rango de líneas citado del texto registrado (`NOT_VERBATIM` → FAIL).
- Clases silenciosas (NOT_EXPLICIT, SCNR) no pueden llevar contenido (`SILENCE_FILLED` → FAIL).
- Un borrador no se promueve por cronología: FINAL_APPROVED requiere evidencia de aprobación citada; si no, REVIEW.
- SUPERSEDED exige referencia al sucesor; el cierre histórico K4 se trata como provenance, no como publicación.
- Conteos de control declarados vs materializados distintos → REVIEW.
- GENERIC_RUNTIME_EXTENSION_REQUIRED no registrada en el registro de extensiones → REVIEW.
- Salida `AI_ASSISTED` → siempre al menos REVIEW; nunca conocimiento aprobado.
- `promoteCandidateToCanonicalBaseline` solo con `canonical-acceptance.json` ACCEPTED ligado al checksum exacto del candidato.

## 8. Modelo de batch manifest (B1)

`knowledge/factory/batch-manifest.json`: 31 slots del Master; por capacidad registrada: capabilityId, domain, estado,
outcome, fuente raw (original + SHA-256, texto + SHA-256, líneas), extracción, canonical (checksum, objetos),
provenance, gaps (NOT_EXPLICIT, SCNR, GRE), correcciones de transcripción, compatibilidad runtime (engine requerido
vs actual, extensiones), fixtures, gobierno (revisión, evidencia CURRENT/OUTDATED/MISSING), publicación (pack id,
versión, checksum), checks y razones. Agregados: counts por estado y outcome, dominios, registro de extensiones,
`batchIssues`, señal `AUTHORITATIVE_SOURCE_REQUIRED` (29 slots sin fuente) y checksum.

## 9. Estado independiente por capacidad

- `FACTORY_STATES`: RAW_SOURCE → REGISTERED → EXTRACTED_CANDIDATE → CANONICAL_REVIEW_REQUIRED → VALIDATED → READY_FOR_PUBLICATION → PUBLISHED.
- Outcome por capacidad: PASS / REVIEW_REQUIRED / FAIL. Cada razón: `check`, `code`, `severity`, `message`, `action`,
  `sourceLines`, `objectKey` — accionable sin releer la fuente completa.
- Aislamiento probado: baseline OP-02 corrompida → OP-02 FAIL y OP-01 sigue PASS; pack OP-01 alterado → OP-01 FAIL
  y OP-02 conserva su estado; dossier desactualizado → REVIEW (no FAIL); dominio inexistente → FAIL aislado.

## 10. Automatización de validación (B4)

14 checks por capacidad: RAW_REGISTRATION, CANDIDATE_BOUNDARY, STRUCTURAL, REFERENTIAL, SOURCE_TO_CANONICAL,
PROVENANCE, CANONICAL_TO_PACK, RUNTIME_COMPATIBILITY, FIXTURES, SOURCE_SILENCE, CAPABILITY_BRANCHING,
GOLDEN_REGRESSION, PUBLICATION_GATE, GOVERNANCE_EVIDENCE. Reutilizan los validadores M2-A (estructural,
referencial, gobierno, diff, knowledge tests, runtime harness, gate) y `validateCanonicalBaseline`.
`CAPABILITY_BRANCHING` escanea engine, pipeline, factory y runtime productivo (sin comentarios) en busca de
comparaciones/literales por ID de capacidad.

## 11. Registro de extensiones runtime (B5)

`knowledge/factory/runtime-extensions.json`: entrada `GRX-nnn` con `semanticCapability`, `statement`, estado
OPEN/CLOSED, `closedInEngineVersion`, `engineChangeRefs` (ENG-x), `publicationBlockingWhileOpen` y ocurrencias
(capabilityId, gapId, tipos de objeto afectados, evidencia de fuente). Una extensión solo se cierra por cambio
genérico del engine; una ocurrencia OPEN bloquea publicación si así se declara; una GRE sin registrar → REVIEW.
Estado actual: 4 entradas (GRX-001..004), 0 abiertas, 4 cerradas en 0.2.0.

## 12. Métricas de benchmark (B6)

`knowledge/factory/reports/benchmark.md`:

| Capacidad | Estado | Resultado | Bytes original | Líneas raw | Canónicos | Checks auto PASS | Revisión humana | NOT_EXPLICIT | SCNR | Transcripción | Ext. abiertas/cerradas | Fallos test | Bloqueos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OP-01 | PUBLISHED | PASS | — | — | — | 11 | 0 | 0 | 0 | 0 | 0/0 | 0 | 0 |
| OP-02 | READY_FOR_PUBLICATION | REVIEW_REQUIRED | 283 468 | 12 503 | 329 | 11 | 1 | 6 | 0 | 1 | 0/4 | 0 | 1 |

OP-01 no tiene registro raw ni baseline canónica (se materializó antes del modelo; su fuente es AT-04). Duración
medible por capacidad y lote en el CLI. Coste en tokens/créditos: no expuesto programáticamente; no se estima.

## 13. Dry-run OP-01

`PUBLISHED` / **PASS**, sin razones pendientes. Golden intacto (9 hashes, pack `sha256:ceaa4b41…` publicado,
manifest `sha256:a1ca01e6…`), fixtures 4/4, revisión de gobierno APPROVED preexistente, compatible con engine 0.2.0.
No se re-extrajo conocimiento.

## 14. Dry-run OP-02

`READY_FOR_PUBLICATION` / **REVIEW_REQUIRED**, con un único motivo:
`PUBLICATION_GATE/HUMAN_PUBLICATION_AUTHORIZATION_REQUIRED` → la autoridad de gobierno registra
`governance-review.json` tras revisar el dossier. No se re-extrajo conocimiento.

## 15. Tests, typecheck, seguridad

| Verificación | Resultado |
|---|---|
| `bun run test` | **711/711** (incluye 32 factory + 6 engine-version nuevos) |
| `bun run typecheck` | limpio |
| `bun run knowledge:validate` | PASS=1 · REVIEW_REQUIRED=1 · FAIL=0 |
| `bun run knowledge:pipeline` | sin problemas |
| `bun run knowledge:seal:check` | identidades selladas |
| `bun run knowledge:factory:check` | sin FAIL; artefactos al día |
| Sonda trigger de lineage en BD | rechaza el cambio; 5 runs 0.1.0 |
| Escaneo de seguridad | sin issues |
| Lint | archivos nuevos limpios; deuda previa preservada (p. ej. formato en `arquitectura.test.ts` y engine) |

## 16. Blockers exactos antes de publicar OP-02

1. `knowledge/master/v1.0/capabilities/OP-02/governance-review.json` con decisión, revisor y fecha, registrado por la
   autoridad humana de gobierno. Ningún blocker técnico.

## 17. Prontitud para el primer batch industrial: OP-03 + OP-04 + OP-05

Mecanismo disponible: registro raw, frontera de candidato, promoción gobernada, 14 checks, registro de extensiones,
manifest y benchmark por lote, todo sin código por capacidad. Las tres se procesan en un solo lote y fallan o
quedan en revisión de forma independiente.

Precondiciones de entrada (no son defectos de la Factory):
- Los tres documentos históricos autoritativos (DOCX/PDF) y la orden explícita de iniciar el batch.

Límites conocidos, no bloqueantes:
- La producción de `candidate.json` y de la proyección ejecutable (`source.json`) sigue siendo trabajo de extracción
  (humano o asistido por IA) por capacidad; la Factory lo valida de forma determinista pero no lo genera.
- Una GRE nueva de OP-03/04/05 requerirá un cambio genérico del engine (versión nueva) antes de publicar esa capacidad; no bloquea a las demás.
- PDF depende de `pdftotext` en el entorno; si falta, el registro se detiene con `EXTRACTOR_UNAVAILABLE`.

**KNOWLEDGE_FACTORY_READY_FOR_BATCH_01**
