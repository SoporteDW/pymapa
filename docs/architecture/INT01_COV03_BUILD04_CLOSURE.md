# PYMAPA · INT-01-COV-03 · BUILD 04 / COV-03D — Informe de cierre

Fecha UTC: 2026-10-20. Autorización: BUILD 04 v1.0 recibida. Evidencia propia: `docs/evidence/cov03d-build04/`. No publicación ni aprobación de criterios.

## 1. Resumen ejecutivo y dictamen

**PASS WITH CONDITIONS; Gate D integral no cerrado.** Seguridad MEMBER, OWNER/ADMIN, concurrencia real, pilotos atómicos, admisión factual independiente, lecturas autenticadas de 31 capacidades, expediente y regresión verificados. **Bloque B integral BLOCKED:** el archivo nuevo sí fue cargado desde UI, sus bytes se leyeron del almacenamiento y coinciden, pero no existe un recorrido autenticado sin IA para crear versión/extracción/propuesta desde ese archivo. La ruta existente de interpretación usa Gateway IA, prohibido en este encargo; no se invocó. No se sustituyó ese recorrido por demo Moda Origen ni por fixtures privilegiados.

No se declara MVP Beta Integral terminado ni 31 capacidades listas para FULL. Las 126 propuestas siguen PROPOSED; DG01 aprobado y CM05/OP05 pilotos sin promoción.

## 2. Acciones realmente ejecutadas

- Restauradas sesiones legítimas QA por herramienta de sesión, sin contraseñas ni tokens en evidencia.
- QA A: `9816dfad-a1be-4140-8293-c4cab34f3603`, assessment `c71d7b34-9da0-4755-8394-418172412731`; OWNER `d918f1e4-d569-4569-b60e-fe3b90ec86da`, ADMIN `5c764919-cfc9-4c4e-b26c-761502de0a4b`, MEMBER `90cecfe9-0fb1-4ff4-bc00-048958840601`.
- QA B nueva: `b0400000-0000-4000-8000-000000000001`, assessment `b0400000-0000-4000-8000-000000000003`; OWNER QA ADMIN anterior y MEMBER QA anterior. Asignaciones solo en tenants sintéticos; membresías anteriores no alteradas.
- Nuevos mappings CM05 `b040…0014`, OP05 `b040…0024` nacieron CANDIDATE; validación por RPC OWNER, decisiones OWNER/ADMIN y revocación gobernada.
- Paralelismo con ThreadPoolExecutor, dos intervalos HTTP superpuestos, sin confundir retry secuencial con concurrencia.
- Archivo sintético nuevo UI; puente VARIABLE DG01 y mapping NI temático; lectura de las 31 capacidades vía funciones autenticadas reales en navegador.
- Pruebas completas y comprobación de 218 SHA-256 protegidos.

## 3. Archivos, configuración, migraciones y datos

**Sin cambios en código de aplicación, configuración, esquema o migraciones en BUILD04.** Cambios persistentes: este informe, roadmap y evidencia explícitamente listada en `manifest.json`. Datos alojados añadidos exclusivamente QA: organización B, membresías, caso/assessment B, evidencia/versiones/extracciones/fragmentos sintéticos de fixtures, mappings CANDIDATE, decisiones y auditoría gobernadas. El fixture factual no se presenta como extracción del archivo subido.

No se editan integraciones generadas, Master, packs, Engine, demo, Digiway, autenticación global o criterios. Los scripts usan sesiones locales legítimas y configuración privada existente, nunca exportan tokens. Reproducción: preparar identidades/membresías y fixtures de estas mismas referencias en QA, mintear sesiones y guardar los ficheros de sesión **solo** en `/tmp/browser/build04`; ejecutar scripts en orden owner_checks → member_checks → admin_and_revoke → state_matrix → op05_flow → final_checks. Las referencias de revisión y mappings son de un solo ciclo; repetir exige nuevos candidatos, no restaurar historia ni repetir semillas ciegamente. No es un harness portable de provisión automática.

## 4. Seguridad y concurrencia

