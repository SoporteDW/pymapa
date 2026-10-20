## INT-01-COV-03 · BUILD 04 / COV-03D (autorizado)
- [x] A: MEMBER negativas, OWNER/ADMIN decisiones, dos organizaciones QA, concurrencia real y lectura persistida; variantes no ejecutadas delimitadas en informe.
- [ ] B: carga UI y bytes PASS; recorrido del mismo archivo BLOCKED: no versión/extracción/propuesta autenticada sin IA; requiere autorización específica de IA o paquete no-IA.
- [x] C: VARIABLE DG01 VA01 UNKNOWN→KNOWN→UNKNOWN, invalidación append-only; ACQUISITION/NI sin observaciones ficticias.
- [x] D/E: 31 lecturas autenticadas PASS, matriz por nivel, 126 PROPOSED conservadas, 52 NI no enlazadas y plan de 445 adquisiciones sin promover criterios.
- [x] Regresión 1065/1065, 218 hashes sin cambios, evidencia y cierre de 13 secciones: docs/architecture/INT01_COV03_BUILD04_CLOSURE.md — PASS WITH CONDITIONS.
- [ ] A/C aceptación integral restante: variantes OWNER de escritura directa, identidad exclusivamente QA B para lectura inversa y respuesta manual alojada existente; pendientes de paquete QA de cierre, no PASS integral.

## INT-01-COV-03 · BUILD 03 (cerrado PASS WITH CONDITIONS)
- [x] Ciclo de vida, validación canónica y restricción alojada de pilotos a QA autorizado; promoción institucional bloqueada.
- [x] Inventario versionado: 31 capacidades, 448 adquisiciones, 47 NI OP-02 trazables y 126 propuestas PROPOSED Lote 01.
- [x] Harness 28/28, recorridos CM05/OP05 QA, seguridad con lectura posterior y regresión 1065/1065; no se equipara con Gate D.
- [x] Informe persistente: docs/architecture/INT01_COV03_BUILD03_CLOSURE.md — PASS WITH CONDITIONS, 15 secciones.
- [ ] Promoción global y criterios productivos: bloqueados hasta autoridad institucional y autorización humana posterior.
- [x] Aceptación integral COV-03D/BUILD 04 autorizada posteriormente; seguimiento en el bloque BUILD 04.

## INT-01-COV-03 · BUILD 01 (Gate A + piloto Gate B)
- [x] QA-01/QA-02 PASS DEFINITIVO; SEC-QA-01/02 PASS registrados.
- [x] Gate A: registro transversal de criterios auxiliares (PARTIAL_ONLY por defecto).
- [x] Gate B piloto CM-05 / ACQ·P1·01: cobertura de adquisición sin observación (unitarias + RPC alojada).
- [x] Descuento visible CM-05 en QA limpia: aceptación E2E-CM05-01 recibida; corroborado BUILD 03 con ACQ·P1·01 → P1·02 → P1·01 y cero observaciones.
- [x] COV-03C · BUILD 02: piloto OP-05, contrato maestro, Gate C PASS WITH CONDITIONS (docs/architecture/INT01_COV03_BUILD02_CLOSURE.md).
- [x] COV-03D / BUILD 04 autorizado posteriormente; seguimiento en el bloque BUILD 04.

# Roadmap

## INT-01-COV-QA · QA-01 + QA-02 only
- [x] Versioned governed auxiliary criteria and structured declaration for DG-01 / ACQ·NI04 only.
- [x] Additive persistence, audit, authorization, evidence validation and stale/retry safety.
- [x] Synthetic QA02 bank, OWNER QA browser and full regression (1014/1014); hosted MEMBER/vigency negatives not claimed.
- [x] Ten-section closure report: PASS WITH CONDITIONS; no COV-03 implementation or protected changes.
- [ ] Hosted MEMBER/two-org RLS and stale-evidence QA: blocked pending authorization for additional identities/QA changes.
- [ ] Reconcile original QA02-01..05 definitions: blocked pending source report not materialized in repository.

## M2-OP02-02 · Generic Runtime Compatibility Closure
- [x] Cerrado (ver docs/architecture/M2_OP02_RUNTIME_COMPATIBILITY_CLOSURE.md)

## M2-OP02-03 · Pre-Publication Integrity Closure
- [x] Cerrado (ver docs/architecture/M2_OP02_PREPUBLICATION_INTEGRITY_CLOSURE.md)

## M2-FACTORY-01 · Knowledge Factory Transition + OP-02 Closure
- [x] Cerrado (ver docs/architecture/M2_KNOWLEDGE_FACTORY_TRANSITION.md) · KNOWLEDGE_FACTORY_READY_FOR_BATCH_01

## M2-BATCH-01 · OP-02 Publication + OP Domain Industrialization
- [x] OP-02 publicado (op-02@1.0.0) con autorización humana registrada
- [x] OP-03/04/05 registrados, candidatos extraídos, validados → REVIEW_REQUIRED
- [x] Reporte docs/architecture/M2_BATCH01_OP_DOMAIN_INDUSTRIALIZATION.md · FACTORY_TRACTION_PARTIAL

## M2-BATCH-01R · Governed Supersession Resolution
- [x] Resolver genérico de supersesión + decisiones de gobierno (cierres, conteos, backlog OP-03)
- [x] Registro cross-capability (A-OP02-02 KEEP_OPEN, BOUND-OP05-02 CONDITION_MET)
- [x] Re-run del lote: 72 → 37 IDs ambiguos · reporte M2_BATCH01_SUPERSESSION_RESOLUTION.md · FACTORY_TRACTION_PARTIAL

