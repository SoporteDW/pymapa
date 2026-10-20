# INT-01-COV-03 · BUILD 02 · Cierre Gate C y Contrato Maestro de Cobertura Documental v1.0

Fecha: 2026-10-19 · Alcance: OP-01..OP-05 + contrato transversal. Master v1.0, 31 packs v1.0.0 y Engine 0.2.0 sin cambios.

## 1. Dictamen
Gate C: PASS WITH CONDITIONS (condiciones: criterio OP-05 solo PILOT_TEST_GOVERNED; no hay criterios para OP-01..OP-04).

## 2. Inventario operacional (packs publicados)
| Cap | VA | NI | ACQ | Modos de adquisición | Variables por ACQ | Cardinalidad |
|---|---|---|---|---|---|---|
| OP-01 | 10 | 6 | 12 | 12 QUESTION | 11×1, 1×2 | mayormente 1:1, una ACQ N:2 |
| OP-02 | 10 | 47 | 2 | 2 QUESTION (P1) | 10 y 6 | 1 ACQ : N VA; 47 NI sin ACQ explícita |
| OP-03 | 8 | 37 | 42 | 5 QUESTION + 37 INFORMATION_NEED (+3 etapas) | 39×1, 6, 4, 8 | NI N:1 VA; preguntas 1:N VA |
| OP-04 | 9 | 55 | 60 | 5 QUESTION + 55 INFORMATION_NEED (+1 etapa) | 55×1, 2..9 | NI N:1 VA; preguntas 1:N VA |
| OP-05 | 10 | 64 | 64 | 64 INFORMATION_NEED | 64×1 | 64 ACQ N:1 hacia 10 VA (5–8 por VA) |

Ids canónicos usados literalmente (p. ej. `ACQ·VA01#NI@L254`); nunca reconstruidos por posición.

## 3. Cambios
- `src/lib/production/coverage-criteria.ts`: entrada piloto OP-05.
- `src/lib/production/caso-uso.ts`: **corrección de defecto demostrado** — `evaluarAssessment` proyecta cobertura solo con mappings de la misma organización, capacidad y versión de conocimiento (el Assessment runtime es compartido y los ids de ACQ se repiten entre packs; antes un FULL de otra capacidad con igual id podía descontar).
- `drizzle/migrations/0007_cov03c_op05_pilot_criteria.sql`: `create or replace` aditivo de `approved_coverage_components` (espejo literal del registro TS).
- Pruebas: nuevo `cov03-op05-pilot.test.ts` (14), ajustes en `cov03-cm05-pilot.test.ts` (3 entradas FULL_ELIGIBLE) y `arquitectura.test.ts`.
- Sin nuevas tablas, RPC ni motor de cobertura.

## 4. Contratos reutilizados
`COVERAGE_CRITERIA_REGISTRY`, `set_structured_acquisition_coverage`, `validate_fragment_mapping`, `revoke_fragment_mapping`, `proyectarCoberturaDocumental`, `hasVerifiedStructuredCoverage`, `validateStructuredCoverage`, panel de cobertura. Ninguna incompatibilidad con INFORMATION_NEED: la proyección actúa sobre `pendingInformationTasks`.

## 5. Criterio piloto OP05-VA01-L254-COV-1.0.0 (PILOT_TEST_GOVERNED)
Fuente: `OP-05_Completo.txt` L252–254 «## VA01 · Objetivo y resultado / Necesitamos saber: / - problema/oportunidad;» → NI `VA01#NI@L254` → ACQ `ACQ·VA01#NI@L254`.
Componentes: PROBLEM_OR_OPPORTUNITY («Problema u oportunidad que origina el objetivo identificado»), SCOPE_EXHAUSTIVENESS. No usa el bloque «Suficiente cuando» (suficiencia de variable, fuera de alcance).

## 6. E2E alojado (org QA 9816dfad, OWNER sintético qa.cm05e2e, assessment c71d7b34, mapping c0700000-…0014)
| Paso | Resultado | Evidencia |
|---|---|---|
| Inicial | 64/64 pendientes, 0 respuestas | initial.png |
| PARTIAL (1/2 componentes) | «Cobertura parcial registrada», REQUIRED_COMPONENT_INCOMPLETE; 64/64 | partial.png, after_partial.png |
| FULL válido | «Cobertura completa declarada»; 63/64, solo L254 desaparece | full.png, after_full.png |
| Versión de criterios no registrada | PARTIAL forzado (GOVERNED_COMPONENTS_NOT_DEFINED); 64/64 | after_n5.png |
| FULL de nuevo | 63/64 | after_full2.png |
| Revocación OWNER | SUPERSEDED/PARTIAL rev 5; 64/64 | after_revoke.png |
Observaciones: 0 antes y después; respuestas: 0; evaluation_runs: 0; ninguna variable KNOWN (unitario: estados de VA01–VA10 idénticos).
Auditoría append-only: PROPOSED > VALIDATED > COVERAGE_DECIDED ×4 > SUPERSEDED; 4 decisiones conservadas.