| Caso | Nivel | Resultado y lectura posterior |
|---|---|---|
| MEMBER FULL/PARTIAL | Alojado RPC | PASS, HTTP400 DOCUMENT_GOVERNANCE_FORBIDDEN; mapping y decisiones idénticos |
| MEMBER revocación | Alojado RPC | PASS, HTTP400; estado intacto |
| MEMBER PATCH FULL/PARTIAL, DELETE mapping | Alojado REST | PASS, HTTP204 vacío; no cambia ni elimina filas |
| MEMBER INSERT decisión propia o cross-org | Alojado REST | PASS, HTTP403; decisiones intactas |
| MEMBER promoción global | Alojado REST | PASS, HTTP204 vacío; CM05 sigue piloto |
| ADMIN PARTIAL y FULL | Alojado RPC | PASS, 200, revisiones 3 y 4 |
| ADMIN promoción/direct FULL | Alojado REST | PASS para no alteración, 204 no implica escritura |
| OWNER/ADMIN/MEMBER autoautorización piloto | Alojado REST | PASS, 403 en los tres roles |
| QA B lectura positiva; OWNER A lectura B | Alojado REST | PASS: B ve su decisión, A recibe [] |
| Dos requestId, misma revisión 1 | Paralelo alojado | PASS, una FULL rev2, otra 400 COVERAGE_DECISION_OBSOLETE |
| Dos peticiones misma clave idempotente | Paralelo alojado | PASS, ambas rev2; sin decisión duplicada |
| Decisión FULL vs revocación simultáneas | Paralelo alojado | PASS, 200/204; FULL rev5 seguida de revocación rev6; estado final SUPERSEDED/PARTIAL |
| Retry FULL después de revocar | Alojado RPC | PASS, 400 obsoleto, nunca reactiva cobertura |
| Revocar repetidamente | Alojado RPC | PASS, 204, estado/revisión no reactivados |

`owner-results.json` conserva inicio/fin de intervalos superpuestos. `admin-revoke-factual-results.json` conserva decisiones y auditoría posteriores, no solo códigos HTTP. Concurrencia verificada en una intercalación real; no prueba todas las intercalaciones matemáticas. OWNER no se sometió a cada variante de escritura directa; no se extrapola la matriz de MEMBER/ADMIN a ese caso no ejecutado. Lectura cross-org inversa de una identidad exclusivamente B: NOT_TESTED, el OWNER B también es ADMIN A; el aislamiento se demuestra con OWNER exclusivamente A, lectura B positiva y negativa A.

## 5. Recorrido documental completo

Archivo `BUILD04-synthetic.txt` cargado por `Archivo de evidencia` → `Registrar documento` en CM05. EvidenceId `fe46b513-cfa8-4cae-9181-7d94bd260b4f`. Descarga autenticada HTTP200 y comparación byte a byte **PASS**; hash en final-checks.json. Navegador muestra el nuevo documento registrado, no validado.

| Etapa del mismo archivo nuevo | Estado |
|---|---|
| UI carga + registro + bytes reales | PASS navegador y almacenamiento |
| Versión | BLOCKED; consulta evidence_versions devuelve 0 |
| Extracción literal + locator | BLOCKED; no vía autenticada offline integrada |
| Propuesta CANDIDATE del mismo archivo | BLOCKED; ruta IA requiere autorización externa |
| Validación humana desde esa propuesta | BLOCKED aguas arriba |
| PARTIAL/FULL/revocación del mismo archivo | BLOCKED aguas arriba |
| Piloto independiente CM05 | PASS alojado y navegador: 6 pendientes bajo FULL → 7 al revocar; ACQ·P1·02 → ACQ·P1·01 |
| Piloto independiente OP05 | PASS: PARTIAL 64; FULL UI 63; revocación 64; solo ACQ·VA01#NI@L254 |

Los pilotos usan fragmentos sintéticos existentes y nuevos candidatos, no se atribuyen al archivo nuevo. Para cerrar B se requiere autorización específica de IA **o** aprobar un paquete limitado que implemente extracción literal offline y propuesta humana gobernada en el journey autenticado, sin promover criterios. No se introduce esa nueva vía en esta aceptación ni se altera Moda Origen.

## 6. Admisión factual independiente

DG01 VARIABLE VA01 con factualCorrespondenceRef `ACQ·NI01`, pack real dg-01@1.0.0, interpretación literal sintética: «La empresa sintética QA fabrica sensores de laboratorio para centros de investigación.» Mappings `b040…0036` y `b040…0038` validados por OWNER; puente real `processCapabilityDocumentAdmissions`; Engine 0.2.0 no modificado.

