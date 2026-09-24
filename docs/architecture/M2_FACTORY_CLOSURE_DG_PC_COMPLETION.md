# M2-FACTORY-CLOSURE · Runnable Pack Pipeline + DG/PC Completion

Fecha: 2026-09-24 · Engine 0.2.0 · Autoridad: `PROJECT_OWNER / KNOWLEDGE_GOVERNANCE_AUTHORITY` (solo rol, sin identidad personal).

## Resultado por capacidad

| Capability | Canonical baseline | Runnable pack | Fixtures | Engine compatibility | Runtime extension | Human semantic review | Publication state | Exact blocker |
|---|---|---|---|---|---|---|---|---|
| OP-03 | ACCEPTED (182) | NO | NOT_RUN | NOT_RUN | GRE-CRITICALITY-NOT-EXPLICIT (8 VA) | NONE | UNPUBLISHED | GRE criticality; definición no materializada |
| OP-04 | ACCEPTED (188) | NO | NOT_RUN | NOT_RUN | GRE-CRITICALITY-NOT-EXPLICIT (9 VA) | NONE | UNPUBLISHED | GRE criticality; definición no materializada |
| OP-05 | ACCEPTED (117) | NO | NOT_RUN | NOT_RUN | GRE-CRITICALITY-NOT-EXPLICIT (10 VA) | NONE | UNPUBLISHED | GRE criticality; definición; 0 adquisiciones proyectables |
| DG-01 | ACCEPTED (83) | NO | NOT_RUN | NOT_RUN | GRE-CRITICALITY-NOT-EXPLICIT (9) | NONE | UNPUBLISHED | GRE criticality; definición; 0 adquisiciones |
| DG-02 | ACCEPTED (101) | NO | NOT_RUN | NOT_RUN | GRE (10) | NONE | UNPUBLISHED | ídem |
| DG-03 | ACCEPTED (95) | NO | NOT_RUN | NOT_RUN | GRE (10) | NONE (B1 aplicada) | UNPUBLISHED | ídem |
| DG-04 | ACCEPTED (96) | NO | NOT_RUN | NOT_RUN | GRE (10) | NONE | UNPUBLISHED | ídem |
| DG-05 | ACCEPTED (95) | NO | NOT_RUN | NOT_RUN | GRE (12) | NONE | UNPUBLISHED | ídem |
| PC-01 | ACCEPTED (81) | NO | NOT_RUN | NOT_RUN | GRE (11) | NONE (B2 aplicada) | UNPUBLISHED | ídem |
| PC-02 | ACCEPTED (96, 8 CRV) | NO | NOT_RUN | NOT_RUN | GRE (13) | NONE (B3 aplicada) | UNPUBLISHED | ídem |
| PC-03 | ACCEPTED (107) | NO | NOT_RUN | NOT_RUN | GRE (14) | NONE | UNPUBLISHED | ídem |
| PC-04 | ACCEPTED (99) | NO | NOT_RUN | NOT_RUN | GRE (14) | NONE | UNPUBLISHED | ídem |
| PC-05 | ACCEPTED (106) | NO | NOT_RUN | NOT_RUN | GRE (15) | NONE | UNPUBLISHED | ídem |

Detalle máquina: `knowledge/factory/reports/runnable-projection.json`.

## Cambios genéricos en la Factory

- **A1** `runnable-projection.ts`: baseline aceptada → `source.json` → `generatePackCandidate`. Solo convenciones de ID del Master (CE, VA, NI, P1–P5); todo valor literal; determinista (checksum); si el Engine exige un campo que la baseline no declara, no emite pack y devuelve un bloqueo clasificado.
- **A2** `enrichCapabilityIdentity`: verifica «ID · nombre» literal y compara sustancia por hash. OP-03/04/05: `identity-enrichment.json` (`NON_SEMANTIC_METADATA_ENRICHMENT`, sustancia idéntica, aceptación preservada).
- **A3** extractor (`--line-ids`): filas de tabla `| ID | valor |` = un objeto lógico, heading literal de la fila. PC-02 materializa CRV-PC02-01…08; la referencia «CRV-PC02-07 · competencia demostrada.» queda SUPERSEDED.
- **B1/B2/B3** aplicadas como `SELECT_OCCURRENCE` verificadas literalmente; provenance nativo (SOURCE-DERIVED / PYMAPA-DESIGNED[ / SYNTHESIZED]) registrado por capacidad sin normalizar.

## Tests / regresiones

767/767 tests · typecheck · `knowledge:validate` · `knowledge:seal:check` · `knowledge:factory:check` en verde. OP-01 Golden y el pack publicado de OP-02 sin cambios. A-OP02-02 = RESOLVED, BOUND-OP05-02 = CONDITION_MET. Ninguna capacidad activada en la app.

## Publicaciones

Ninguna. Ninguna capacidad pasa el gate "runnable pack generated".

## Decisiones semánticas humanas pendientes

Ninguna. Todos los bloqueos son técnicos o de extensión del runtime.

## Métricas

13 capacidades procesadas · 1 446 objetos canónicos · 0 packs ejecutables · 0 fixtures ejecutados · 0 capacidades compatibles con el Engine · 1 extensión genérica descubierta · 0 decisiones humanas · 0 publicadas · 0 FAIL · 13 problemas técnicos resueltos automáticamente (3 identidades, 1 tabla, 10 vocabularios de provenance, 2 ambigüedades, con 10 aceptaciones). No se reporta consumo de créditos/tokens porque no es medible.

## Por qué no está listo para DT+CM+EC

Bloqueos genéricos exactos:

1. `GENERIC_RUNTIME_EXTENSION_REQUIRED · GRE-CRITICALITY-NOT-EXPLICIT`: Engine 0.2.0 exige una criticidad enumerada para cada VA; ninguna de las 13 fuentes la declara. Hace falta una decisión de arquitectura sobre qué significa "no explícito" en el cálculo de suficiencia. No es una elección por capacidad.
2. `DETERMINISTIC_TECHNICAL_FIX · CAPABILITY_DEFINITION_NOT_IN_CANONICAL`: el extractor no materializa la definición literal de la capacidad como objeto.
3. `DETERMINISTIC_TECHNICAL_FIX · NO_RUNNABLE_ACQUISITION_IN_CANONICAL`: faltan preguntas P1–P5 con referencias literales a las VA en 11 de 13 capacidades. OP-03 tiene 3 y OP-04 tiene 4. Las NI siguen sin enlazarse a su VA, porque son líneas planas sin «·».

FACTORY_NOT_READY_FOR_FINAL_MASS_BATCH
