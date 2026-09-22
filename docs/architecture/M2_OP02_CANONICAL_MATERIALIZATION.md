# M2-OP02-01 · OP-02 Canonical Materialization + Pipeline Certification

**Capacidad:** OP-02 · Planificar, coordinar y ejecutar procesos y recursos de manera consistente
**Cierre histórico:** `OP02-K4-v1.0 · K4-VALIDATED · CLOSED`
**Knowledge Master:** PYMAPA-KNOWLEDGE-MASTER v1.0 · BASELINE-APPROVED
**Golden capability:** OP-01 (sin cambios)
**Resultado:** OP-02 materializada, técnicamente VALIDATED por el pipeline genérico, **UNPUBLISHED** a la espera de revisión humana de gobierno.

---

## 1. Fuente autoritativa

| Elemento | Valor |
| --- | --- |
| Documento original | `OP-02_Completo.docx` · 283.468 bytes · sha256 `646fc9d1e7fc7df4825bf16a82687387437ed333204ffaff4c620a3b6ebb3da5` |
| Transcripción raw | `knowledge/master/v1.0/capabilities/OP-02/raw/OP-02_Completo.txt` · 12.502 líneas · sha256 `db27a2976db128e87cbcfa9f2df1a40f461ff91cb0eb8b07110181b5c3b34800` |
| Herramienta | pandoc 3.7.0.2 · `--wrap=none` |
| Marca histórica | `OP02-K4-v1.0 · K4-VALIDATED · CLOSED` (anclada a su línea en el raw) |

Ningún contenido proviene de prompts, memoria, código MVP, OP-01 ni inferencia. La única fuente es la transcripción raw.

## 2. Artefactos

| Artefacto | Rol | Checksum |
| --- | --- | --- |
| `capabilities/OP-02/canonical-baseline.json` | Baseline canónica completa: 329 objetos de 54 tipos, 6 supersesiones, 12 conteos de control, 10 gaps | `sha256:856633be…3c59` |
| `capabilities/OP-02/source.json` | Proyección ejecutable (fuente del pack) | `sha256:75869c57…1120` |
| `knowledge/fixtures/op-02/*.fixture.json` | 10 fixtures de aceptación | — |
| `master.json` | OP-02 `SOURCE_READY`; 2 materializadas / 29 no recuperadas | `sha256:0dd115c8…1f23` |
| `manifest.json` | 2/31 con fuente, 1 publicada, señal `AUTHORITATIVE_SOURCE_REQUIRED` | `sha256:e4e105af…b30f` |
| `reports/OP-02.review.md` | Informe de revisión de gobierno generado | — |

**Baseline canónica vs. proyección ejecutable.** La baseline conserva *todo* el conocimiento de OP-02, incluidos los objetos que el runtime genérico no sabe ejecutar. `source.json` solo proyecta las secciones que el contrato de Knowledge Pack ya admite. Lo que no cabe se registra como `GENERIC_RUNTIME_EXTENSION_REQUIRED`; no se descarta ni se fuerza en otra forma.

## 3. Fidelidad (verificada, no declarada)

`validateCanonicalBaseline` (nuevo, genérico) verifica en cada ejecución del pipeline:

- sha256, longitud y número de líneas del raw.
- Que **cada** valor textual de cada objeto (`fields`, `sourceId`, `status`, procedencia, anotaciones) aparece literalmente dentro de su rango de líneas.
- Que las clases de procedencia pertenecen al vocabulario de la propia fuente: `SOURCE_ASSERTED`, `DIGIWAY_INTERNAL`, `PYMAPA_DERIVED`, `CONTEXTUAL`.
- Que toda referencia `*Ref` resuelve a un objeto existente.
- Que los 12 conteos de control declarados por la fuente coinciden con los objetos materializados (12/12).
- Que la proyección ejecutable solo contiene texto literal en sus claves verbatim y preserva todos los gaps de la baseline.

Tests de rechazo cubren texto reformulado, procedencia inventada, objeto eliminado, raw alterado, gap perdido, texto añadido a la proyección y referencia rota.