**PASS alojado + lectura autenticada:** VA01 UNKNOWN → KNOWN (texto anterior) → UNKNOWN tras revocación. Las otras ocho variables DG01 permanecen iguales. Cada admisión genera una observación; cada invalidación conserva la anterior y añade CONTROL UNKNOWN. Final: cuatro observaciones históricas DG01 (dos hechos, dos controles), cero respuestas manuales creadas. Retry factual no duplica. No se afirma preservar una respuesta manual alojada inexistente: ese caso está en regresión unitaria R1-08, no nuevo E2E con manuales.

NI01 temático VALIDATED rechazado THEMATIC_MAPPING_NOT_FACTUAL; OP05 ACQUISITION VALIDATED rechazado, cero admisiones. CM05 y OP05 mantienen sus variables UNKNOWN; cobertura no crea observaciones ni valores. La lectura de CM05 registra un mapping DG01 ya admitido como ALREADY_ADMITTED en el informe compartido, **no** implica que la variable alimente CM05 ni admisión transversal nueva. El scope efectivo por capacidad se contrasta en estados.

`factual-variable-states.json` y `final-checks.json` conservan variables, observaciones y auditoría DOCUMENT_OBSERVATION_ADMITTED / INVALIDATED. No se declara suficiencia ni cierre por KNOWN; admisión factual y cobertura son contratos distintos.

## 7. Matriz de las 31 capacidades

Lecturas **31/31 PASS** en QA autenticada: workspace + estado desde funciones reales; esto acredita disponibilidad de lectura, no envío manual ni todos los botones. Q/I = preguntas literales / requerimientos de información visibles. UI documental por capacidad solo cargada en CM05; revisión/validación RPC verificada DG01/CM05/OP05; resto IMPLEMENTED_GENERIC_NOT_TESTED. Las propuestas no habilitan FULL.

| Capacidad | Arquetipo | ACQ | Q/I | Criterio real | Navegador propio | Descuento |
|---|---|---:|---:|---|---|---|
| OP-01 | OPERATIONAL_MIXED | 12 | 12/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| OP-02 | OPERATIONAL_MIXED | 2 | 2/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| OP-03 | OPERATIONAL_MIXED | 42 | 5/37 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| OP-04 | OPERATIONAL_MIXED | 60 | 5/55 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| OP-05 | OPERATIONAL_MIXED | 64 | 0/64 | 1 PILOT QA (L254) | BUILD04 piloto | PASS BUILD04 adquisición única |
| DG-01 | ONE_TO_ONE | 9 | 0/9 | 1 APPROVED (NI04) | BUILD04 factual | Antecedente COV12; no reejecutado |
| DG-02 | ONE_TO_ONE | 10 | 0/10 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| DG-03 | ONE_TO_ONE | 10 | 0/10 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| DG-04 | ONE_TO_ONE | 10 | 0/10 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| DG-05 | ONE_TO_ONE | 12 | 0/12 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| PC-01 | ONE_TO_ONE | 11 | 0/11 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| PC-02 | ONE_TO_ONE | 13 | 0/13 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| PC-03 | ONE_TO_ONE | 14 | 0/14 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| PC-04 | ONE_TO_ONE | 14 | 0/14 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| PC-05 | ONE_TO_ONE | 15 | 0/15 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| DT-01 | ONE_TO_ONE | 16 | 0/16 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| DT-02 | STRUCTURAL | 17 | 0/17 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| DT-03 | STRUCTURAL | 17 | 0/17 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| DT-04 | PROGRESSIVE | 5 | 5/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| DT-05 | PROGRESSIVE | 5 | 5/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| DT-06 | STRUCTURAL | 23 | 0/23 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| CM-01 | PROGRESSIVE | 6 | 6/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| CM-02 | PROGRESSIVE | 6 | 6/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| CM-03 | PROGRESSIVE | 6 | 6/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| CM-04 | PROGRESSIVE | 6 | 6/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| CM-05 | PROGRESSIVE | 7 | 7/0 | 1 PILOT QA (P1·01) | BUILD04 piloto | PASS BUILD04 adquisición única |
| CM-06 | PROGRESSIVE | 6 | 6/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| EC-02 | PROGRESSIVE | 7 | 7/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| EC-03 | PROGRESSIVE | 8 | 8/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| EC-04 | PROGRESSIVE | 7 | 7/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |
| EC-05 | PROGRESSIVE | 8 | 8/0 | Sin elegible / PROPOSED no habilita FULL | NOT_TESTED | BLOCKED sin criterio |

