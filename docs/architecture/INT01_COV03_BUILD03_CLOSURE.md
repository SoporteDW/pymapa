# PYMAPA · INT-01-COV-03 · BUILD 03 — Informe técnico de cierre

Fecha UTC: 2026-10-20. Alcance: autorización BUILD 03 v1.0; no BUILD 04 ni COV-03D.

## 1. Resumen ejecutivo y dictamen Gate D

**BUILD 03: PASS WITH CONDITIONS. Gate D de COV-03D: NOT_STARTED / NO AUTORIZADO.** No se equipara el harness de BUILD 03 con la aceptación integral futura de Gate D.

Implementados: ciclo de vida auxiliar fail-closed, validación canónica, autorización alojada de pilotos QA, inventario de 31 capacidades, 126 propuestas y harness de cuatro arquetipos. Persistencia confirmada: 448 adquisiciones, 1 criterio APPROVED, 2 PILOT_TEST_GOVERNED, 126 PROPOSED y 126 eventos de propuestas. CM-05 y OP-05 completaron PARTIAL → FULL desde panel → reintento idempotente → revocación, sin observaciones ni respuestas.

Condiciones: autoridad institucional de promoción productiva pendiente; propuestas requieren revisión humana; recorrido documental integral no verificado de extremo a extremo en BUILD 03; seguridad MEMBER nueva y concurrencia verdaderamente paralela no reejecutadas en este bloque. No hay suficiencia ni cierre diagnosticados por cobertura.

**Hechos** se sustentan en artefactos/pruebas citados; **propuestas** no activan FULL; **decisiones** son las autorizaciones humanas recibidas. Compatibilidad técnica no equivale a cobertura semántica completa.

## 2. Decisiones de gobierno aplicadas

- DEC-COV03-01: DG01-NI04-COV-1.0.0 conserva APPROVED; CM05-P101-COV-1.0.0 y OP05-VA01-L254-COV-1.0.0 conservan PILOT_TEST_GOVERNED.
- DEC-COV03-02: FULL atómico a adquisición; nunca se propaga a variables o hermanas. ACQUISITION no crea observación ficticia.
- DEC-COV03-03: OP-02 conserva 47 NI sin adquisición explícita; se registra impacto no supuesto cero y admisibilidad factual condicional, sin inventar relaciones.
- PROPOSED jamás habilita FULL. OWNER/ADMIN gobierna decisiones de su organización, no el catálogo global.
- Piloto exige autorización almacenada y activa: organización + assessment + conocimiento + capacidad + adquisición + versión de criterios, synthetic_qa=true. El cliente no puede concederla.
- Promoción global bloqueada hasta autoridad institucional explícita. Un resultado técnico PASS no promueve criterios.

## 3. Archivos y migraciones

Implementación y regresión:

- `src/lib/production/coverage-criteria.ts`: lifecycle/eligibilidad.
- `src/lib/production/coverage-canonical.server.ts`: validación e inventario desde packs checksum-verified.
- `src/lib/production/structured-coverage.ts`: elegibilidad de criterios al validar FULL.
- `src/lib/production/documentary-coverage.ts`: proyección fail-closed con autorización QA.
- `src/lib/production/runtime.server.ts`: lectura de autorizaciones alojadas y cálculo contextual de coveragePilotAuthorized.
- `src/lib/production/puertos.ts`: dato contextual de autorización en mapping.
- `src/lib/production/capability-handlers.ts`: traslado del contexto de cobertura al panel.
- `src/components/capacidad/cobertura-documental-panel.tsx`: disponibilidad de solicitud FULL según contexto elegible.
- `src/lib/production/coverage-build03.test.ts`, `cov03-cm05-pilot.test.ts`, `cov03-op05-pilot.test.ts`, `arquitectura.test.ts`: harness/regresión/allowlist.
- `scripts/coverage-build03.ts`: generación de inventario y propuestas, no extracción semántica automatizada.
- `AGENTS.md`, `src/lib/production/AGENTS.md`, `roadmap.md`: decisiones y seguimiento.
- `src/routes/index.tsx`: metadatos og:type/twitter:card faltantes, sin cambio del recorrido ni diagnóstico.

