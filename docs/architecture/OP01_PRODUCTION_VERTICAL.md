# M1-D · Primer vertical productivo OP-01 / P01

Fuente de conocimiento: **PYMAPA-KNOWLEDGE-MASTER-v1.0 · BASELINE-APPROVED**
(extracción AT-04). Ningún contenido OP-01 fue inferido ni completado.

## Dirección de dependencias (obligatoria)

```text
React
  ↓  (src/hooks/use-diagnostico.ts → clienteParaCapacidad)
AssessmentClient            src/services/production/production-client.ts
  ↓
Application boundary        src/lib/production/op01.functions.ts   (createServerFn + auth)
  ↓
Casos de uso                src/lib/production/caso-uso.ts          (genérico)
  ↓
Knowledge Engine            packages/knowledge-engine               (server-only)
  ↓
PostgreSQL                  src/lib/production/runtime.server.ts
```

Prohibido: `React → Knowledge Engine`. Verificado por
`src/lib/production/arquitectura.test.ts`.

## Capas

| Capa | Ubicación | Responsabilidad |
| --- | --- | --- |
| Knowledge Pack | `knowledge/packs/op-01/1.0.0/pack.json` | Contenido gobernado, declarativo |
| Schema | `packages/knowledge-schema` | Validación estructural y referencial del pack |
| Runtime | `packages/knowledge-engine` | Interpreta cualquier pack; sin condicionales por capacidad |
| Puertos | `src/lib/production/puertos.ts` | Contrato de persistencia + implementación en memoria |
| Casos de uso | `src/lib/production/caso-uso.ts` | Response → Observation → EvaluationRun → estados |
| Runtime server | `src/lib/production/runtime.server.ts` | Carga del pack, KnowledgeVersion, repositorio PostgreSQL |
| Boundary | `src/lib/production/op01.functions.ts` | `getAssessmentState`, `getNextAcquisition`, `submitResponse` |

## Invariantes garantizados

1. **P01 proviene del pack**, nunca de React ni del runtime.
2. **Pinning**: toda evaluación corre contra la `knowledge_version_id` fijada al
   Assessment; una versión distinta produce `KNOWLEDGE_VERSION_MISMATCH`.
3. **Response ≠ Observation**: la Response siempre se persiste; la Observation
   solo cuando el pack la admite, con `source_response_id` como trazabilidad.
4. **UNKNOWN se preserva**: no se convierte en negativo, ausencia ni finding, y
   no se vuelve a preguntar en bucle (una observación UNKNOWN ya es información).
5. **Sin scoring**: no hay números de madurez, severidad, prioridad, sufficiency
   ni confidence. Lo que no tiene fórmula aprobada se reporta como
   `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`.
6. **Juicio gobernado**: las 13 reglas OP-01 se transportan con lineage y el
   `evaluation_run` queda en `NEEDS_REVIEW`; no se resuelven por inferencia.
7. **Enrutamiento**: solo `OP-01` usa `PRODUCTION_ENGINE`
   (`PRODUCTION_CAPABILITY_IDS`); las 12 capacidades del MVP siguen en
   `MVP_ENGINE` sin cambios.

## Trazabilidad registrada por cada ejecución

`knowledgeMasterIdentifier`, `knowledgeMasterVersion`, `knowledgePackId`,
`knowledgePackVersion`, `engineVersion`, `knowledgeVersionId`, `capabilityId`,
`observationIds`, `ruleRefsConsidered` — guardados en `variable_evaluations.detail`
e `information_need_states.detail`, y en las columnas de `evaluation_runs`.

## Límite actual conocido

El boundary exige sesión autenticada (`requireSupabaseAuth`), porque la
escritura tenant-owned depende de la pertenencia a una organización. El MVP Alfa
aún no tiene pantalla de acceso, de modo que el recorrido OP-01 en pantalla queda
disponible en cuanto exista sesión; el vertical completo está verificado por
pruebas de aceptación sobre el mismo caso de uso.

## Estados de bookkeeping del runtime (no son semántica del Master)

`information_need_states.state` usa `PENDING`, `COLLECTED`,
`AWAITING_CLARIFICATION`, `NOT_MAPPED`: contabilidad de qué falta adquirir. No
sustituyen Sufficiency ni Confidence, que permanecen sin fórmula aprobada.