Detalle de carga, validación, elegibilidad, admisión factual, dependencias y preparación QA por cada capacidad: `31-capability-readiness.json`. **Ninguna fila READY integral.** DG01 solo NI04 tiene criterio aprobado; el caso factual probado aquí es NI01/VA01, no FULL NI04. CM05/OP05: QA piloto exacta, no habilitación productiva. Otros: FULL BLOCKED hasta criterios gobernados y pruebas específicas. OP02 conserva dos adquisiciones reales, sin inventar 47 adicionales.

## 8. Regresión y E2E

Regresión nueva: **53 archivos / 1065 pruebas PASS**, `regression.log` (2026-10-20 02:14 UTC). No se ejecuta build/typecheck manual; preview `build OK` 02:07:55 y no cambios de código posteriores. SHA256 **218/218 iguales**, `protected-check.json`; prueba no cubre archivos ajenos a la lista protegida.

E2E propio: CM05 FULL visible/revocación, OP05 FULL desde formulario OWNER/revocación, subida de documento y bytes, admisión factual real + lectura de variables y 31 estados. Capturas revisadas en este bloque. Primera captura CM05 se tomó durante carga; no se usa como aceptación y se sustituyó por espera de `Registrar documento`. No IA, datos reales o prueba de Digiway. No regresión manual nueva con respuesta existente; R1-08 unitario PASS no se etiqueta alojado.

## 9. Hallazgos, defectos y correcciones

1. **Brecha de recorrido B demostrada:** registrar archivo no crea versión ni extracción; la interpretación disponible requiere IA. Clasificada BLOCKED por restricción de autorización, no PASS con fixtures.
2. UI bajo FULL CM05 dice «1 con respuesta» aunque hay cero respuestas y una pregunta cubierta. Estado servidor separa cobertura; es una limitación de presentación preexistente, no respuesta ficticia persistida. Sin corrección fuera de alcance.
3. Factual KNOWN no retira automáticamente requerimiento: DG01 sigue nueve necesidades pendientes sin criterio FULL aplicable. Comportamiento conservador, no defecto inferido.
4. HTTP204 no acredita permiso de escritura: lecturas posteriores registradas evitan falso PASS.

**Ninguna corrección de código/esquema aplicada.** Si se corrige el rótulo o se agrega flujo documental, hacerlo en paquete acotado con autorización y pruebas; no modificar reglas protegidas.

## 10. Riesgos y dependencias de gobierno

- Autoridad institucional global y publicación gobernada todavía no implementadas; OWNER/ADMIN no son esa autoridad.
- Componentes estructurados/citas literales + confirmación humana no constituyen validación semántica automática.
- 126 PROPOSED sin promoción; tres criterios existentes no equivalen a 448 adquisiciones FULL.
- **445** = 448−3 adquisiciones sin criterio existente potencialmente elegible; dos de esos tres son pilotos solo QA. En producción general, solo un criterio aprobado deja **447 sin criterio APPROVED**, no confundir denominadores.
- OP02: 47 NI sin relación explícita con sus dos adquisiciones; detalle preservado en op02-needs.v1.0.0.json, impacto **indeterminado, no cero**. OP01 NI02–NI06 sin relación explícita, cinco filas en op01-unlinked-needs.json. No ordinales ni correspondencias inventadas.
- INT01-COVERAGE-GAP-01 sigue abierto fuera del alcance de tres criterios; suficiencia diagnóstica es independiente y no inferida.

## 11. Plan por lotes hacia habilitación transversal

**Propuesta, no aprobación ni ejecución:** reutilizar inventario, validador, RPC, panel, harness y matriz, pero definir componentes de cada adquisición con revisión humana.

| Lote | Alcance / cantidad de adquisiciones sin criterio existente | Gate |
|---|---|---|
| 1 | 125 propuestas 1:1 DG02–05, PC01–05, DT01 | Revisión específica de alcance/negativos por dominio, autoridad institucional y pruebas por adquisición |
| 2 | DG01 restantes 8 + DT02/03/06 estructurales 57 = 65 | No extrapolar NI04; preservar vínculos estructurales publicados |
| 3 | Progresivas DT04/05, CM01–06, EC02–05: 76 restantes | Atomicidad por pregunta sin valores genéricos; piloto CM05 no promueve hermanas |
| 4 | Operacionales OP01–05: 179 restantes | OP03 P1-OP03-02 es PROPOSED, no piloto; tratar N:1 y 1:N sin forzar biyección |

