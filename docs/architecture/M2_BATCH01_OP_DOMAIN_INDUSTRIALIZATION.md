# M2-BATCH-01 · OP-02 Publication + OP Domain Industrialization

Punto de partida: `M2-FACTORY-01 · KNOWLEDGE_FACTORY_READY_FOR_BATCH_01`.
Engine: `pymapa-knowledge-engine/0.2.0`. Master: `PYMAPA-KNOWLEDGE-MASTER v1.0`.

## A · Publicación de OP-02

| Elemento | Evidencia |
|---|---|
| Autorización | `knowledge/master/v1.0/capabilities/OP-02/governance-review.json` · `decision=APPROVED` · `reviewedAt=2026-09-22` · `engineVersion=0.2.0` |
| Revisor | `PROJECT_OWNER / KNOWLEDGE_GOVERNANCE_AUTHORITY` (solo rol). El mecanismo de gobierno basado en archivos no expone una identidad autenticada del actor; **no se registró ni se fabricó identidad personal** (`reviewerIdentity`). |
| Fuente de la autorización | Instrucción humana explícita M2-BATCH-01 (DECISION/CAPABILITY/ENGINE_VERSION/DATE). |
| Evidencia revisada | Dossier `knowledge/factory/evidence/OP-02.governance-evidence.json` · `sha256:986948ec…f22f22d9` (readiness `READY_FOR_HUMAN_PUBLICATION_AUTHORIZATION`). Un test reconstruye el estado pre-publicación y recalcula el dossier byte a byte: la aprobación cita exactamente esa evidencia. |
| Pack publicado | `knowledge/packs/op-02/1.0.0/pack.json` + `published.json` · `sha256:7f807207…0ebc6cc` = checksum del candidato revisado · `requiredEngineVersion=0.2.0` |
| Ciclo | `VALIDATED/READY_FOR_PUBLICATION` → gate `PUBLISHED/PASS` → `SOURCE_READY / PUBLISHED`. Nuevo subcomando `knowledge:factory -- publish` exige revisión APPROVED, dossier vigente y READY, checksum de candidato idéntico al revisado y gate PASS; es idempotente y se niega a sobrescribir una versión publicada. |
| Preservado sin cambios | TC-OP02-01 = ACCEPTED · GRE-OP02-01..04 = CLOSED · NE-OP02-01..06 = NOT_EXPLICIT · A-OP02-01..03 = GOVERNED BACKLOG (verificado en manifest y tests). |
| Post-publicación | `knowledge:validate` ✓ · `knowledge:seal:check` ✓ · `knowledge:factory:check` ✓ · regresión Golden OP-01 PASS · OP-02 golden-regression contra su propio pack publicado `equivalent=true`. |
| Aplicación | OP-02 **no** se activó en la aplicación. |

## B · Batch 01 (OP-03 · OP-04 · OP-05)

Flujo industrial único para las tres capacidades (sin workflow manual OP-02):

```text
register (raw inmutable, SHA-256, texto determinista, líneas)  →
extract  (herramienta determinista genérica → candidate.json CANDIDATE) →
factory  (validación aislada por capacidad) → CANONICAL_REVIEW_REQUIRED
```

Nuevo módulo genérico `packages/knowledge-pipeline/src/structural-extractor.ts`
(`pymapa-structural-segmenter@0.1.0`, sin identificadores de capacidad en código):
segmenta por headings con identificador, copia campos literales con rango de líneas,
registra cronología, cierre histórico, conteos de control y referencias cruzadas.
Reglas: un identificador con varias definiciones → todas `HISTORICAL_DRAFT`
(la cronología nunca decide); nueva verificación genérica `SUPERSESSION_AMBIGUOUS`
en la frontera de candidatos que **bloquea la promoción** incluso con aceptación humana.
Tipos de objeto quedan como `SOURCE_ID_<prefijo>`: el tipo semántico lo decide la
revisión canónica, no la herramienta. No se usó IA para producir candidatos.

### Tabla comparativa

