## PYM-NOV-MVP31 · Instrucción consolidada (DEC-053/054)
- [x] DEC-054: preguntas operativas versionadas (DEC-054/1.0.0) para las 337 adquisiciones sin pregunta literal; trazabilidad questionId/wordingVersion en cada respuesta, derivada en servidor.
- [x] DEC-053: análisis asistido IA (29 capacidades) con 5 categorías, registro append-only y revisión con nota; solo empresas sintéticas autorizadas (DEC-047). Pendiente: prueba en pantalla con Qhapaq.
- [x] Suficiencia 2.0.0: SUFICIENTE solo por confirmación humana sin contradicción.
- [ ] Escenario B: esperando correo secundario real confirmado por Josefo (opción A).
- [ ] Plan de Transformación integral.
- [x] Suficiencia documental SUFICIENTE/PARCIAL/AUSENTE y posibles contradicciones en /expediente (mvp31-sufficiency-1.0.0, presencia literal, 6 pruebas PASS).
- [ ] Escenario B empresa nueva: bloqueado, una organización por usuario (RLS organizations_insert_bootstrap + bootstrap_organization); decisión pendiente: alias de cuenta dedicada vs. RPC multiempresa con selector.
- [ ] Expediente sintético Qhapaq reforzado (datos medibles, vacíos y contradicciones deliberados); Escenario B con empresa nueva desde cero.
- [ ] Aislamiento bilateral con filas presentes en ambas organizaciones.
- [x] Cuenta demo jose.diaz@digiwaycorp.com verificada en solo lectura: identidad confirmada, acceso por correo habilitado, OWNER de Digiway Corp, cero autoridades EPAR/Gobierno; datos anteriores intactos. QA Qhapaq solo automatizada; identidad institucional excluida. Informe MVP31_DEMO_ACCOUNT_VERIFICATION.md.
- [ ] Acceso personal: pendiente de inicio con contraseña existente; recuperación no implementada. Segunda empresa limpia para esta identidad: bloqueada por regla actual de una organización por usuario; requiere autorización para resolver sin alterar Digiway Corp.
- [ ] Plan de Transformación aceptar/modificar/descartar; Escenario A; informe final.

## PYM-NOV-B02 · Evaluación Profesional Asistida y Registrada
- [x] Identificar reutilización y resolver designación exclusiva por Gobierno de PYMAPA, sin autodeclaración.
- [x] Implementar EPAR append-only, autoridad por alcance/vigencia y revocación, revisión histórica, servidor/RLS y permisos mínimos en dos migraciones aditivas.
- [x] Integrar panel EPAR en OP-01 y ruta genérica de las otras 30 capacidades, sin cambiar Engine ni diagnóstico.
- [x] Verificar 56 pruebas EPAR, 137 focales y regresión 1322/1322; 233 huellas históricas intactas. QA A/B: 34 negativas/lecturas vacías PASS; informe único BLOCKED.
- [ ] Aceptación positiva alojada: bloqueada por ausencia de identidad de Gobierno designada y designaciones profesionales QA A/B; faltan creación→lectura UI→revisión→supersesión y aislamiento con filas EPAR no vacías. No inventar autoridad.
- [ ] Pendientes heredados: seguridad de Storage binario y ADMIN alojado QA B; requieren comprobación específica, sin documentos empresariales reales.

## PYM-NOV-B01-FIX · Corrección localizada autorizada
- [x] Restaurar frontera DG-01 mediante núcleo experimental `.server.ts`, procedencia neutral y tipo RPC, sin cambiar AUTORIZADOS, assertions ni contratos productivos.
- [x] Arquitectura 7/7, frontera 2/2, regresión 1266/1266 y captura/recuperación en memoria 31/31; siete escenarios del piloto verificados en preview.
- [ ] Renovar recuperación alojada 31/31, aislamiento bilateral e IDOR con QA A/B: NOT_TESTED, faltan sesiones de las identidades QA; restauración --self sin cuenta correspondiente.
- [x] Integridad 217 archivos iniciales y 233 históricos sin cambios; informe PYM_NOV_B01_FIX_RESULT.md, VAR-05 PASS, propuesta BLOCKED por evidencia alojada; no ACCEPTED ni B02/B03.

## PYM-NOV-B01 · Captura transversal de 31 capacidades
- [x] Ajustar captura genérica y distinguir preguntas literales de solicitudes estructuradas; corregir UNKNOWN/NOT_APPLICABLE vacío en cliente OP-01.
- [x] Verificar 31/31 capturas y recuperación en sesión nueva, 31 evidencias con contexto, aislamiento QA B → QA A y 233 hashes intactos.
- [x] Entregar matriz, controles y cierre PYM_NOV_B01_CLOSURE.md: BUILD BLOCKED; 1263 PASS / 1 FAIL previo de arquitectura DG-01.
- [ ] Aceptación integral espera Gate 02 y aislamiento bilateral/IDOR alojado; infracciones DG-01 corregidas en B01-FIX sin excepciones artificiales. Bytes y login manual siguen pendientes fuera del FIX. B02/B03 no iniciados.