Migraciones aditivas aplicadas:

- `drizzle/migrations/0008_cov03_build03_governed_criteria.sql`: cuatro tablas auxiliares con GRANT/RLS, baseline de tres criterios, lifecycle protegido, eventos append-only y guard de cobertura.
- `drizzle/migrations/0009_cov03_build03_guard_target_cast.sql`: corrección puntual del cast enum/text en el guard (error 42883 observado). Sin cambios del diagnóstico.

Tipos de la integración fueron regenerados por la herramienta, no editados manualmente. El generador produjo SQL de carga canónica/propuestas en `/tmp/cov03-build03/canonical-seed.sql`, aplicado a las tablas auxiliares. Los inventarios persistentes permiten reproducir esos valores; no son filas demo sembradas al cargar una página.

Artefactos: `docs/coverage/build03/{canonical-inventory.v1.0.0.json,criteria-lote01.proposed.v1.0.0.json,op02-needs.v1.0.0.json}`; evidencia en `docs/evidence/cov03-build03/`.

## 4. Contratos implementados

Identidad de criterio: `(knowledgeVersionId, capabilityId, acquisitionRef, coverageCriteriaVersion)`. Se verifica capacidad y adquisición reales del pack publicado, conocimiento esperado, unicidad, versión/referencia no vacías y componentes obligatorios con claves únicas. Las colisiones entre capacidades no autorizan reutilizar un criterio.

Catálogo alojado: `coverage_criteria_catalog`; identidades canónicas: `coverage_canonical_acquisitions`; autorización QA: `coverage_pilot_authorizations`; eventos: `coverage_criteria_events`. Usuarios autenticados leen metadatos globales, pero no pueden promover/escribir criterios; autorizaciones solo visibles para miembros de la organización correspondiente.

PROPOSED → PILOT_TEST_GOVERNED → APPROVED está representado como estados y preparación de contrato, **no como transición productiva abierta**: UPDATE global bloqueado por guard y falta autoridad institucional. Se permiten nuevas propuestas auditadas, no promoción por OWNER/ADMIN.

`set_structured_acquisition_coverage` conserva el contrato estructurado: mapping VALIDATED, cita literal existente, componentes completos, confirmaciones humanas, vigencia, ausencia de conflicto, revisión esperada e idempotencia. El guard alojado impide FULL piloto sin autorización exacta; se observó HTTP 400 PILOT_QA_AUTHORIZATION_REQUIRED en ambos pilotos antes de autorizar.

La proyección de cobertura solo afecta answeredAcquisitionRefs/pendientes. VARIABLE factual sigue su puente independiente y validación del Engine. FULL histórico sin evaluación estructurada no es cobertura verificada. La validación literal/estructural y la certificación humana no constituyen semántica automatizada.

## 5. Inventario verificable de 31 capacidades

Fuente: packs publicados a través del registro estático checksum-verified. Totales: **31 capacidades, 448 adquisiciones; arquetipos 11/3/12/5**. NI=0 significa lista explícita no materializada en el pack, no ausencia conceptual de necesidades. “NI sin ACQ” se cuenta mediante relaciones explícitas, no ordinales ni texto similar.