## 4. Baseline preservada

| Bloque | Conteo | IDs |
| --- | --- | --- |
| Identidad, pregunta central, frontera, unidad de análisis | 1 / 1 / 1 / 1 | UA-OP02-v0.8 |
| Condiciones de existencia | 5 | OP02-CE01…CE05 |
| Variables aplicadas | 10 | VA01…VA10 |
| Information Needs | 47 | NI-01.1…NI-10.6 |
| Niveles de adquisición / adquisiciones con ID | 5 / 2 | P1…P5 / P1-OP02-01, P1-OP02-02 |
| Evidencia, suficiencia, confianza, severidad | 4 / 4 / 4 / 4 niveles | E0–E3, SUF, C0–C3, S0–S3 |
| Acciones del engine | 7 | REUSE/STOP/FOLLOW/EVIDENCE/CONTRA/DERIVE/NA |
| Reglas diagnósticas | 15 | 10 primarias + 5 guardrails/derivaciones |
| Familias / variantes de hallazgo | 8 / 9 | HF01–HF08; OP02-HF03A/HF03B |
| Derivaciones cross-capability | 6 | — |
| Patrones de intervención | 8 | IP01–IP08 |
| Instrumentos / entregables | 8 / 8 | INS-OP02-01…08 / DEL-OP02-01…08 |
| Done Criteria / capas / estados de ejecución | 15 / 3 / 4 | DC-A/B/C, I0–I3 |
| CRV | 9 | CRV-01…05, CRV-06A, CRV-06B, CRV-07, CRV-08 |
| Efectividad / atribución | 5 / 4 | R0–R4 / AC0–AC3 |
| Validación, follow-up, reassessment, contextualización | 3+1 / 2 / 1 / 7 | FOLLOWUP-OP02-01/02, CTX-OP02-01…07 |
| Fuentes, principios, DoD, quality gates | 17 / 14 / 27 / 4 | SRC-OP02-001…017 |
| Backlog gobernado | 3 | A-OP02-01…03 |
| Candidatos transversales | 12 | — |
| Separaciones semánticas | 10 | Evidence ≠ Observation ≠ Inference ≠ Finding; Activity ≠ Deliverable ≠ Done ≠ CRV ≠ Validation; Implementation ≠ Effectiveness |

Las 6 supersesiones (p. ej. `CE01 · Planificación operativa` → `OP02-CE01 · Planificación y priorización de la ejecución`) conservan el texto anterior y el vigente, ambos anclados.

## 5. Gaps registrados (ninguno bloquea publicación técnica)

| ID | Tipo | Contenido |
| --- | --- | --- |
| GRE-OP02-01 | GENERIC_RUNTIME_EXTENSION_REQUIRED | Los 9 CRV pertenecen a patrones IP, no a Activities. El contrato CRV exige `activityRef` y solo tres condiciones. |
| GRE-OP02-02 | GENERIC_RUNTIME_EXTENSION_REQUIRED | Patrones, instrumentos, entregables, Done Criteria e I0–I3 no tienen contrato en el pack. |
| GRE-OP02-03 | GENERIC_RUNTIME_EXTENSION_REQUIRED | R0–R4, AC0–AC3, decisiones post-validación, follow-up y reassessment de OP-02 no tienen contrato en el pack. |
| GRE-OP02-04 | GENERIC_RUNTIME_EXTENSION_REQUIRED | CTX, S0–S3, C0–C3 y acciones del engine no son ejecutables; el runtime devuelve null sin fórmula. |
| NE-OP02-01 | NOT_EXPLICIT | P2–P5 sin IDs gobernados; no se inventan. |
| NE-OP02-02 | NOT_EXPLICIT | No hay mapeo NI → adquisición ni option set. |
| NE-OP02-03 | NOT_EXPLICIT | Sin criticidad fija ni nivel mínimo fijo de evidencia (dinámicos). |
| NE-OP02-04 | NOT_EXPLICIT | Sin estados semánticos aprobados por VA. |
| NE-OP02-05 | NOT_EXPLICIT | Sin fecha de aprobación del cierre; `approvedAt: SOURCE_CONTENT_NOT_RECOVERED`. |
| NE-OP02-06 | NOT_EXPLICIT | Actividades mínimas de IP01–IP08 y algunos Done Criteria sin IDs. |

