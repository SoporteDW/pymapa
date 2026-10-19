# INT-01-COV-QA · QA-01 + QA-02

Fecha: 2026-10-19 UTC. Autorización: `PYMAPA_·_MVP_BETA_INTEGRAL_pasted-5.md`, versión 1.0.

## 1. Archivos modificados

- `src/lib/production/coverage-criteria.ts`: catálogo auxiliar aprobado.
- `src/lib/production/structured-coverage.ts` y `.test.ts`: contrato, comprobaciones y banco sintético.
- `src/lib/production/documentary-coverage.ts`: FULL histórico sin evaluación ya no descuenta.
- `src/lib/production/puertos.ts`, `runtime.server.ts`, `capability-handlers.ts`: lectura, vigencia, declaración autenticada y proyección.
- `src/components/capacidad/cobertura-documental-panel.tsx`: evaluación separada por componente y confirmaciones humanas.
- `src/lib/production/documentary-cov02.test.ts`: regresión adaptada al único criterio aprobado, NI04.
- `drizzle/migrations/0005_covqa_structured_coverage.sql`; tipos regenerados por la plataforma.
- `AGENTS.md`, `roadmap.md`, este informe.

## 2. Catálogo auxiliar y versionado

Única clave aprobada: knowledgeVersionId `d1a25af1-3634-4c9b-9465-69ac25875e26`, capacidad `DG-01`, adquisición `ACQ·NI04`, criterios `DG01-NI04-COV-1.0.0`.

Cinco componentes obligatorios: horizonte temporal, ambición estratégica, cambios materiales previstos, cambios relevantes del entorno y exhaustividad del alcance declarado. Publicados como interpretación auxiliar en TypeScript y en la función de consulta usada por la transacción. No son conocimiento diagnóstico ni variables. Otra adquisición o versión conserva PARTIAL; no existe extrapolación.

## 3. Contrato implementado

`StructuredCoverageDeclaration`: mapping/acquisition/knowledge identity, criteria version, target scope, component evaluations, synthesis justification, human completeness confirmation, expected revision and request UUID.

`ComponentEvidenceEvaluation`: component key/description, SUPPORTED/PARTIAL/UNSUPPORTED/UNCERTAIN, fragment UUID, literal quote, component justification, uncertainty notes and human relevance confirmation.

FULL requiere todos los componentes SUPPORTED, citas literales del fragmento del mapping, justificaciones y confirmaciones humanas, observación documental vigente, evidencia/extracción vigente, identidad fijada y ausencia de conflicto. Una solicitud incompleta se registra como PARTIAL con motivos; una cita inexistente se rechaza sin decisión persistida.

## 4. Migración aplicada

`0005_covqa_structured_coverage.sql`: columnas aditivas `coverage_evaluation` y `coverage_revision`; historial append-only `coverage_decisions`, permisos explícitos y RLS de miembros; RPC autenticada `set_structured_fragment_coverage`; bloqueo del acceso legacy a FULL. Revocar un mapping elimina su evaluación vigente e incrementa revisión sin eliminar decisiones anteriores.

No backfill convierte filas históricas en decisiones verificadas. El setter legacy solo conserva la compatibilidad PARTIAL; el panel usa el nuevo contrato.

## 5. Seguridad y autorización

OWNER/ADMIN se verifican mediante membresía real tanto en handler como en RPC, sin cliente privilegiado para decidir cobertura. Handler verifica organización, assessment y capacidad; RPC repite identidad, assessment y versión bajo bloqueo de fila. Request UUID/revisión evitan duplicar la misma decisión y rechazan decisiones obsoletas.

Comprobación alojada: dos llamadas concurrentes con idéntica declaración devolvieron revisión 6, ambas FULL, y una sola decisión; una solicitud nueva con revisión anterior devolvió `COVERAGE_DECISION_OBSOLETE`.

MEMBER negativo probado en guardia sintética; **no repetido con sesión MEMBER alojada**. RLS entre dos organizaciones tampoco se repitió para la nueva tabla. No se atribuye PASS alojado a esas condiciones.

## 6. Evidencia de pruebas sintéticas

Los números 01–05 se operacionalizan con los casos disponibles; el informe reconciliado que supuestamente los define no está materializado en el repositorio. Esta trazabilidad documental sigue siendo condición, no se inventa su contenido.

| Prueba | Resultado | Evidencia |
|---|---|---|
| T-QA02-01 prioridad anual parcial | PASS | Unitaria + panel alojado: PARTIAL y NI04 pendiente |
| T-QA02-02 cinco componentes completos | PASS | Unitaria + panel alojado: FULL, NI04 ausente de pendientes |
| T-QA02-03 cita inválida | PASS | Unitaria + RPC alojada: INVALID_COMPONENT_QUOTE |
| T-QA02-04 MEMBER | PASS sintético / NOT_TESTED alojado | Guardia rechaza MEMBER; no se usó otra cuenta |
| T-QA02-05 conflicto y vigencia | PASS sintético / NOT_TESTED alojado | Validador conservador + regresión; no se modificó extracción alojada |
| T-QA02-06 criterios no aprobados | PASS | Versión no aprobada devuelve PARTIAL alojada |
| T-QA02-07 componente obligatorio omitido | PASS | Exhaustividad omitida devuelve PARTIAL alojada |
| T-QA02-08 cita de otro componente | PASS con límite humano | Reutilizar cita de horizonte para ambición, sin confirmar relevancia, conserva PARTIAL |
| T-QA02-09 FULL histórico sin evaluación | PASS sintético | Proyector rechaza FULL sin contrato; no se reescribieron históricos |
| T-QA02-10 reversión/historial | PASS | FULL revisión 1 → PARTIAL revisión 2; ambas decisiones persisten; NI04 reaparece |
| T-QA02-11 navegador autenticado | PASS | Panel parcial/completo y restitución verificadas con OWNER QA |
| T-QA02-12 suite integral | PASS | 50 archivos, 1014/1014 pruebas; 22/22 afectadas repetidas tras ajuste final |

