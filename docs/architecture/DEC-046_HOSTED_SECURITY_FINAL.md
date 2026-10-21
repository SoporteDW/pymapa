# DEC-046 · Informe técnico definitivo de seguridad y aislamiento alojados

Fecha de ejecución: 21 de octubre de 2026, UTC. Alcance: exclusivamente verificaciones de seguridad, aislamiento e idempotencia concurrente del contrato PRESC-OP01-H04/0.3.0, sin cambios funcionales, de contrato, configuración ni migraciones.

## Dictamen

**PASS WITH CONDITIONS.** Las verificaciones ejecutadas de acceso, aislamiento, concurrencia y bloqueo de emisión son PASS. No se declara aceptación integral del recorrido prescriptivo ni cierre del MVP. Las variantes no ejecutadas se detallan abajo; no se sustituyen por pruebas puras ni inspección de código.

Las llamadas al servidor se ejecutaron desde navegador contra la vista local, con identidades QA legítimas y persistencia/lectura en Lovable Cloud alojado. No se probó ni se desplegó una nueva versión del dominio publicado. Las capturas corroboran la página abierta, no muestran decisiones prescriptivas: la evidencia de las decisiones está en las respuestas y lectura persistida JSON.

## Resultados y evidencia

Directorio de evidencia: `docs/evidence/dec-046/hosted-final/`.

| Verificación | Resultado observado | Evidencia |
|---|---|---|
| Concurrencia real, mismo requestId y entrada | PASS: ocho llamadas simultáneas respondieron con el mismo ID `863082b9-6fcc-4e11-bbe5-902faa0d8c67`; exactamente una fila para requestId `b8c8671b-ac90-4ea7-90f2-e1513dc1ed65`; todas BLOCKED | `owner.json`, `parallel_identical` |
| Reutilización de requestId con contenido distinto | PASS: `PRESCRIPTION_REQUEST_REUSE_MISMATCH`, sin sobrescribir decisión | `owner.json`, `request_reuse_mismatch` |
| Independencia de decisiones | PASS alojado: REQUEST_INFO y ABSTAIN_ESCALATE produjeron decisiones distintas, ambas con emissionDecision BLOCKED | `owner.json`, `independent_gates`, `readback` |
| Inyección de publicación, activación y emisión en entrada del servidor | PASS: rechazo por esquema estricto; ninguna autorización aceptada | `owner.json`, `endpoint_activation_injection` |
| INSERT directo OWNER con EMITTED/PUBLISHED/activación | PASS: `P0001 / PRESCRIPTIVE_EMISSION_BLOCKED` | `owner.json`, `owner_direct_mutations` |
| UPDATE/DELETE directos OWNER sobre fila existente | PASS de preservación: respuestas sin error pero sin modificar/eliminar la fila; lectura posterior e integridad de siete filas preexistentes verificadas | `owner.json`, `owner_direct_mutations` y `readback` |
| QA A → QA B, lectura y assessment ajeno | PASS: lectura vacía y `PRESCRIPTION_SCOPE_FORBIDDEN` | `owner.json`, `a_to_b_read`, `a_to_b_scope` |
| QA B → QA A, lectura y evaluación | PASS: cero filas y `PRESCRIPTION_SCOPE_FORBIDDEN`; identidad sin membresía en QA A, con OWNER en QA B y ADMIN en otra organización | `cross-org.json`; `catalog-readback.json` |
| MEMBER de QA A | PASS: `PRESCRIPTION_ROLE_FORBIDDEN`; puede leer nueve filas de su organización, todas BLOCKED, según política de lectura | `member.json` |
| Acceso sin sesión | PASS: `Unauthorized: No authorization header provided`; lectura de cero filas | `anonymous.json` |
| Referencia histórica inexistente | PASS: `PRESCRIPTION_HISTORY_SCOPE_MISMATCH`; no equivale a probar una referencia histórica persistida de otra organización | `owner.json`, `nonexistent_history` |
| Inspección global de decisiones alojadas | PASS: nueve filas, cero violaciones de BLOCKED/UNPUBLISHED/activationApprovalId null; decisiones semánticas REQUEST_INFO y ABSTAIN_ESCALATE | `catalog-readback.json`; `owner.json`, `readback` |
| Baseline y evidencia protegida | PASS: 233 archivos comparados contra huellas pre-DEC-046, cero diferencias | `protected-comparison.json` |