Total 125+65+76+179 = **445**. Lote1 coincide con 125 de 126 propuestas; la restante OP03 pertenece al lote operacional. OP02 47 NI y OP01 cinco NI son expediente aparte: no sumarlas como adquisiciones nuevas. Promoción de dos pilotos es decisión separada, no oculta en esos lotes.

Mecanismo institucional mínimo propuesto: rol de gobierno separado y no editable por tenant, identidad canónica/checksum, expediente firmado por dominio/arquetipo, decisión append-only/versionada, publicación coherente catálogo/runtime, autorización de despliegue y pruebas de reversión. No implementado ni autoaprobado.

Tres decisiones independientes: (1) aprobar criterios; (2) habilitar recorrido documental tras QA funcional; (3) evaluar suficiencia diagnóstica conforme reglas existentes/gobernadas. Ninguna reemplaza las otras.

## 12. Matriz PASS / FAIL / BLOCKED / NOT_TESTED

| Entregable/caso | Resultado |
|---|---|
| A MEMBER negativas y lectura persistida | PASS |
| A OWNER/ADMIN decisiones, aislamiento A→B | PASS |
| A simultaneidad, stale revision, retry, revocación | PASS en intercalaciones observadas |
| A todas variantes OWNER direct-write e inversa B-only | NOT_TESTED; alcance de evidencia delimitado |
| B carga UI mismo archivo / bytes | PASS |
| B versión→extracción→CANDIDATE→FULL mismo archivo | BLOCKED por falta vía sin IA autorizada |
| Pilotos CM05/OP05 PARTIAL→FULL→revocación | PASS, no sustituye B |
| C VARIABLE canónico + invalidación + variables | PASS |
| C NI/ACQUISITION sin admisiones ficticias | PASS |
| C manuales existentes alojados | NOT_TESTED; R1-08 unitario PASS |
| D lecturas 31 capacidades | PASS; UI/submissions todas NOT_TESTED |
| D FULL integral 31 capacidades | BLOCKED por criterios/gobierno |
| E expediente, 52 NI y plan 445 | PASS documental; aprobación BLOCKED |
| Regresión 1065 / baseline218 | PASS |
| Defecto técnico comprobado con prueba fallida | Ningún FAIL observado; brechas no maquilladas como PASS |
| Gate D / MVP Beta Integral | PASS WITH CONDITIONS / NO TERMINADO |

## 13. Recomendación explícita del siguiente paquete

**BUILD05 propuesto, no iniciado:** cierre de recorrido documental no-IA (o autorización específica de IA) desde archivo nuevo hasta revocación; extraer literalmente con ubicación, persistir versión/extracción, propuesta humana CANDIDATE y revisión autenticada sin inventar observaciones. Repetir escenario con evidencia insuficiente/completa para un criterio ya elegible; cerrar variantes OWNER e identidad B-only y regresión manual alojada con respuestas preservadas. Un expediente institucional de criterios debe ser otra decisión explícita, no prerrequisito para reusar pilotos QA exactos.

Criterio de salida: mismo documento trazable end-to-end, decisiones persistidas, restitución, roles/aislamiento y variables contrastadas; si una dependencia permanece, no PASS integral. **No promoción APPROVED, publicación, modificación protegida ni inicio de habilitación transversal automática.**

---

## Anexo · Verificaciones complementarias de cierre controlado (2026-10-20)

Modalidad: QA alojada, sin nuevo Build, sin cambios de código, esquema, migraciones, RLS ni configuración. Sin IA externa. Sin Digiway Corp (`f26a1777…`) ni datos reales. Las secciones 1–13 anteriores se conservan sin cambios. Evidencia: `docs/evidence/cov03d-build04/cierre-controlado/` (SHA256SUMS; sin sesiones ni tokens).