## M2-FACTORY-CLOSURE (FACTORY_NOT_READY_FOR_FINAL_MASS_BATCH)
- [x] Etapa genérica baseline→source→pack (runnable-projection.ts) + tests
- [x] Identidad OP-03/04/05: NON_SEMANTIC_METADATA_ENRICHMENT, aceptación preservada
- [x] Extracción de filas de tabla (PC-02: 8 CRV)
- [x] DG-03 / PC-01 / PC-02 decisiones aplicadas; DG/PC 10 baselines aceptadas
- [ ] GRE-CRITICALITY-NOT-EXPLICIT — espera decisión de arquitectura (extensión genérica del Engine)
- [ ] Captura de definición de capacidad y capa de adquisición (P1–P5 ↔ VA) — próximo ciclo de Factory
- [ ] Activación en la aplicación — espera orden explícita

## M2-FACTORY-CONTRACT-03
- [x] Criticidad NOT_EXPLICIT admitida; evidencia mínima NOT_EXPLICIT admitida
- [x] Extracción genérica de definición (literal, calificador productivo)
- [x] Adquisición por NI; preguntas literales opcionales; etapas contextuales
- [x] Vínculo NI→VA por contención estructural
- [x] 13/13 packs generados; OP-03/04/05 publicados; DG/PC retenidos
- [ ] DG/PC: vínculo NI↔VA — bloqueado por decisión de gobierno de fuente (correspondencia NI_n↔VA_n no explícita)

## M2-FINAL-MASS-BATCH (M2_KNOWLEDGE_INDUSTRIALIZATION_INCOMPLETE)
- [x] DG-01..05 y PC-01..05 publicados (GOVERNED_STRUCTURAL_MAPPING)
- [x] DT-01..06, CM-01..06, EC-02..05 registrados, extraídos, aceptados y con baseline canónica (16/16)
- [x] Vocabulario de provenance nativo (EC-05: SOURCE_REVIEW_TRIGGER, sin clases declaradas)
- [x] Conteos declarados sin enumeración (DECLARED_NOT_ENUMERATED) · DT-04 CRV tipados
- [x] DT-01 publicado (tabla NI01–NI16 bajo «Information Needs»)
- [ ] DT-02..06, CM-01..06, EC-02..05 (15): la fuente declara «Resultan N NI» sin enumerarlas → sin camino de adquisición por VA; espera decisión humana/fuente
- [ ] Activación en la aplicación — espera orden explícita

## M2-FINAL-15 (M2_KNOWLEDGE_31_OF_31_INDUSTRIALIZED)
- [x] GOVERNED_STRUCTURAL_CORRESPONDENCE (DT-02/03/06) y CAPABILITY_PROGRESSIVE (12) genéricos
- [x] 15 publicadas @1.0.0; 31/31 PUBLISHED; 774/774 tests
- [x] PILOT-READY-01 · PKG-01 runtime/API genérico 31 capacidades
- Siguiente (no iniciado): PKG-02 journey/UI dinámica · PKG-03 resultados · PKG-04 ejecución/validación

- [x] SPRINT-04-FIX code complete — pending human acceptance (delegated respondent, evidence upload, mobile)

## UX-PROD-FIX-02 · Unified Product Journey
- [x] Six workstreams + acceptance tests (docs/architecture/UX_PROD_FIX_02_UNIFIED_JOURNEY.md)
- [ ] Human acceptance (correction in browser, invited respondent, mobile, published domain) — waits on user

## UX-PROD-FIX-03 · Business UX Clarity
- [x] Workstreams 1–6 + #7 E2E business acceptance (docs/architecture/UX_PROD_FIX_03_BUSINESS_UX_CLARITY.md)
- [ ] Aceptación humana (CM-05/DG-02 en Digiway, móvil completo)

## DF-QA-IA-DG01 + P5–P7
- [x] Etapa 1 QA navegador IA DG-01 (org QA)
- [x] P5/P6 persistencia candidata + revisión humana gobernada
- [x] CM-05 aclaraciones separadas por adquisición
- [x] P7 aislamiento/RLS/regresión (957/957)
- [ ] Admisión NI→adquisición / suficiencia — pendiente de regla de gobierno
- [ ] Usuario MEMBER de QA para probar rechazo de rol — pendiente de cuenta

## INT-01 E2 · Authorized scope only
- [x] Connect conservative factual coverage to evaluation, workspace and handlers.
- [x] Implement independent same-organization CANDIDATE reuse with lineage and retry safety.
- [x] Run synthetic E2 tests and full regression suite: 984 PASS; report in docs/architecture/INT01_E2_CLOSURE.md.
- [ ] Documentary COMPLETE subtraction / T-E2-01 — blocked by absent canonical acquisition-completeness criteria; no rules invented.
- [ ] Hosted E2 endpoint, RLS and browser acceptance — not executed in E2; requires isolated QA acceptance scope before operational PASS.
- E3 cerrado: PASS WITH CONDITIONS (integración) / BLOCKED BY CANONICAL CONTRACT (cobertura). Informe: docs/architecture/INT01_E3_CLOSURE.md. INT01-COVERAGE-GAP-01 abierto. Esperar autorización antes de nuevas fases.