| Capacidad | Arquetipo | VA | NI explícitas | ACQ | NI sin ACQ explícita | Propuestas |
|---|---|---:|---:|---:|---:|---:|
| OP-01 | OPERATIONAL_MIXED | 10 | 6 | 12 | 5 | 0 |
| OP-02 | OPERATIONAL_MIXED | 10 | 47 | 2 | 47 | 0 |
| OP-03 | OPERATIONAL_MIXED | 8 | 37 | 42 | 0 | 1 |
| OP-04 | OPERATIONAL_MIXED | 9 | 55 | 60 | 0 | 0 |
| OP-05 | OPERATIONAL_MIXED | 10 | 64 | 64 | 0 | 0 |
| DG-01 | ONE_TO_ONE | 9 | 9 | 9 | 0 | 0 |
| DG-02 | ONE_TO_ONE | 10 | 10 | 10 | 0 | 10 |
| DG-03 | ONE_TO_ONE | 10 | 10 | 10 | 0 | 10 |
| DG-04 | ONE_TO_ONE | 10 | 10 | 10 | 0 | 10 |
| DG-05 | ONE_TO_ONE | 12 | 12 | 12 | 0 | 12 |
| PC-01 | ONE_TO_ONE | 11 | 11 | 11 | 0 | 11 |
| PC-02 | ONE_TO_ONE | 13 | 13 | 13 | 0 | 13 |
| PC-03 | ONE_TO_ONE | 14 | 14 | 14 | 0 | 14 |
| PC-04 | ONE_TO_ONE | 14 | 14 | 14 | 0 | 14 |
| PC-05 | ONE_TO_ONE | 15 | 15 | 15 | 0 | 15 |
| DT-01 | ONE_TO_ONE | 16 | 16 | 16 | 0 | 16 |
| DT-02 | STRUCTURAL | 17 | 0 | 17 | 0 | 0 |
| DT-03 | STRUCTURAL | 17 | 0 | 17 | 0 | 0 |
| DT-04 | PROGRESSIVE | 18 | 0 | 5 | 0 | 0 |
| DT-05 | PROGRESSIVE | 22 | 0 | 5 | 0 | 0 |
| DT-06 | STRUCTURAL | 23 | 0 | 23 | 0 | 0 |
| CM-01 | PROGRESSIVE | 21 | 0 | 6 | 0 | 0 |
| CM-02 | PROGRESSIVE | 22 | 0 | 6 | 0 | 0 |
| CM-03 | PROGRESSIVE | 23 | 0 | 6 | 0 | 0 |
| CM-04 | PROGRESSIVE | 21 | 0 | 6 | 0 | 0 |
| CM-05 | PROGRESSIVE | 23 | 0 | 7 | 0 | 0 |
| CM-06 | PROGRESSIVE | 24 | 0 | 6 | 0 | 0 |
| EC-02 | PROGRESSIVE | 21 | 0 | 7 | 0 | 0 |
| EC-03 | PROGRESSIVE | 23 | 0 | 8 | 0 | 0 |
| EC-04 | PROGRESSIVE | 24 | 0 | 7 | 0 | 0 |
| EC-05 | PROGRESSIVE | 26 | 0 | 8 | 0 | 0 |

El artefacto completo incluye IDs, relaciones, preguntas/textos literales, cardinalidad por adquisición, criterios existentes, adquisiciones sin criterios, checksum/versiones y brechas. 445 de 448 adquisiciones no tienen criterios elegibles existentes. OP-01 registra además cinco NI sin vínculo explícito según esta lectura conservadora; no se han creado relaciones adicionales.

## 6. Catálogo de propuestas Lote 01

**126 PROPOSED**: DG02=10, DG03=10, DG04=10, DG05=12; PC01=11, PC02=13, PC03=14, PC04=14, PC05=15; DT01=16; OP03=1.

Cada entrada tiene adquisición exacta, texto original, versión/checksum y referencia del pack, componentes propuestos, tipo de evidencia, insuficiencias, justificación y NEEDS_GOVERNANCE_REVIEW. Las 125 propuestas 1:1 usan el requerimiento literal específico como punto de partida, **no como criterio semántico completo**: gobierno debe definir alcance/exhaustividad y condiciones de respaldo. No se reutilizan los cinco componentes DG01-NI04 en otras preguntas.

OP-03: `P1-OP03-02`, pregunta literal «Pensemos en un caso reciente real. Desde que comenzó hasta que terminó, ¿por qué personas, áreas, procesos o sistemas fue pasando?». Componentes propuestos: caso reciente real; recorrido de inicio a fin; personas/áreas/procesos/sistemas involucrados. Sus seis variableRefs se conservan; ningún componente les asigna un valor. Es una **propuesta de futuro piloto 1:N**, no un piloto autorizado ni una prueba alojada de FULL.

