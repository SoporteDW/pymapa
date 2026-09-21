# CAPABILITY_ONBOARDING.md — Contrato de incorporación de capacidades

> Introducido en **M1-M · OP-01 Production Closure & Industrialization Readiness Gate**.
> Describe el proceso gobernado para incorporar una capacidad nueva al core
> productivo. No autoriza inventar conocimiento: cada paso consume contenido
> aprobado del Knowledge Master.

## Principio

Una capacidad se incorpora **añadiendo conocimiento gobernado**, no escribiendo
lógica diagnóstica. El Knowledge Engine, el esquema de base de datos, los
contratos y la capa de aplicación son genéricos: interpretan cualquier pack
válido. Si incorporar una capacidad exige tocar el engine con una condición por
capacidad, eso es un defecto arquitectónico, no un paso del proceso.

## Secuencia obligatoria

| #   | Paso                         | Artefacto                                                                                                                                                                                                          | Responsable                     |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| 1   | **Knowledge Master**         | Extracción aprobada de la capacidad (dominios, capacidades, variables, necesidades de información, adquisiciones, requisitos de evidencia, identidades de findings, recomendaciones, actividades, CRV)             | Gobierno editorial              |
| 2   | **Knowledge Pack**           | `knowledge/packs/<capability>/<version>/pack.json` + `README.md` con trazabilidad a la extracción                                                                                                                  | Gobierno editorial + ingeniería |
| 3   | **Schema validation**        | `packages/knowledge-schema` valida estructura y referencias cruzadas; rechaza severidad numérica, CRV con fórmula y referencias inexistentes                                                                       | Automático (tests)              |
| 4   | **Fixtures**                 | Casos de entrada representativos por variable/estado (incluido UNKNOWN y CONTRADICTORY)                                                                                                                            | Ingeniería                      |
| 5   | **Knowledge tests**          | El pack produce las necesidades de información, adquisiciones y candidatos declarados; lo no explícito se reporta como gap                                                                                         | Ingeniería                      |
| 6   | **Runtime acceptance tests** | Recorrido completo sobre el repositorio en memoria: Response → Observation → EvaluationRun → Finding → Recommendation → Intervention → Activity → Deliverable → Done → CRV → Validation → Follow-up → Reassessment | Ingeniería                      |
| 7   | **Registrar el pack**        | Entrada en el registro de packs del runtime (`PACKS_REGISTRADOS`, `src/lib/production/runtime.server.ts`)                                                                                                          | Ingeniería                      |
| 8   | **Publish KnowledgeVersion** | Fila en `knowledge_versions` con `identifier`, `version`, `checksum` y `status = PUBLISHED`; inmutable a partir de ese momento                                                                                     | Ingeniería + gobierno           |
| 9   | **Enable capability**        | Añadir el id a `PRODUCTION_CAPABILITY_IDS` (`src/services/production/execution-source.ts`)                                                                                                                         | Decisión de gobierno            |

Los pasos 1 y 2 son **editoriales**: sin contenido aprobado, la capacidad no
entra. Los pasos 3–6 son puertas de calidad: si fallan, el pack no se publica.

## Reglas invariantes del onboarding

1. **Sin conocimiento inventado.** Lo que el Master no declara se registra como
   gap (`NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`), nunca se completa por inferencia.
2. **Sin scoring.** Ninguna capacidad nueva puede introducir madurez, prioridad,
   sufficiency o confidence numéricos sin fórmula aprobada.
3. **Pinning.** Cada Assessment queda fijado a la KnowledgeVersion vigente al
   crearse; publicar una versión nueva nunca recalcula el histórico.
4. **Una KnowledgeVersion publicada es inmutable.** Un cambio de contenido exige
   una versión nueva y el estado `SUPERSEDED` para la anterior.
5. **El frontend no gana autoridad.** La pantalla de una capacidad nueva solo
   representa estado y captura entrada.
6. **CRV solo si es explícito.** Si una actividad no tiene CRV aprobado, se
   registra `VALIDATION_REQUIREMENT_NOT_EXPLICIT`; no se valida sola.
7. **El MVP no se toca.** Las capacidades no migradas siguen en `MVP_ENGINE`.

## Qué puede automatizarse después

| Paso                  | Automatizable | Forma propuesta                                                                                      |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| 3 Schema validation   | Sí, ya        | Test que valida todos los packs del directorio en bucle                                              |
| 4 Fixtures            | Parcial       | Generador de plantilla de fixtures a partir del pack                                                 |
| 5 Knowledge tests     | Sí            | Suite paramétrica sobre `knowledge/packs/**` (una descripción, N packs)                              |
| 6 Runtime acceptance  | Sí            | Recorrido genérico parametrizado por `packId`/`capabilityId`                                         |
| 7 Registro de pack    | Sí            | Descubrimiento por directorio en lugar de lista literal                                              |
| 8 Publicar versión    | Parcial       | Registro idempotente por `identifier` + `version` + `checksum` (ya existe para OP-01; generalizable) |
| 9 Habilitar capacidad | No conviene   | Decisión de gobierno explícita, deliberadamente manual                                               |

## Qué NO forma parte del proceso

Crear reglas diagnósticas en código, derivar severidad o prioridad, transformar
KPIs en CRV, usar un modelo de lenguaje como autoridad de validación, o
modificar el Knowledge Master con resultados de un cliente. Los resultados de
Validation/Reassessment pueden generar `learning_candidates`, que **nunca**
se aplican automáticamente al conocimiento publicado.

## Actualización M2-A · pipeline industrial

Desde **M2-A** los pasos 2–8 se ejecutan con el pipeline gobernado del
repositorio (`bun run knowledge:pipeline`, `knowledge:write`,
`knowledge:validate`). Ver
`docs/architecture/M2A_KNOWLEDGE_INDUSTRIALIZATION_PIPELINE.md` y
`docs/knowledge/KNOWLEDGE_PACK_GOVERNANCE.md`. El paso 1 (fuente aprobada) y la
decisión de publicación siguen siendo humanos.