## 6. Runtime genérico

**Extensión mínima (capability-neutral):**

- `knowledge-schema`: `criticality` admite `CONTEXT_DEPENDENT`; `minimumEvidence` admite `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`, solo si el requisito es condicional y declara niveles admisibles.
- `knowledge-engine`: un nivel mínimo no explícito devuelve `EVIDENCE_REQUIREMENT_REVIEW_REQUIRED`; el runtime no fija umbrales.
- `knowledge-pipeline`: `canonical-baseline.ts` (validador) y `loadCanonicalBaselines` (descubrimiento por directorio); el CLI y el sellado los incluyen para cualquier capacidad que traiga baseline.

**Sin branching:** un test recorre engine, schema y pipeline y verifica que ninguno contiene `OP-02`/`OP02` como lógica.

**Comportamiento observado con los 10 fixtures:** UNKNOWN, NOT_APPLICABLE (con razón) y CONTRADICTORY se preservan. Una contradicción entre fuentes se detecta sin promediar ni jerarquizar. Todas las reglas son `GOVERNED_JUDGMENT`, así que no hay hallazgos confirmados. Los candidatos quedan en `NEEDS_REVIEW`, sin severidad. Los 10 requisitos de evidencia quedan en revisión.

**Observación para gobierno (sin cambio):** el engine genérico (M1-HIJ) propone un candidato `NEEDS_REVIEW` cuando una variable vinculada tiene *cualquier* observación, incluidas UNKNOWN o NOT_APPLICABLE. Nunca se confirma. Es el mismo comportamiento que en OP-01. Los fixtures lo fijan explícitamente para que un cambio futuro sea visible.

## 7. Gobernanza

- `extractionStatus: APPROVED` se refiere al cierre histórico K4. No se inventó fecha.
- No existe `governance-review.json` ni pack publicado en `knowledge/packs/op-02/`. La única puerta abierta es `GOVERNANCE_REVIEW_PENDING`.
- `taxonomy-registry-6x31.json` no se modificó. Es el snapshot histórico de M2-SOURCE y sigue listando solo OP-01 como materializada; `master.json` registra el estado actual (2 materializadas).
- OP-01: fuente, pack publicado, fixtures y regresión Golden sin cambios (`PUBLISHED`, equivalente al Golden, diff limpio).

## 8. Verificación

| Comprobación | Resultado |
| --- | --- |
| `bun run knowledge:validate` | ✓ sin problemas |
| `bun run knowledge:seal:check` | ✓ identidades selladas |
| `vitest run` | 27 archivos · **614 tests verdes** (+21 de OP-02) |
| `tsgo --noEmit` | sin errores |
| Pipeline | OP-01 PASS/PUBLISHED · OP-02 REVIEW_REQUIRED/VALIDATED · FAIL=0 |

## 9. Conclusión

OP-02 es la segunda capacidad materializada a través del pipeline genérico y ejecutada por el engine genérico, sin lógica específica de capacidad y sin alterar OP-01. El pipeline queda certificado para una capacidad cuya fuente excede el contrato ejecutable actual: el exceso se preserva en la baseline canónica y se declara como `GENERIC_RUNTIME_EXTENSION_REQUIRED` en lugar de perderse o forzarse.

**Pendiente, fuera de alcance:**
1. Revisión humana de gobierno de OP-02 (`governance-review.json`) para publicar `op-02@1.0.0`.
2. Diseño gobernado de las cuatro extensiones genéricas GRE-OP02-01…04: CRV por patrón, contrato de intervención/Done, efectividad/atribución/follow-up y contextualización/severidad/confianza.
3. Fuentes autoritativas de las 29 capacidades restantes.