## 7. Estados de aprobación reales

| Registro | Estado alojado y runtime | FULL |
|---|---|---|
| DG01-NI04-COV-1.0.0 | APPROVED | Condicionado a controles y evidencia |
| CM05-P101-COV-1.0.0 | PILOT_TEST_GOVERNED | Solo QA exacta autorizada |
| OP05-VA01-L254-COV-1.0.0 | PILOT_TEST_GOVERNED | Solo QA exacta autorizada |
| 126 Lote 01 | PROPOSED | Nunca |
| Resto sin criterio | PARTIAL_ONLY | Bloqueado |

Consulta alojada posterior a intento OWNER de promoción: permanecen 1 APPROVED / 2 PILOT_TEST_GOVERNED / 126 PROPOSED. No hay promoción productiva. Los dos mappings QA terminaron SUPERSEDED/PARTIAL/revisión 3.

## 8. Pruebas parametrizadas y recorridos QA

`coverage-build03.test.ts`: **28/28 PASS** (4 validaciones globales + 6 casos por cada arquetipo DG02/DT02/CM05/OP03). Fixtures elegibles solo mediante mock aislado; nunca se insertó un APPROVED sintético global.

| Requisito | Nivel verificado y resultado |
|---|---|
| Pendiente → FULL atómico → revocación | Unitario, cuatro arquetipos: PASS; navegador CM05/OP05: PASS |
| Incompleta permanece PARTIAL | Unitario y RPC alojada CM05/OP05: PASS |
| Cita inexistente | Unitario: PASS; regresión de pilotos: PASS |
| FULL exige criterio elegible | Unitario + RPC piloto no autorizado 400: PASS |
| Cero observaciones / variables sin cambio | Unitario compara variableEvaluations; alojado 0 observaciones y 0 respuestas antes/después: PASS para no creación; nueva lectura de todas las variables alojadas no añadida |
| Reintento idempotente | RPC alojada: revisión 2 conserva revisión 2, PASS |
| Historial/revocación | Unitario conserva mapping; alojado SUPERSEDED/PARTIAL/rev3, PASS; evidencia de auditoría detallada anterior no sustituida |
| OWNER/ADMIN vs MEMBER | Unitario: PASS; nueva ejecución MEMBER alojada BUILD03: NOT_TESTED; aceptación SEC-COV03-01 anterior es antecedente, no nuevo resultado |
| Org/capacidad/conocimiento | Unitario fail-closed: PASS; lectura alojada cross-org de autorizaciones vacía: PASS |
| Referencias inexistentes / PROPOSED | Validador y harness: PASS |
| Pilotos solo QA autorizada | Ambos RPC sin autorización 400 y FULL autorizado desde navegador: PASS |
| Paralelismo real | NOT_TESTED en BUILD03; reintento secuencial no es concurrencia paralela |

QA usada: organización `9816dfad-a1be-4140-8293-c4cab34f3603`, assessment `c71d7b34-9da0-4755-8394-418172412731`, OWNER QA sintético. Mapping CM05 `b0300000-0000-4000-8000-000000000014`; OP05 `b0300000-0000-4000-8000-000000000024`.

CM05: FULL muestra siguiente ACQ·P1·02; revocación restituye ACQ·P1·01, cero respuestas. OP05: FULL declarado para L254; revocación muestra «64 de 64» y problema/oportunidad pendiente. Atomicidad también cubierta por regresión/harness; no se asignó VA01. Capturas `*-full.png`, `*-revoked.png`, `*-partial.png`, `*-unauthorized.png` revisadas. `e2e-results.json` registra cero errores de página y observaciones 0→0 en ambos.

## 9. Seguridad y regresión

