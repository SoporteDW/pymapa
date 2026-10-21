# DEC-046 · PRESC-OP01-H04 / 0.3.0

Fecha: 2026-10-21 UTC. Dictamen: **PASS WITH CONDITIONS — implementación y pruebas técnicas; no habilitación de REC-01**.

## Autoridad y alcance

El mandato DEC-046 adjunto aprueba el contenido complementario y autoriza implementación/pruebas. Prevalece sobre las leyendas anteriores del DOCX, conservado íntegramente en `docs/governance/dec-046/`. No autoriza publicación, activación comercial ni emisión. La aprobación de contenido `GOVERNMENT_APPROVED / DEC-046` no es autorización de emisión.

Solo OP-01/H04 y el namespace `PRESC-OP01-H04`. No equivalencias Rxx/Axx; no extensión de otras capacidades. Master v1.0, 31 packs v1.0.0, Engine 0.2.0 y evidencias SEM-QA permanecen intactos: 233 entradas comparadas, cero cambios (`protected-comparison.json`). Sin Gateway, documentos reales ni nuevas instrucciones SEM-QA.

## Implementación

- `src/lib/production/prescriptive-contract.server.ts`: contenido interno REC-01 y ACT-01…05, contrato 0.3.0, C1–C6, cuatro decisiones semánticas, causas alternativas, conciliación, suspensión, gates independientes. Nunca devuelve texto prescriptivo al usuario final.
- `prescriptive.functions.ts`: operación POST autenticada; delegación al servidor y validación estricta allí. No controles de activación en la interfaz.
- `prescriptive.server.ts`: RLS del usuario para assessment, membresía OWNER/ADMIN y autorización QA activa; comprobación OP-01/H04, versiones y ejecución diagnóstica terminada (`PROCESSED` o `NEEDS_REVIEW`), VA07 y R-OP01-02/05. Evidencias limitadas a observaciones vigentes de VA07 vinculadas al H04 seleccionado. Mappings documentales deben ser VALIDATED con admisión gobernada, extracción completa y versión vigente; CANDIDATE queda excluido.
- `drizzle/migrations/0013_dec046_prescriptive_decisions.sql`: tabla e historial append-only, GRANT explícitos, RLS por membresía, escritura privilegiada posterior a autorización. UNIQUE organización/request; reintentos con contenido distinto rechazados y colisión concurrente resuelta por lectura de la decisión existente. Trigger impide UPDATE/DELETE, emisión/publicación/activación y referencias fuera de alcance.
- `prescriptive-contract.test.ts` y `prescriptive-server.test.ts`: 28 pruebas focalizadas. `AGENTS.md` registra la separación server-only y el bloqueo independiente.

Cada decisión conserva condiciones, responsable, fecha, justificación, referencias de evidencia, entrada original, versiones, ejecución/caso/reglas/variables verificados, estado anterior/nuevo y enlace de reevaluación. Ninguna escritura modifica findings, observaciones, respuestas o conocimiento. El servidor comunica únicamente identificador y estados.

## T01–T12

Todos ejecutados sobre datos sintéticos en el evaluador puro, con emisión BLOCKED en cada caso:

| Caso | Resultado |
|---|---|
| T01 suplencia eficaz | PRESERVE_MONITOR, sin REC-01 |
| T02 seis TRUE y respaldo admitido | RECOMMEND_CANDIDATE, IDs propios ACT-01…05, BLOCKED |
| T03 acceso ilegítimo | ABSTAIN_ESCALATE |
| T04 documento contradictorio | ABSTAIN_ESCALATE y conciliación |
| T05 impacto UNKNOWN | REQUEST_INFO / C3 |
| T06 transferencia prohibida | ABSTAIN_ESCALATE, sin ACT-03 |
| T07 causa dotación | ABSTAIN_ESCALATE, H04 conservado |
| T08 mitigación | monitoreo o suspensión de decisión previa hipotética |
| T09 contenido DRAFT | candidatura semántica sin approvalId, BLOCKED |
| T10 suplente UNKNOWN | REQUEST_INFO / C6 |
| T11 cambio de proceso/rol | SUSPENDED, historial previo conservado |
| T12 fuentes contradictorias | ABSTAIN_ESCALATE |