Fixtures alojados, solo organización QA `88fb67d6-4161-4f1e-a698-c703a4db9319`, assessment `5a64a7f8-016e-4e75-8510-556901fba203`:

- Parcial: evidence `a0020000-0000-4000-8000-000000000001`, fragment `a0020000-0000-4000-8000-000000000031`, mapping `a0020000-0000-4000-8000-000000000051`. Observación `c172a65e-4b05-420c-a2f0-42f0be76adc1`; revocación append-only `37c016ce-1fb0-46f7-a60a-04cfd85ce9f7`.
- Completo: evidence `a0020000-0000-4000-8000-000000000002`, fragment `a0020000-0000-4000-8000-000000000032`, mapping `a0020000-0000-4000-8000-000000000052`, observación `083963a8-f754-4c5c-ac16-a884a5c4964f`.
- Estado final: mapping parcial SUPERSEDED; mapping completo VALIDATED/PARTIAL revisión 7; NI04 pendiente. Historial retenido, sin limpiar fixtures.

## 7. Navegador QA

URL local `/capacidad/DG-01`; sesión OWNER autorizada `qa.op01@digiwaycorp.com`, sin credenciales en el informe. El panel se usó realmente para las decisiones parcial, completa y reversión. Antes de FULL: botón de NI04 presente (1); después de FULL: ausente (0); después de PARTIAL: presente (1). Cero errores de página durante el recorrido completo.

Capturas de verificación: `/tmp/browser/covqa/partial_decision.png`, `complete_decision.png`, `reverted.png`. Son evidencia temporal de esta ejecución, no archivos publicados. La persistencia alojada confirmó revisiones y actor de las decisiones. Las pruebas negativas complementarias se invocaron mediante el cliente autenticado desde el navegador; no se presentan como clicks del panel.

## 8. Regresión completa e integridad

1014/1014 pruebas PASS, 50 archivos. Última señal de compilación: build OK. Verificación SHA-256 de 219 archivos protegidos registrados antes de la intervención: cero cambios (Master, packs, Engine, sandbox documental y ruta Moda Origen). No migraciones sobre conocimiento, no IA externa, no documentos reales, no escrituras en Digiway Corp ni publicación.

Las respuestas manuales conservan su contrato y regresión. La cobertura se separa de la observación diagnóstica: revertir a PARTIAL no borra ni modifica la observación; revocar el mapping usa la invalidación R1 append-only existente.

## 9. Límites semánticos pendientes

- Comprobar una cita literal y exigir cinco declaraciones no determina automáticamente que la cita pruebe el componente. Un OWNER puede confirmar falsamente relevancia/completitud; no existe clasificador semántico aprobado.
- T-QA02-08 demuestra el rechazo de reutilización de cita y falta de confirmación, **no** un detector general de citas semánticamente incorrectas cuando un humano confirma todo.
- Los criterios aprobados se restringen a una única versión de conocimiento y NI04. Las demás adquisiciones permanecen conservadoras.
- Se controla vigencia al declarar y al leer; no se afirma serialización global frente a todas las escrituras simultáneas de respuestas o versiones documentales.
- Falta repetir MEMBER y RLS multiorganización alojados para la nueva frontera, y reconciliar el banco 01–05 con su informe fuente.

## 10. Dictamen

**QA-01 + QA-02: PASS WITH CONDITIONS.** Mecanismo estructurado, decisiones parciales/completas, historial, reintento idéntico concurrente, obsolescencia y recorrido OWNER QA demostrados. No equivale a validación automática de verdad o suficiencia semántica. Los NOT_TESTED y límites anteriores impiden un PASS incondicional de toda la seguridad alojada.

No se implementó COV-03A/B/C/D. DEC-COVQA-06 sigue obligatorio para COV-03B; su prueba CM-05 no se ejecutó. Esperar autorización expresa para cualquier fase posterior.
## 11. Adenda · Dictamen definitivo (2026-10-19)

**QA-01 + QA-02: PASS DEFINITIVO.** Los resultados históricos de las secciones 1–10 se conservan sin cambios.

- SEC-QA-01 (MEMBER no declara ni modifica cobertura): **PASS**. RPC estructurada y legacy rechazaron con `DOCUMENT_GOVERNANCE_FORBIDDEN`; INSERT REST en `coverage_decisions` 403. PATCH/DELETE REST devolvieron 200 con cero filas afectadas; fila intacta comprobada administrativamente.
- SEC-QA-02 (aislamiento `coverage_decisions` entre organizaciones): **PASS**. Lectura cruzada cero filas, propia sin filas ajenas, INSERT cruzado 403, anónimo cero filas.
- Causa del NOT_TESTED previo: canal de prueba (clave en `apikey`, sesión en `Authorization`), no defecto de producto.