- OWNER intento PATCH de promoción: **HTTP 204 vacío**, NO significa promoción. Lectura privilegiada posterior confirma CM05 sigue PILOT_TEST_GOVERNED y conteos intactos. PASS para no alteración; no se afirma rechazo HTTP 400.
- OWNER autoautorizar QA: HTTP 403/RLS, PASS.
- Lectura autorizaciones de otra org: HTTP 200 con `[]`, PASS.
- OWNER DELETE eventos: HTTP 204 vacío; eventos permanecen 126, PASS para no eliminación. No se infiere permiso por código 204.
- Anónimo: HTTP 200 sin acceso a filas; el script comprueba respuesta vacía, no un código 403 obligatorio.
- Pruebas afectadas finales: 51/51 PASS (BUILD03 28, CM05 9, OP05 14). Arquitectura + BUILD03: 35/35 PASS.
- Regresión completa: **53 archivos / 1065 pruebas PASS**; `regression-final.log` conserva salida. La corrección de tupla `as const` elimina el error TS2345 en el harness; señal posterior del preview: build OK (2026-10-20 01:32:54 UTC).
- Hash SHA-256 de 218 archivos protegidos: **0 cambios** (Master, packs, Engine y demo Document-First). Lista `protected-baseline.sha256.json`. No IA externa ni documentos reales, publicación o cambios en Digiway.

Los scripts de evidencia contienen rutas a la sesión local, no tokens ni credenciales; requieren preparar sesión legítima y fixtures QA. No constituyen un harness portable completo por sí solos.

## 10. Situación de las 47 NI de OP-02

Artefacto individual: `op02-needs.v1.0.0.json`. 47 entradas conservan texto, sourceLines, variableRefs, acquisitionRefs declarados y límites. OP02 mantiene 10 VA y solo `P1-OP02-01` / `P1-OP02-02`; ninguna de las 47 NI se enlaza explícitamente con estas adquisiciones.

Se listan candidatos de adquisición por intersección con variableRefs **solo como posible vía de investigación factual**, no como relación NI↔ACQ. Para todas: evidencia sintética específica NONE, evidencia real NOT_EVALUATED; admisión CONDITIONALLY_NOT_ADMITTED. Una observación factual podría ser admitida únicamente con mapping VARIABLE VALIDATED, correspondencia factual canónica explícita independiente y validación Engine. No se demuestra que una NI concreta esté satisfecha por el mero solapamiento de referencias.

Las variables no declaran semanticStates en el pack; responseModel es free_statement_or_unknown. Esto no autoriza inventar umbrales ni transformar texto temático en valor diagnóstico. No hay regla completa de satisfacción/suficiencia de estas 47 NI. Su impacto diagnóstico queda **indeterminado, no cero**; permanecen trazables, sin adquisiciones artificiales y sin FULL documental derivado.

## 11. Matriz del recorrido documental integral

Los estados reflejan evidencia por etapa, no un PASS integral de documento→diagnóstico en BUILD03.

| Etapa | Estado | Evidencia/límite |
|---|---|---|
| Documento cargado | IMPLEMENTED_PARTIALLY_VERIFIED | Flujo existente y demo previo; BUILD03 usa fixtures QA ya preparados, no sube un nuevo documento por UI |
| Extracción literal | IMPLEMENTED_PARTIALLY_VERIFIED | Implementación previa; no nueva extracción/IA en BUILD03 |
| Fragmento citado | IMPLEMENTED_AND_E2E_VERIFIED | Fragmentos sintéticos visibles en panel y citas admitidas |
| Propuesta de mapping | IMPLEMENTED_PARTIALLY_VERIFIED | Contrato existente; fixtures de este bloque preparados mediante canal privilegiado QA |
| Validación humana mapping | IMPLEMENTED_PARTIALLY_VERIFIED | Mappings VALIDATED existentes/RPC; no secuencia completa de UI desde propuesta nueva |
| Cobertura de adquisición | IMPLEMENTED_AND_E2E_VERIFIED | FULL desde panel OWNER y persistencia CM05/OP05 |
| Preguntas pendientes | IMPLEMENTED_AND_E2E_VERIFIED | CM05 ACQ01→ACQ02→ACQ01; OP05 restitución L254 |
| Admisión factual cuando corresponde | IMPLEMENTED_PARTIALLY_VERIFIED | Puente R1 existente/regresión; pilotos ACQUISITION deliberadamente crean 0 observaciones |
| Evaluación de variables | IMPLEMENTED_PARTIALLY_VERIFIED | Engine existente y comparaciones unitarias; no nueva admisión factual integral en navegador |
| Suficiencia diagnóstica gobernada | BLOCKED_BY_GOVERNANCE | Sin fórmula gobernada aplicable; no inventada |
| Semántica automatizada de suficiencia | NOT_IMPLEMENTED | No forma parte de este bloque |