| | OP-03 | OP-04 | OP-05 |
|---|---|---|---|
| Nombre (literal verificado) | Integrar procesos de extremo a extremo (L5685, L6080, L6164) | Simplificar y automatizar de manera pertinente (L3, L5995) | Gestionar iniciativas hasta su implementación efectiva (L7, L762) |
| Registro | `RAW-OP-03-afe0758fb2b4` | `RAW-OP-04-98e7bf95daf4` | `RAW-OP-05-16734c65ee57` |
| SHA-256 original / texto | `afe0758f…` / `26d6a7a9…` | `98e7bf95…` / `8a749c56…` | `16734c65…` / `09629d4e…` |
| Bytes / líneas / headings | 288 189 / 6 185 / 954 | 335 872 / 6 015 / 823 | 92 912 / 1 786 / 259 |
| Cierre histórico literal | `OP03-K4-v1.0 · K4-VALIDATED · CLOSED` L6078, L6152 (2 apariciones → confirmación humana) | `OP04-K4-v1.0 · K4-VALIDATED · CLOSED` L5993 | `OP05-K4-v1.0 · K4-VALIDATED · CLOSED` L1631 (condicional: “Si esa revisión confirma…”) y L1673 (tras revisión documental); precedido por `OP05-K3-v0.9 · … · K4-DOCUMENTARY-PENDING` L1619 → confirmación humana |
| Ítems candidatos | 286 | 257 | 136 |
| FINAL_APPROVED candidato / HISTORICAL_DRAFT / GOVERNED_BACKLOG | 158 / 128 / 0 | 152 / 97 / 8 | 107 / 29 / 0 |
| IDs distintos / multi-definidos | 186 / 25 | 193 / 33 | 122 / 14 |
| Ocurrencias en supersesión ambigua | 125 | 97 | 28 |
| Conteos de control (inventario final) vs FINAL | CE 4→0 · VA 8→2 · CRV 8→10 | CE 3→1 · VA 9→0 · CRV 8→10 | VA 10→0 (CRV 8 = 8) |
| Discrepancias de fuente relevantes | IDs VA09/VA10 aparecen en borradores; el inventario final (L5693–5704) declara 4 CE / 8 VA. CRV01..08 conviven con `CRV-OP03-01..08`. Backlog A-OP03-01..03 (L6104–6108) está en líneas planas, no en headings → no capturado por el extractor. | Inventario declara 3 CE (L5380) pero existen definiciones CE04. CRV01..08 conviven con `CRV-OP04-01`/`-09`. | Menor volumen; ambigüedad concentrada en VA01..10 y K1..K4. |
| NOT_EXPLICIT / SCNR | 0 / 0 (no se infieren gaps) | 0 / 0 | 0 / 0 |
| Elementos no textuales | 457 `w:pict`: 457 reglas horizontales VML, 0 imágenes | 431: 431 reglas horizontales, 0 imágenes | 132: 132 reglas horizontales, 0 imágenes |
| Checks Factory | RAW PASS · CANDIDATE_BOUNDARY REVIEW · SOURCE_TO_CANONICAL REVIEW · resto NOT_RUN | idem | idem |
| Motivos REVIEW | 29 | 37 | 16 |
| GENERIC_RUNTIME_EXTENSION_REQUIRED | no evaluable (sin proyección canónica) | idem | idem |
| Fixtures | 0 (no generables sin canónico) | 0 | 0 |
| Estado / resultado | `CANONICAL_REVIEW_REQUIRED` / `REVIEW_REQUIRED` | idem | idem |
| FAIL | 0 | 0 | 0 |

La advertencia `IMAGES_NOT_TRANSCRIBED` del registro raw es un falso positivo verificado:
los 1 020 elementos son `v:rect` con `o:hr="t"` o id `Horizontal Line N`, sin `v:imagedata`
ni textbox. No hay contenido perdido. Registro original sin modificar (inmutable).

### B5 / B6 · Runtime, fixtures y validación

Las etapas STRUCTURAL, REFERENTIAL, PROVENANCE, CANONICAL_TO_PACK, RUNTIME_COMPATIBILITY,
FIXTURES, SOURCE_SILENCE, CAPABILITY_BRANCHING, GOLDEN_REGRESSION y PUBLICATION_GATE
**no se ejecutaron** para OP-03/04/05: requieren una baseline canónica aceptada y su
proyección ejecutable. Ejecutarlas sobre candidatos no aceptados convertiría la herramienta
en autoridad canónica. Por tanto no se registró ningún `GENERIC_RUNTIME_EXTENSION_REQUIRED`
ni fixture candidato; no se declara compatibilidad con 0.2.0.

## B4 · Integridad cross-capability (literal, no inferida)

| Frontera | Evidencia OP-03/04/05 | Evaluación |
|---|---|---|
| OP-02 / OP-03 | OP-03 L25–31 importa A-OP02-02; `BOUND-OP03-01` L828–829; `DER-OP03-01` L2483–2488; `DERIVE → OP-02` L3062–3064; K1 L5708–5716 | Coherente con OP-02 (baseline L12432–12434) |
| OP-03 / OP-04 | OP-03 L833–839; `BOUND-OP04-01` L35–36 (y L5506) | Coherente en ambos lados |
| OP-04 / OP-05 | `BOUND-OP04-03` L286–287; `BOUND-OP05-01` L45–48 | Coherente en ambos lados |
| OP-02 / OP-05 | `BOUND-OP05-02` L59–60 | Nueva frontera declarada solo en OP-05; OP-02 publicado no la contradice ni la declara → revisión humana |
| OP-04 → DT/DG/PC | `BOUND-OP04-02` L70–71 | Fuera del lote; registrada como referencia |

Referencias cruzadas en headings: OP-03 47, OP-04 30, OP-05 4 (en `extraction-report.json`).
No se creó ninguna relación ni se modificó OP-01/OP-02.

### A-OP02-02 · Boundary Validation OP-03 → **REQUIRES_HUMAN_REVIEW**

- OP-02 (publicado): “Revalidar dependencia local vs integración estructural E2E al construir OP-03.” (baseline L12432–12434); “Ninguno reabre OP-02 automáticamente.” (L12440).
- OP-03 L831: “No lo cierro definitivamente hasta K1 de OP-03.”
- OP-03 L3064: “Esto cierra prácticamente el backlog heredado A-OP02-02 desde el lado de OP-03.”
- OP-03 L5713 (K1, antes del cierre K4 L6152): “Con esto queda resuelto A-OP02-02 desde el lado de OP-03.”