## DEC-049 · DG01-VERTICAL-01 · Piloto aislado
- [x] Crear candidato separado y evaluador con Engine real 0.2.0, sin escrituras productivas ni IA.
- [x] Ejecutar cinco escenarios y mostrar candidatos sin confirmación ni inferencias semánticas: 9/9 pruebas PASS.
- [x] Verificar interfaz (cinco ejecuciones, sin errores, 659 px sin desbordamiento), 208 hashes protegidos intactos y cierre DG01_VERTICAL01_CLOSURE.md.
- [ ] Validación semántica positivo/adverso: bloqueada por ausencia de predicado gobernado; fuera de este Build.

## PYM-BETA-INT-01-ACT · Plan de Acción consolidado
- [x] getCompanyActionPlan (RLS como usuario), pantalla /plan-de-accion, navegación, pruebas 1120/1120.
- [ ] Evidencia alojada con actividades reales de varias capacidades en org QA: NOT_TESTED (cuenta actual sin actividades).
- [ ] Seguimiento: fuera de alcance, requiere mandato posterior.

## DEC-046 · PRESC-OP01-H04 0.3.0
- [x] Complete hosted security/isolation addendum (2026-10-21): bilateral RLS, MEMBER/anonymous, OWNER lock and parallel idempotency PASS; definitive report DEC-046_HOSTED_SECURITY_FINAL.md — PASS WITH CONDITIONS.
- [x] Preserve original dossier and record subsequent content approval separately.
- [x] Implement server-owned complementary evaluator, evidence guards, append-only history and blocked emission.
- [x] Execute synthetic T01–T12, MEMBER/cross-org security and regression 1114/1114; report DEC-046_PRESC_OP01_H04_CLOSURE.md — PASS WITH CONDITIONS.
- [x] Parallel hosted concurrency: eight identical calls, one persisted ID; mismatched request reuse rejected.
- [ ] Positive hosted candidature / factual revocation / ADMIN own eligible H04 / persisted cross-org history reference: NOT_TESTED; needs authorized synthetic fixtures/functional verification, no forced business states.
- [ ] Effective table grants exceed explicit migration grants; RLS/trigger protection verified, least-privilege review requires subsequent technical authorization.
- [ ] Publication/activation/emission: blocked pending subsequent Government authorization.

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
- [x] INT-01-COV-03 cierre controlado: V1/V2/V3 ejecutadas, anexo en BUILD04 closure
- [x] SEM-QA-01: guarda fail-closed, pruebas de seguridad y 5 escenarios IA (PASS WITH CONDITIONS; S2 clasificación)

## SEM-QA-01 · Corrección focalizada autorizada
- [x] Instrucciones 1.2.0 generales; ambigüedad no admisible y desviación histórica 1.1.0 documentada.
- [x] S6–S8 canónicos, corpus extendido con procedencia/checksums y S1–S5 intactos.
- [x] Seguridad/regresión 1086/1086 y tres corridas independientes S1/S2/S6/S7; S8 negación PASS.
- [x] Registro stability-runs.json y cierre actualizado: S1/S7 3/3; S2/S6 0/3, corrección FAIL / SEM-QA PASS WITH CONDITIONS.
- [ ] Brecha inferencia y ratificación histórica 1.1.0: requieren decisión y autorización humana; intervención única terminada, sin nuevos ajustes.

- [x] PYM-BETA-INT-02-SEG · Seguimiento empresarial consolidado (/seguimiento)

## PYM-NOV-MVP31 · Recuperación integral (7 días)
- [x] Optimización conservadora sobre los mismos 5 PDF: 207→249 adquisiciones con cita candidata (46,2→55,6 %), 75→96 confirmadas; inventario literal de 199 faltantes. Objetivo 85–90 % no alcanzado, sin relleno ni inferencias.
- [x] Confirmación por capacidad en lotes paralelos, una evaluación final por capacidad y trazabilidad individual; 8/8 en 9,94 s, recarga UI y 28 pruebas focales PASS; regresión 1338/1338.
- [x] Aislamiento bilateral repetido tras confirmaciones: 32 PASS, 0 FAIL; bytes PDF denegados en ambos sentidos, resultados/respuestas/documentos protegidos. Dos positivos sin fixture persistido en Qhapaq, explícitos en informe MVP31_OPTIMIZATION_REPORT.md.
- [ ] Mejorar cobertura y precisión con nuevos documentos sintéticos sustanciados: faltan 199 datos sin cita; 153 propuestas pendientes requieren revisión (coincidencia ≠ respuesta).
- [x] Escenario B: expediente documental transversal 31/31 (carga única, citas literales, confirmación agrupada, pendientes por capacidad); E2E con empresa nueva QA Qhapaq.
- [x] Acelerar confirmación agrupada: lote final observado 1,24 s por respuesta; no extrapolar al total de 448 ni ocultar rechazos del pack.
- [ ] Frente A · preguntas redactadas para las 18 capacidades sin pregunta literal: bloqueado, los textos fuente no traen preguntas por necesidad; requiere aprobación de Gobierno de la redacción.
- [ ] Vía de análisis asistido por IA (29 capacidades): bloqueada por DEC-053 y lectura con IA detenida (SEM-QA-01).
- [ ] Tablero 6D/31C, plan de transformación y Escenario A precargado.
