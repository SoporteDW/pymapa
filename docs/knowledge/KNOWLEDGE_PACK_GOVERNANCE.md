# KNOWLEDGE_PACK_GOVERNANCE.md — Gobierno de los Knowledge Packs

> Complementa `docs/architecture/CAPABILITY_ONBOARDING.md` (secuencia de
> incorporación) y `docs/architecture/M2A_KNOWLEDGE_INDUSTRIALIZATION_PIPELINE.md`
> (arquitectura del pipeline). Este documento fija las reglas de gobierno:
> quién decide qué, con qué evidencia y qué está prohibido.

## 1. Fuente única autorizada

`PYMAPA-KNOWLEDGE-MASTER-v1.0 · BASELINE-APPROVED` es la única fuente
autorizada. OP-01 es Golden Pack de referencia arquitectónica, **no** fuente
para inferir el contenido de otra capacidad.

Si una capacidad no tiene fuente materializada en `knowledge/master/`, su
estado es `SOURCE_MISSING` y la señal del manifest es
`AUTHORITATIVE_SOURCE_REQUIRED`. No se reconstruye desde prompts, memoria,
código MVP ni inferencia.

## 2. Formato de la fuente

`knowledge/master/<version>/capabilities/<ID>/source.json`:

- `master`: identidad, versión y baseline (se validan literalmente).
- `capability`: id, dominio, nombre, definición, pregunta central.
- `provenance`: `sourceReference`, `extractionStatus`, `derivation`,
  `approvedBy`, `approvedAt`.
- `targetPack`: `packId` y `packVersion` destino.
- `sections`: secciones gobernadas transcritas verbatim.
- `gaps`: vacíos declarados con clase y `publicationBlocking`.
- `checksum`: sha256 canónico del documento sin el propio campo.

Referencia editorial de los contratos: `knowledge/schemas/knowledge-master.schema.json`,
`capability-source.schema.json`, `knowledge-pack.schema.json`,
`capability-fixture.schema.json`. La validación ejecutable canónica vive en
`packages/knowledge-schema` y `packages/knowledge-pipeline`.

## 3. Reglas invariantes

1. **Sin conocimiento inventado.** Lo que el Master no declara se registra como
   gap, nunca se completa por inferencia.
2. **Sin scoring.** Ninguna capacidad introduce madurez, prioridad, sufficiency
   ni confidence numéricos sin fórmula aprobada.
3. **UNKNOWN ≠ NO.** El desconocimiento se preserva como estado.
4. **`GOVERNED_JUDGMENT` no se promueve** automáticamente a `DETERMINISTIC`.
5. **CRV solo si es explícito.** Sin requisito aprobado se registra el gap; no
   hay validación automática.
6. **Un Pack publicado es inmutable.** Cambiar contenido exige versión nueva y
   `SUPERSEDED` para la anterior.
7. **Pinning.** Cada Assessment queda fijado a la KnowledgeVersion vigente al
   crearse; publicar una versión nueva nunca recalcula el histórico.
8. **El frontend no gana autoridad.** Representa estado y captura entrada.
9. **Ningún resultado de cliente modifica el Master.** Los
   `learning_candidates` nunca se aplican automáticamente.

## 4. Estados y quién los otorga

| Estado                    | Otorgado por             | Condición                                                |
| ------------------------- | ------------------------ | -------------------------------------------------------- |
| `SOURCE_MISSING`          | registro del Master      | sin fuente materializada                                 |
| `SOURCE_READY`            | gobierno editorial       | fuente aprobada y referenciada                           |
| `PACK_CANDIDATE`          | generador (automático)   | candidato generado desde la fuente                       |
| `VALIDATION_FAILED`       | validadores (automático) | falla estructural, referencial, de gobierno o de runtime |
| `NEEDS_GOVERNANCE_REVIEW` | pipeline                 | técnicamente válido, pendiente de decisión humana        |
| `VALIDATED`               | pipeline                 | todas las etapas técnicas en verde                       |
| `PUBLISHED`               | gobierno editorial       | `VALIDATED` + revisión `APPROVED`                        |
| `SUPERSEDED`              | gobierno editorial       | reemplazado por una versión posterior                    |

## 5. Revisión humana

`knowledge/reports/<ID>.review.md` permite aprobar o rechazar **sin leer código
del engine**. Contiene identidad y procedencia, contenido extraído,
transformaciones, diferencias respecto de la fuente, gaps, juicios gobernados,
construcciones no soportadas por el runtime, fixtures y pruebas, puerta de
publicación y regresión del Golden Pack.

La decisión se registra en
`knowledge/master/<version>/capabilities/<ID>/governance-review.json` con
`decision`, `reviewer`, `reviewedAt` y `note`. `PENDING` o `REJECTED` impiden la
publicación.

## 6. Clasificación de vacíos

| Clase                                | Significado                                         | Bloquea publicación             |
| ------------------------------------ | --------------------------------------------------- | ------------------------------- |
| `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`   | el Master no lo declara                             | solo si se marca explícitamente |
| `KNOWLEDGE_CHANGE_CANDIDATE`         | requiere decisión editorial futura                  | solo si se marca explícitamente |
| `GOVERNED_JUDGMENT`                  | requiere criterio humano, no algoritmo              | no                              |
| `UNIMPLEMENTED_GAP`                  | enunciado sin implementación posible hoy            | no                              |
| `ARCHITECTURE_GAP`                   | limitación de arquitectura, no de conocimiento      | no                              |
| `GENERIC_RUNTIME_EXTENSION_REQUIRED` | el runtime necesita una extensión genérica aprobada | sí                              |

No se asume que todo KCC bloquee: la clasificación es explícita y se registra.

## 7. Prohibido

Crear reglas diagnósticas en código, derivar severidad o prioridad sin fórmula
aprobada, convertir KPIs en CRV, usar un modelo de lenguaje como autoridad de
validación, resolver un KCC por inferencia, fabricar una KnowledgeVersion
ficticia, o introducir una excepción por capacidad en el engine, el schema o el
pipeline.

## 8. Ejecución

```bash
bun run knowledge:pipeline   # lote completo
bun run knowledge:write      # regenera manifest y reportes de revisión
bun run knowledge:validate   # modo estricto (CI)
```

El pipeline se ejecuta desde el repositorio, sin Lovable ni configuración
privada.