## 12. Brechas hacia MVP Beta

1. Autoridad institucional y proceso auditable de promoción global (bloqueados intencionalmente).
2. Revisión humana de 126 propuestas, criterios de exhaustividad concretos; no aprobación masiva.
3. Integración portátil del harness con fixtures/identidades QA y pruebas MEMBER/paralelas específicas tras el guard nuevo.
4. Verificar desde archivo sintético cargado hasta restitución y admisión factual independiente, sin IA nueva ni datos reales.
5. Gobierno de las NI OP02 sin relación explícita y cinco NI OP01 conservadas como no enlazadas; diagnóstico no concluido.
6. Fórmulas diagnósticas gobernadas cuando existan: dependencia de gobierno, nunca sustituidas por cobertura.

## 13. Riesgos y limitaciones

| Riesgo | Impacto | Mitigación / STOP |
|---|---|---|
| Confundir PROPOSED con aprobado | FULL ilegítimo | Estados/guards; STOP ante promoción automática |
| Piloto habilitado con bandera cliente | Uso productivo no autorizado | Autorización exacta alojada; STOP si falta contexto QA |
| Criterio literal propuesto tomado como semántica suficiente | Descuento incompleto | NEEDS_GOVERNANCE_REVIEW y PARTIAL_ONLY |
| Propagación a hermanas/variables | Diagnóstico ficticio | Unidad adquisición; pruebas de atomicidad; STOP si crea observación |
| OP02 “sin cuestionario = sin impacto” | Omisión de brechas | 47 NI trazables e impacto no supuesto cero |
| HTTP 204 interpretado como escritura | Falso PASS de seguridad | Leer estado persistido después; código solo no basta |
| Mock de arquetipo presentado como prueba alojada | Sobreestimación de cobertura | Niveles separados en matriz |
| Vigencia/concurrencia/revocación incompletas | Cobertura obsoleta | Fail-closed, revisión, idempotencia; paralelo pendiente |
| Diferencia catálogo runtime/alojado | Deriva futura | Identidades y fail-closed; promoción global no implementada |
| UI/semántica validada confundidas con cierre | Suficiencia ficticia | Sin fórmula no hay diagnóstico cerrado |

## 14. Recomendación BUILD 04

**Propuesta únicamente, NO INICIADA:** priorizar COV-03D de seguridad y recorrido integral, con QA sintética y negativos MEMBER/paralelos; revisión de criterios y autoridad institucional separadas. No promover CM05/OP05 ni aprobar Lote01 por haber superado pruebas. Resolver OP02 mediante gobierno explícito sin cambiar el pack protegido en este alcance. Requiere autorización posterior; no se solicita ni ejecuta en este cierre.

## 15. Dictamen final

**BUILD03 PASS WITH CONDITIONS**, funcional para inventario, propuestas bloqueadas, control de pilotos y cobertura atómica QA; no aceptación semántica general, no MVP Beta terminado y no Gate D ejecutado.

Antecedentes: BUILD01 Gate A PASS y Gate B PASS según aceptación SEC-COV03-01/E2E-CM05-01 previamente recibida; BUILD02 Gate C PASS WITH CONDITIONS. La comprobación actual vuelve a demostrar CM05 sin observaciones, pero no sustituye ni reinicia esos bloques. No hay autorización BUILD04/COV-03D, aprobación productiva de pilotos, modificación protegida ni publicación.

Pendientes de alcance externo: gobierno institucional global; aprobación humana de criterios; aceptación integral futura; pruebas alojadas MEMBER/concurrencia paralela específicas del guard nuevo. Todos documentados, sin tareas en segundo plano.