## semanticDecision y emissionDecision

Funcionan de manera independiente: modificar la decisión semántica no habilita emisión. Se comprobó alojadamente REQUEST_INFO → BLOCKED y ABSTAIN_ESCALATE → BLOCKED. El caso positivo RECOMMEND_CANDIDATE con C1–C6 TRUE continúa respaldado únicamente por las pruebas puras T02 del cierre anterior; **no fue verificado alojadamente en este mandato**.

El servidor fija emisión BLOCKED, publicación UNPUBLISHED y activationApprovalId null; el control de base de datos rechaza payload de emisión/activación. OWNER o ADMIN no constituyen aprobación institucional de emisión. Las otras organizaciones no pueden leer/evaluar el assessment QA A. No existe una habilitación añadida por esta intervención.

## Desviaciones y limitaciones abiertas

1. **ADMIN sobre un H04 propio elegible: NOT_TESTED.** Existe una identidad con ADMIN en otra organización y su acceso a QA A fue rechazado. Su assessment no dispone de H04 para ejecutar una evaluación propia. No se crearon membresías, hallazgos ni confirmaciones artificiales. El bloqueo para ADMIN se conserva en el contrato y control de base de datos; no se presenta como prueba positiva alojada de ese rol.
2. **Candidatura positiva alojada C1–C6 TRUE: NOT_TESTED**, sin fixture sintético confirmado y evidencia admitida materialmente vinculada. No se forzó el H04 SUPERSEDED. Esta verificación funcional/semántica permanece fuera del mandato limitado.
3. **Revocación factual completa → suspensión prescriptiva: NOT_TESTED** en este cierre. No se revocaron documentos ni se amplió el recorrido; las pruebas anteriores de NEW_EVIDENCE no reemplazan esta variante.
4. **Referencia histórica persistida cross-org: NOT_TESTED.** Sí se probaron aislamiento de assessment y lectura bilateral, y rechazo de referencia inexistente.
5. **Privilegios efectivos más amplios que el GRANT explícito de la migración:** la consulta alojada devuelve anon SELECT y authenticated INSERT/UPDATE/DELETE verdaderos. La protección efectiva observada depende de RLS y del trigger, no de ausencia de privilegios SQL. Solo existe política SELECT por membresía. UPDATE/DELETE sin filas modificadas no son errores de permiso. No se modificaron grants, políticas ni configuración para armonizar esta diferencia; requiere revisión autorizada de mínimo privilegio si Gobierno la solicita.
6. Los juicios C1–C6 requieren revisión humana; una referencia admitida no verifica automáticamente su suficiencia semántica. Sin revisión automática programada. SEM-QA detenido y brecha explícito/inferencia abierta.
7. El entorno perdió archivos temporales entre llamadas de creación de sesión. Se reconstruyó el runner de aislamiento y se preservó en evidencia. Un intento preliminar OWNER terminó por una expectativa incorrecta del runner (esperaba errores UPDATE/DELETE, cuando RLS produjo cero cambios); no fue un fallo del contrato. Sus dos filas sintéticas BLOCKED se conservaron, sin limpieza ni sobrescritura. La repetición definitiva generó otras dos filas; nueve filas totales verificadas. El runner OWNER temporal no sobrevivió al reinicio, pero su registro JSON definitivo sí. No hay credenciales en la evidencia.
8. Las 1114 pruebas PASS pertenecen a la regresión del cierre anterior; no se reejecutaron aquí porque no hubo cambios de código. Último diagnóstico automático observado: build OK. No se atribuye una nueva corrida completa a este cierre.

## Estado final y detención

**REC-01 continúa BLOCKED, UNPUBLISHED y sin activationApprovalId en todas las decisiones alojadas verificadas.** Ningún escenario probado emitió, publicó ni activó REC-01. Los escenarios positivos alojados no ejecutados conservan ese bloqueo por contrato, pero su recorrido completo no se declara PASS.

No se modificaron Knowledge Master, los 31 Packs, Knowledge Engine, SEM-QA-01 ni el contrato aprobado. Sin Gateway, documentos reales ni datos de negocios reales. Solo filas QA sintéticas y evidencia documental append-only. Se detiene la intervención después de este informe; cualquier corrección de permisos o verificación funcional adicional necesita mandato posterior.