## 7. Seguridad / negativos alojados
| Caso | Resultado |
|---|---|
| Cita inventada | 400 INVALID_COMPONENT_QUOTE |
| Declarar hermana L255 sobre el mapping L254 | 400 COVERAGE_IDENTITY_MISMATCH |
| Versión de conocimiento ajena | 400 COVERAGE_IDENTITY_MISMATCH |
| Revisión obsoleta | 400 COVERAGE_DECISION_OBSOLETE |
| MEMBER de otra organización declara FULL | 400 DOCUMENT_GOVERNANCE_FORBIDDEN |
| MEMBER de otra organización revoca | 400 FRAGMENT_MAPPING_REVOCATION_FORBIDDEN |
Unitarios adicionales: no propagación entre capacidades, otra organización, arquetipo VARIABLE, pack inalterado.

## 8. Regresión
Suite completa 1037/1037 (52 archivos); tsgo limpio; DG-01 y CM-05 sin regresión.

## 9. Contrato Maestro (v1.0)
1. **Evidencia**: evidence → version → extraction COMPLETED vigente → fragmento literal con locator; cualquier versión/extracción posterior invalida (EVIDENCE_NOT_CURRENT).
2. **Identidad**: unidad atómica = adquisición canónica del pack (`capabilityId`, `acquisitionRef`, `knowledgeVersionId`) tal cual; nunca derivada de posiciones.
3. **Criterios auxiliares**: registro TS + espejo SQL; estados PROPOSED / PILOT_TEST_GOVERNED / APPROVED; entrada fija archetype (VARIABLE|ACQUISITION); sin entrada → PARTIAL_ONLY.
4. **PARTIAL/FULL**: FULL solo si todos los componentes SUPPORTED con cita literal distinta, relevancia humana, sin incertidumbres, completitud confirmada, sin conflicto CONTRADICTORY y evidencia vigente; si no, PARTIAL con motivos.
5. **Límite semántico**: validación literal/estructural + certificación humana OWNER/ADMIN; no existe validación semántica automatizada.
6. **Proyección**: FULL verificado añade solo esa ACQ a `answeredAcquisitionRefs`; preguntas y tareas de información se reducen por igual.
7. **Separación**: cobertura ACQUISITION nunca crea observaciones ni estados de variable; admisión factual solo por el puente E1 (mappings VARIABLE).
8. **Cardinalidad / no propagación**: un FULL cubre una ACQ; hermanas N:1 permanecen; mappings filtrados por organización, capacidad y versión; reutilización entre capacidades crea mapping CANDIDATE independiente.
9. **Versiones, revocación, auditoría**: revisiones optimistas, `requestId` idempotente, revocación → SUPERSEDED/PARTIAL, decisiones y eventos append-only.
10. **Seguridad**: RPC SECURITY DEFINER con rol OWNER/ADMIN por organización del mapping; RLS de lectura por membresía.
11. **Pruebas parametrizadas**: patrón `cov03-*-pilot.test.ts` (inicial, PARTIAL, FULL, revocación, cardinalidad, cita, versión, tenant, no propagación, pack intacto) + espejo SQL.

Por arquetipo: 1:1:1 → VARIABLE (factual) o ACQUISITION; estructural → ACQUISITION sobre metadatos canónicos; progresivas → solo ACQUISITION, nunca variable genérica; operacionales → ACQUISITION por NI, sin agregar hermanas.

