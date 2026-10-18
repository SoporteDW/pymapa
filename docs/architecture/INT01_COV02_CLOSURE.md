# INT-01-COV-02 · Cierre — Contrato gobernado de cobertura documental (DG-01)

**Estado: PASS WITH CONDITIONS** · 2026-10-18

## 1. Alcance ejecutado
Build controlado de cobertura documental limitado a DG-01, según autorización INT-01-COV-02. Sin cambios en Master, packs publicados, Engine 0.2.0, Moda Origen, Digiway Corp (solo lectura), IA, suficiencia, scoring ni otras capacidades.

## 2. Mecanismo implementado
- Campo aditivo `coverage_scope` (`FULL`/`PARTIAL`, default `PARTIAL`) + `coverage_acquisition_ref`, `coverage_justification` (≥10 chars), `coverage_decided_by`, `coverage_decided_at` en `fragment_mappings` (migración aditiva aplicada; columnas verificadas en base alojada).
- RPC `set_fragment_mapping_coverage` (SECURITY DEFINER): solo OWNER/ADMIN de la organización, exige mapping VALIDATED con correspondencia factual canónica para FULL, justificación obligatoria, audita `FRAGMENT_MAPPING_COVERAGE_DECIDED`. La guarda de transiciones se amplió para permitir únicamente updates de cobertura.
- Handler `declareCapabilityDocumentCoverage` + server function autenticada; doble autorización (handler + RPC/RLS).
- Proyección `documentary-coverage.ts`: estados `COMPLETE | PARTIAL | CONTRADICTORY`. `COMPLETE` exige observación documental KNOWN vigente + mapping VALIDATED + `coverageScope FULL` enlazado a la misma adquisición + ausencia de conflicto. Fail-closed: default PARTIAL.
- `caso-uso.ts`: solo adquisiciones COMPLETE entran en `answeredAcquisitionRefs`; las manuales conservan su lógica; los conflictos se excluyen y se hacen visibles.
- UI: panel de cobertura documental en el workspace de capacidad, visible solo para OWNER/ADMIN, separando validación factual de decisión de cobertura.

## 3. Resultados de pruebas
| Prueba | Resultado |
| --- | --- |
| COV-01..10 (sintéticas: FULL, PARTIAL, temático, contradicción, revocación, reutilización, MEMBER negativo, mapping histórico, aislamiento, manuales) | PASS (10/10) |
| COV-11 · Suite completa | PASS · 1002/1002 (49 archivos), typecheck limpio, build OK |
| COV-12 · Circuito alojado servidor→persistencia→Engine→pendientes en navegador | NOT_TESTED — la sesión inyectada no pertenece a la organización QA (workspace no carga); requiere sesión del OWNER QA |

## 4. Verificaciones alojadas (read-only)
- Columnas de cobertura presentes en `public.fragment_mappings` con default `PARTIAL`.
- RPCs `set_fragment_mapping_coverage` y `revoke_fragment_mapping` presentes (SECURITY DEFINER).
- Mapping factual VALIDATED preexistente en QA (DG-01, VA01/ACQ·NI01) permanece en PARTIAL: comportamiento conservador intacto, ninguna pregunta se descuenta sin decisión FULL explícita.

## 5. Defectos corregidos durante el build
- `documentary-cov02.test.ts` importaba el Engine sin estar en la lista de arquitectura autorizada; se registró junto a sus bancos hermanos (misma categoría de prueba de integración).

## 6. Condiciones y límites
- INT01-COVERAGE-GAP-01 queda cerrado para DG-01 por contrato explícito FULL/PARTIAL; las demás 30 capacidades siguen en comportamiento conservador (PARTIAL implícito).
- COV-12 pendiente: requiere sesión del usuario OWNER de la organización QA para declarar FULL desde la UI y observar la reducción de pendientes.
- Concurrencia paralela real sobre la decisión de cobertura: NOT_TESTED (la unicidad e idempotencia descansan en constraints y en la RPC transaccional).

## 7. Protegidos
Master, 31 packs, Engine 0.2.0, Moda Origen y Digiway Corp sin modificaciones. Sin IA, sin datos reales, sin publicación.

## 8. Siguiente paso
No iniciar INT-01-COV-03 sin autorización expresa. Para cerrar COV-12 se necesita una sesión QA del OWNER de la organización de trabajo.
