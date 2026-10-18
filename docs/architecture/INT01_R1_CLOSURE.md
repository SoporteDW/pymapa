# INT-01-R1 · Corrección de integración operativa — Informe de cierre

Fecha: 2026-10-18 · Entorno: QA aislada (`88fb67d6-4161-4f1e-a698-c703a4db9319`) · Datos: exclusivamente sintéticos · Sin llamadas a IA · Digiway Corp: solo lectura, sin modificaciones.

## A. Archivos modificados

- `src/lib/production/capability-handlers.ts`
  - `processCapabilityDocumentAdmissionsHandler`: invoca el `DocumentAdmissionBridge` con el repositorio base (sin scope) y autorización OWNER/ADMIN.
  - `revokeCapabilityDocumentMappingHandler`: verifica pertenencia del mapping vía RLS del usuario, invoca el RPC `revoke_fragment_mapping` y reprocesa el puente (invalidación append-only).
  - Corrección de defecto demostrado: `client.rpc` se invocaba desvinculado (`this` undefined → error `reading 'rest'`); ahora se invoca con `.call(client, …)`.
- `src/lib/production/capabilities.functions.ts`: endpoints autenticados `processCapabilityDocumentAdmissions` y `revokeCapabilityDocumentMapping`.
- `src/lib/ia/interpretacion.functions.ts`: `decidirCorrespondenciaIA` invoca el puente tras una decisión VALIDATED (best-effort; nunca revierte la decisión; los mappings temáticos son rechazados por el puente).
- `src/lib/production/document-admission-bridge.ts`: la observación candidata y el registro de CONTROL llevan `value.capabilityId` del pack (defecto demostrado en QA: sin etiqueta, `scopeRepositoryToCapability` leía la fila como legado OP-01 y el Engine de la capacidad documental nunca la veía).
- `src/lib/production/puertos.ts`: `capabilityId?: string` en `ObservationRecord.value`.
- `src/lib/production/document-admission-r1.test.ts` (nuevo): pruebas R1-01..R1-09 con fixtures sintéticos.
- `src/lib/production/arquitectura.test.ts`: módulos R1 añadidos a la lista de autorizados.
- `drizzle/migrations/0004_revoke_fragment_mapping.sql` (aplicada): RPC `revoke_fragment_mapping` — OWNER/ADMIN, transición única VALIDATED→SUPERSEDED, idempotente, auditable (`FRAGMENT_MAPPING_SUPERSEDED`).

## B. Handler y punto de integración efectivos

1. **Admisión**: `decidirCorrespondenciaIA` (tras VALIDATED) y el endpoint `processCapabilityDocumentAdmissions` → `processCapabilityDocumentAdmissionsHandler` → `DocumentAdmissionBridge` → observación física con `capabilityId`, procedencia documental completa (fragmento/extracción/evidencia/interpretación) y auditoría `DOCUMENT_OBSERVATION_ADMITTED`.
2. **Revocación**: endpoint `revokeCapabilityDocumentMapping` → verificación RLS de pertenencia → RPC `revoke_fragment_mapping` (VALIDATED→SUPERSEDED) → reproceso del puente → registro de CONTROL append-only que corrige la observación admitida → auditoría `DOCUMENT_OBSERVATION_INVALIDATED`.

## C. Evidencia del recorrido completo en QA alojada

Fixture sintético DG-01/VA03 (mapping `f1a7e101-0000-4000-8000-0000000000e6`, evidencia→versión→extracción→fragmento→interpretación→mapping CANDIDATE con `factual_correspondence_ref = ACQ·NI03`):

1. `validate_fragment_mapping` (HUMAN_VALIDATION, OWNER): OK.
2. `processCapabilityDocumentAdmissions`: `admitted: 1`.
3. Estado Engine posterior: `VA03 = KNOWN`, valor semántico "La prioridad comercial es aumentar las ventas del canal físico".
4. Reproceso: `admitted: 0` (idempotente, `ALREADY_ADMITTED`).
5. Auditoría alojada: `FRAGMENT_MAPPING_PROPOSED` → `FRAGMENT_MAPPING_VALIDATED` → `DOCUMENT_OBSERVATION_ADMITTED` (con linaje evidence/extraction/fragment/mapping/variableRef/acquisitionRef).