## 10. Matriz de preparación (31)
| Cap | Arquetipo | ACQ | Infraestructura | Propuestos | Piloto | Aprobados | PARTIAL_ONLY | Pendiente |
|---|---|---|---|---|---|---|---|---|
| CM-01 | Progresiva | 6 | Compatible | 0 | 0 | 0 | 6 | Criterios y E2E por adquisición |
| CM-02 | Progresiva | 6 | Compatible | 0 | 0 | 0 | 6 | Criterios y E2E por adquisición |
| CM-03 | Progresiva | 6 | Compatible | 0 | 0 | 0 | 6 | Criterios y E2E por adquisición |
| CM-04 | Progresiva | 6 | Compatible | 0 | 0 | 0 | 6 | Criterios y E2E por adquisición |
| CM-05 | Progresiva | 7 | Compatible | 0 | 1 | 0 | 6 | Unit+alojada+navegador |
| CM-06 | Progresiva | 6 | Compatible | 0 | 0 | 0 | 6 | Criterios y E2E por adquisición |
| DG-01 | 1:1:1 | 9 | Compatible | 0 | 0 | 1 | 8 | Unit+alojada+navegador |
| DG-02 | 1:1:1 | 10 | Compatible | 0 | 0 | 0 | 10 | Criterios y E2E por adquisición |
| DG-03 | 1:1:1 | 10 | Compatible | 0 | 0 | 0 | 10 | Criterios y E2E por adquisición |
| DG-04 | 1:1:1 | 10 | Compatible | 0 | 0 | 0 | 10 | Criterios y E2E por adquisición |
| DG-05 | 1:1:1 | 12 | Compatible | 0 | 0 | 0 | 12 | Criterios y E2E por adquisición |
| DT-01 | 1:1:1 | 16 | Compatible | 0 | 0 | 0 | 16 | Criterios y E2E por adquisición |
| DT-02 | Estructural | 17 | Compatible | 0 | 0 | 0 | 17 | Criterios y E2E por adquisición |
| DT-03 | Estructural | 17 | Compatible | 0 | 0 | 0 | 17 | Criterios y E2E por adquisición |
| DT-04 | Progresiva | 5 | Compatible | 0 | 0 | 0 | 5 | Criterios y E2E por adquisición |
| DT-05 | Progresiva | 5 | Compatible | 0 | 0 | 0 | 5 | Criterios y E2E por adquisición |
| DT-06 | Estructural | 23 | Compatible | 0 | 0 | 0 | 23 | Criterios y E2E por adquisición |
| EC-02 | Progresiva | 7 | Compatible | 0 | 0 | 0 | 7 | Criterios y E2E por adquisición |
| EC-03 | Progresiva | 8 | Compatible | 0 | 0 | 0 | 8 | Criterios y E2E por adquisición |
| EC-04 | Progresiva | 7 | Compatible | 0 | 0 | 0 | 7 | Criterios y E2E por adquisición |
| EC-05 | Progresiva | 8 | Compatible | 0 | 0 | 0 | 8 | Criterios y E2E por adquisición |
| OP-01 | Operacional | 12 | Compatible | 0 | 0 | 0 | 12 | Criterios y E2E por adquisición |
| OP-02 | Operacional | 2 | Compatible | 0 | 0 | 0 | 2 | Criterios y E2E por adquisición |
| OP-03 | Operacional | 42 | Compatible | 0 | 0 | 0 | 42 | Criterios y E2E por adquisición |
| OP-04 | Operacional | 60 | Compatible | 0 | 0 | 0 | 60 | Criterios y E2E por adquisición |
| OP-05 | Operacional | 64 | Compatible | 0 | 1 | 0 | 63 | Unit+alojada+navegador |
| PC-01 | 1:1:1 | 11 | Compatible | 0 | 0 | 0 | 11 | Criterios y E2E por adquisición |
| PC-02 | 1:1:1 | 13 | Compatible | 0 | 0 | 0 | 13 | Criterios y E2E por adquisición |
| PC-03 | 1:1:1 | 14 | Compatible | 0 | 0 | 0 | 14 | Criterios y E2E por adquisición |
| PC-04 | 1:1:1 | 14 | Compatible | 0 | 0 | 0 | 14 | Criterios y E2E por adquisición |
| PC-05 | 1:1:1 | 15 | Compatible | 0 | 0 | 0 | 15 | Criterios y E2E por adquisición |

Ninguna capacidad queda operativa en FULL por tener infraestructura compatible.

## 11. Riesgos y limitaciones
- FULL depende de juicio humano; criterios piloto no aprobados.
- OP-02: 47 NI sin ACQ explícita no pueden cubrirse (no se inventan correspondencias).
- Preguntas QUESTION 1:N VA (OP-02/03/04) requieren criterios que cubran la pregunta completa, no una variable.
- Conflicto manual solo bloquea FULL cuando es CONTRADICTORY.
- Usuario OWNER sintético con correo sin confirmar (QA).

## 12. Decisiones de gobierno pendientes
Aprobar o rechazar CM05-P101 y OP05-VA01-L254; política para preguntas 1:N VA; tratamiento de NI de OP-02 sin adquisición; proceso de propuesta→aprobación de criterios por lotes.

## 13. Recomendación BUILD 03
Flujo gobernado PROPOSED→APPROVED de criterios (sin auto-aprobación), primer lote acotado en 1:1:1 y una QUESTION 1:N de OP-03 como piloto; COV-03D (regresión integral) después.