### V1 · Escritura directa por OWNER — **PASS**
Actor `qa.cm05e2e` (OWNER, org QA A `9816dfad…`), mapping `b0400000-…-0014`. 13 operaciones REST directas: PATCH/DELETE `fragment_mappings`, `coverage_decisions`, `coverage_criteria_catalog`, `coverage_pilot_authorizations`, `audit_events` → 200 con 0 filas afectadas; POST `coverage_decisions`/`audit_events` → 403 (42501); POST `fragment_mappings`/`coverage_criteria_catalog`/`coverage_pilot_authorizations` → 400 (P0001, bloqueo). Instantánea antes = después (mapping SUPERSEDED/PARTIAL/rev 6, decisiones, catálogo no PROPOSED, pilotos, observaciones, auditoría). Evidencia `t1-owner-direct-write.json`.

### V2 · Aislamiento multiempresa con identidad exclusiva QA B — **PASS**
Siguiendo la instrucción de no modificar membresías existentes, no se retiró ninguna membresía. Se creó la cuenta sintética nueva `qa.orgb.exclusive@digiwaycorp.com` (`ef9d59d2…`), que nunca perteneció a QA A, y el OWNER de QA B la añadió como MEMBER solo en `QA SINTETICA BUILD04 B` (`b0400000-…-0001`; membresía `c6176572…`, operación aditiva). Resultado: lectura de 10 tablas de QA A → 0 filas (`content-range */0`, mapping por id 0); PATCH/DELETE → 0 filas; POST → 403; RPC revocación/validación/cobertura → `FRAGMENT_MAPPING_REVOCATION_FORBIDDEN`, `FRAGMENT_MAPPING_VALIDATION_FORBIDDEN`, `DOCUMENT_GOVERNANCE_FORBIDDEN`. Control positivo: lee sus propios registros de QA B (1 decisión, 1 mapping, 3 eventos). Estado QA A sin cambios (17 decisiones; mappings intactos). Evidencia `t2-isolation.json`.
Queda en la base: la cuenta y la membresía sintéticas nuevas (reutilizables para futuras pruebas de QA B).

### V3 · Preservación de respuestas manuales — **PASS (con observación)**
Assessment sintético DG-01 `5a64a7f8…` (organización de trabajo QA `88fb67d6…`, solo cuentas QA). Secuencia en orden cronológico: respuesta manual `e80faf59…` en ACQ·NI01 (2026-09-28, observación `f27c7d79…`) → admisión documental del mapping VARIABLE VA01 `ee961093…` (factualCorrespondenceRef ACQ·NI01, observación `80928de1…`) → revocación gobernada ejecutada en esta verificación desde el servidor de la aplicación. Resultado: mapping VALIDATED→SUPERSEDED; control append-only `37b7f8d4…` UNKNOWN/INVALIDATION que corrige **solo** `80928de1`; evento `DOCUMENT_OBSERVATION_INVALIDATED`; reintento idempotente (invalidated 0). Respuestas idénticas (mismos hash) y observación manual intacta; 24→25 observaciones, ninguna borrada. Engine: VA01 UNKNOWN antes y después; ACQ·NI01 sigue respondida por la respuesta manual.
Observación: la respuesta manual y la admisión eran previas a esta sesión (no se crearon de nuevo) y la respuesta manual tenía estado UNKNOWN; por eso no se demostró precedencia entre dos valores KNOWN distintos. Evidencia `t3-manual-preservation.json`, `t3-dg01-after.png`.

### Línea base
`git status` limpio para código, `knowledge/`, `packages/` y `supabase/`: Knowledge Master v1.0, 31 packs v1.0.0, Engine 0.2.0, Moda Origen y Digiway Corp sin cambios. Sin promoción de criterios (DG-01 APPROVED; CM-05/OP-05 PILOT_TEST_GOVERNED; resto PROPOSED).

### Condiciones pendientes
1. Recorrido documental integral desde archivo nuevo sin IA (Bloque B): sigue BLOCKED; fuera de esta fase.
2. Precedencia manual KNOWN frente a hecho documental KNOWN distinto: no demostrada en alojado (solo unitaria R1-08).

### Dictamen específico INT-01-COV-03
**PASS WITH CONDITIONS → aceptación de la infraestructura de cobertura documental gobernada.** Las tres verificaciones complementarias pasan. Esto no valida el recorrido documental integral, la interpretación semántica ni el diagnóstico de los seis dominios, y no cierra el MVP Beta Integral.