## D. Evidencia de invalidación gobernada

1. `revokeCapabilityDocumentMapping` (handler, navegador autenticado QA): `revoked: true`, `invalidated: 1`.
2. Estado Engine posterior: `VA03 = UNKNOWN` (la observación documental queda excluida; el registro de CONTROL nunca entra como hecho diagnóstico).
3. Reintento de revocación: idempotente (mapping ya SUPERSEDED, sin efecto).
4. Auditoría: `FRAGMENT_MAPPING_SUPERSEDED` (VALIDATED→SUPERSEDED con nota) y `DOCUMENT_OBSERVATION_INVALIDATED` (observación `ab636094-…`, control `d7a849fe-…`).
5. Observaciones manuales preexistentes intactas (cubierto por pruebas R1-08 y por el diseño append-only: la invalidación solo corrige la observación documental vinculada al mapping).

## E. Pruebas y resultados

| Prueba | Resultado | Evidencia |
|---|---|---|
| R1-01 mapping factual válido genera observación física desde el flujo servidor | PASS | QA alojada: `admitted: 1`, auditoría `DOCUMENT_OBSERVATION_ADMITTED` |
| R1-02 la observación llega al Engine y modifica la variable | PASS | `VA03: UNKNOWN → KNOWN` con el valor interpretado |
| R1-03 mapping temático VALIDATED no genera observaciones | PASS | Rechazos `THEMATIC_MAPPING_NOT_FACTUAL` en QA y unitarios |
| R1-04 mapping de otra organización no se admite | PASS | Unitario (aislamiento org) + RLS verificado en E3 |
| R1-05 MEMBER no puede operar | PASS | `assertDocumentGovernanceRole` + RPC rechazan MEMBER (E3, usuario qa2.member) |
| R1-06 reproceso no duplica | PASS | `admitted: 0` en reproceso alojado; índice único parcial `observations_document_mapping_unique`; concurrencia paralela real: NOT_TESTED |
| R1-07 revocación excluye la observación en la siguiente evaluación | PASS | `VA03: KNOWN → UNKNOWN` tras revocar |
| R1-08 la revocación no altera observaciones manuales | PASS | Unitario R1-08 |
| R1-09 registros de control no ingresan como hechos diagnósticos | PASS | Unitario + `observacionesVigentes` excluye CONTROL |
| R1-10 suite completa sin regresiones | PASS | 992/992 (48 archivos), typecheck `tsgo` limpio, build OK |

## F. Migraciones

- `0004_revoke_fragment_mapping.sql` — autorizada implícitamente por el mandato R1 («establecer una operación de revocación autorizada, auditable e idempotente»); aplicada vía SQL privilegiado. No se aplicó ninguna otra migración.

## G. Limitaciones pendientes

- Concurrencia paralela real de admisiones: NOT_TESTED (la idempotencia está garantizada por control en lectura + índice único en DB).
- INT01-COVERAGE-GAP-01 permanece abierto: ninguna admisión documental descuenta preguntas del cuestionario (comportamiento conservador aceptado); no se declara cobertura inteligente completa.
- Defecto cruzado CM-05 (aclaraciones mezcladas bajo VA01) documentado, fuera del alcance R1.
- El endpoint `processCapabilityDocumentAdmissions` procesa todas las capacidades con mappings VALIDATED de la evaluación cuando se invoca; la invocación automática tras `decidirCorrespondenciaIA` es best-effort por diseño.

## H. Componentes protegidos intactos

Knowledge Master v1.0, los 31 Knowledge Packs y Knowledge Engine 0.2.0 sin modificaciones (verificación por checksum en la suite). Moda Origen y el demo documental sin cambios. Digiway Corp: solo lectura. Sin datos reales, sin IA externa, sin publicación.

## I. Estado final

**R1 PASS** — El puente está conectado al flujo servidor con invocación real y verificable, la invalidación gobernada tiene vía operativa alojada y verificada (VALIDATED→SUPERSEDED→exclusión del Engine), y la suite completa permanece en 992/992 sin regresiones. INT01-COVERAGE-GAP-01 sigue abierto y pendiente de INT-01-COV, que requiere autorización expresa.