Pruebas adicionales verifican MEMBER, ausencia de rol/QA, aislamiento previo al acceso privilegiado, evidencia ajena/no admitida, soporte retirado, NOT_APPLICABLE, inyección de aprobación, diferencial incompleto, C3 FALSE independiente de C2, rutas alternativas y conciliación con referencias. T08/T11 con estado histórico EMITTED son simulaciones puras; no se emitió ninguna recomendación alojada.

## Comprobación alojada y navegador

- OWNER QA: evaluación REQUEST_INFO/BLOCKED guardada y leída; reintento devuelve el mismo ID; NEW_EVIDENCE agrega SUSPENDED enlazado a la primera decisión. Dos filas leídas, original preservada. `owner-flow.json`.
- Escritura directa OWNER con payload de emisión: rechazada `P0001`. No emisión.
- MEMBER QA: evaluación rechazada `PRESCRIPTION_ROLE_FORBIDDEN`; puede leer historial propio según política, no evaluarlo. `member-security.json`.
- OWNER de otra organización QA: lectura vacía y evaluación rechazada `PRESCRIPTION_SCOPE_FORBIDDEN`. `cross-org-security.json`.
- Repetición final OWNER: REQUEST_INFO/BLOCKED, historial legible. `owner-final-security.json`.
- Prueba vía navegador con llamadas autenticadas al contrato, no mediante formulario de prescripción: no existe ni se añadió interfaz de publicación. Capturas temporales corroboran ausencia de REC-01 en la página; los JSON son la evidencia de decisiones persistidas.

## Regresión y diagnóstico

Regresión final: **57 archivos / 1114 pruebas PASS**. Pruebas focalizadas: **28/28 PASS**. Logs en `docs/evidence/dec-046/`. Última comprobación automática registrada: `build OK` 05:59:20 UTC. Se corrigió un uso de estado `COMPLETED` inexistente en evaluation_runs; no se alteró su enum ni el Engine.

## Limitaciones y condiciones pendientes

1. **Candidatura positiva alojada con C1–C6 TRUE: NOT_TESTED.** El H04 sintético disponible está SUPERSEDED; no se confirmó ni se alteró para forzar un resultado. La candidatura positiva está probada en el evaluador puro, no en el recorrido completo de evidencia admitida/servidor/persistencia.
2. **Concurrencia paralela alojada: NOT_TESTED.** Se verificó reintento secuencial y se implementó tratamiento de UNIQUE; no se equipara a aceptación concurrente real.
3. **Revocación factual completa hasta suspensión prescriptiva: NOT_TESTED en este paquete.** Soporte retirado y suspensión se prueban de forma pura; la reevaluación alojada probó falta de soporte, no una revocación nueva de documento.
4. Los estados de condiciones son juicios humanos con trazabilidad, no clasificación semántica automática. Verificar una referencia admitida no prueba por sí solo que satisface materialmente C1–C6. La restricción al soporte de VA07/H04 es conservadora y puede exigir vínculos gobernados adicionales para evidencia corroborativa.
5. No se añadió revisión automática programada: suspensión/reevaluación se registra al invocar la operación autorizada. No existe emisión que deba detenerse automáticamente.
6. SEM-QA permanece detenido; la brecha explícito/inferencia no está resuelta. Documentos reales continúan fuera de alcance.

## Devolución a Arquitectura Técnica / Gobierno

Implementación y pruebas nominales completadas; aceptación integral alojada condicionada a un fixture sintético H04 confirmado y evidencia admitida vinculada, sin forzar resultados, y a las variantes anteriores. **REC-01 permanece UNPUBLISHED, sin activationApprovalId, emissionDecision=BLOCKED en servidor y base de datos.** No declarar habilitación, publicación, emisión ni cierre del MVP.

## Anexo posterior · seguridad y aislamiento alojados

Mandato posterior de 2026-10-21 completado sin modificar el contrato: `DEC-046_HOSTED_SECURITY_FINAL.md`. Concurrencia paralela idéntica PASS (8 llamadas, una fila), contenido distinto rechazado, aislamiento bilateral/MEMBER/anónimo PASS, bloqueo e independencia de gates PASS en escenarios ejecutados. Candidatura positiva, revocación factual, ADMIN con H04 propio y referencia histórica cross-org persistida siguen NOT_TESTED. Diferencia de privilegios efectivos versus GRANT explícito documentada, sin cambios técnicos. Dictamen definitivo del alcance: **PASS WITH CONDITIONS**; REC-01 continúa bloqueada.