La fuente sustenta un cierre desde el lado de OP-03, pero OP-03 no tiene aceptación canónica y
el ítem pertenece al backlog de un pack publicado e inmutable. Recomendación: cerrar solo mediante
decisión humana registrada tras la aceptación canónica de OP-03, sin modificar `op-02@1.0.0`.

## D · Métricas de la Factory

| Métrica | OP-03 | OP-04 | OP-05 | Lote |
|---|---|---|---|---|
| Raw (bytes) | 288 189 | 335 872 | 92 912 | 716 973 |
| Registro (extracción DOCX) | no cronometrado | no cronometrado | no cronometrado | — |
| Extracción de candidato | 127 ms | 156 ms | 134 ms | 417 ms |
| Evaluación Factory | 1 607 ms | 1 551 ms | 566 ms | 3 724 ms |
| Candidatos | 286 | 257 | 136 | 679 |
| Canónicos | 0 | 0 | 0 | 0 |
| Checks automáticos PASS | 1 | 1 | 1 | — |
| Motivos de revisión humana | 29 | 37 | 16 | 82 |
| Objetos en revisión humana (ocurrencias ambiguas) | 125 | 97 | 28 | 250 |
| `HUMAN_REVIEW_OBJECTS / CANONICAL_OBJECTS` | no definible (0 canónicos) | idem | idem | idem |
| `HUMAN_REVIEW_OBJECTS / CANDIDATE_ITEMS` | 0.44 | 0.38 | 0.21 | 0.37 |
| FAIL / blockers técnicos | 0 | 0 | 0 | 0 |

Tokens / créditos: no expuestos programáticamente; no se estiman.

## F · Validación y regresión

| Verificación | Resultado |
|---|---|
| `bunx vitest run` | 33 archivos · **733/733** |
| `bun run typecheck` | ✓ |
| `knowledge:validate` (schema, referencias, gobierno, runtime, fixtures, Golden, manifest) | ✓ OP-01 PASS/PUBLISHED · OP-02 PASS/PUBLISHED |
| `knowledge:seal:check` | ✓ |
| `knowledge:factory:check` | ✓ sin FAIL; manifest/benchmark al día |
| Aislamiento | tests: corrupción de OP-01 no afecta OP-02 y viceversa; OP-03/04/05 no alteran OP-01/OP-02 |
| Golden OP-01 | regresión PASS, pack sin cambios |
| OP-02 integridad | TC/GRE/NE/backlog preservados; 10 fixtures sin FAIL |
| Engine 0.2.0 | sin cambios en el engine en este bloque |
| Seguridad | sin cambios de base de datos, RLS, dependencias ni código de aplicación → sin superficie nueva |
| Lint | archivos nuevos limpios; deuda previa no relacionada preservada |

Tests actualizados por el cambio de estado autorizado de OP-02: los de
`READY_FOR_PUBLICATION` ahora reconstruyen explícitamente el estado pre-publicación.
Nuevo `structural-extractor.test.ts` (determinismo, identidad, cierre, no-promoción por
cronología, no-apropiación de otras capacidades, bloqueo de promoción, ausencia de aprobaciones).

## Decisiones humanas siguientes (exactas)

1. **OP-03/04/05 · cierre histórico**: confirmar la línea de cierre vigente (OP-03 L6078 vs L6152; OP-05 L1673, no L1631).
2. **OP-03/04/05 · supersesión**: para cada ID ambiguo (25 / 33 / 14) seleccionar la definición vigente con evidencia literal y marcar el resto `SUPERSEDED`/`HISTORICAL_DRAFT`, y asignar tipo semántico.
3. **Discrepancias de conteo**: OP-03 VA09/VA10 vs 8 VA; OP-04 CE04 vs 3 CE; doble familia CRV en OP-03/OP-04.
4. **Backlog OP-03**: incorporar A-OP03-01..03 (L6104–6108) al candidato.
5. Registrar `canonical-acceptance.json` por capacidad sobre el checksum vigente; solo entonces ejecutar proyección, runtime 0.2.0 y fixtures.
6. **A-OP02-02**: decidir cierre tras la aceptación canónica de OP-03.
7. **OP-02 / OP-05**: aceptar `BOUND-OP05-02` como frontera nueva sin modificar `op-02@1.0.0`.
8. Mejora genérica opcional del extractor raw: clasificar reglas horizontales VML para eliminar el falso positivo `IMAGES_NOT_TRANSCRIBED`.

## Conclusión

Registro raw y extracción de candidatos corrieron por la Factory con un único flujo genérico,
aislado por capacidad, en menos de 4 s por lote y sin FAIL; OP-02 quedó publicado bajo
autorización humana. La selección canónica (250 ocurrencias ambiguas) sigue siendo humana y las
etapas runtime/fixtures no se alcanzaron para OP-03/04/05.

FACTORY_TRACTION_PARTIAL
