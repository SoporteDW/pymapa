# M2A_KNOWLEDGE_INDUSTRIALIZATION_PIPELINE.md

> Introducido en **M2-A · Knowledge Industrialization Pipeline**.
> M2-A no implementa ninguna capacidad nueva: construye el pipeline gobernado
> con el que las capacidades de `PYMAPA-KNOWLEDGE-MASTER-v1.0 · BASELINE-APPROVED`
> podrán convertirse en Knowledge Packs ejecutables, verificables, versionados y
> publicables.

## 0. Señal de cierre

**AUTHORITATIVE_SOURCE_REQUIRED.**

En el repositorio solo existe fuente gobernada materializada para **OP-01**
(1 de 31). Las otras 30 capacidades quedan registradas como `SOURCE_MISSING`.
No se reconstruye su contenido desde prompts, memoria, código MVP, OP-01 ni
inferencia. La señal es el resultado esperado de M2-A, no un fallo.

## 1. Principio

```text
Governed Knowledge Source
  → Capability Source Extraction
    → Pack Candidate
      → Structural validation
        → Referential validation
          → Governance validation
            → Runtime compatibility
              → Fixtures
                → Knowledge tests
                  → Runtime acceptance
                    → Human/Governance review
                      → VALIDATED
                        → PUBLISHED
```

Generar un Pack Candidate **no** equivale a conocimiento aprobado. Ninguna
etapa automática puede llevar contenido inferido a `PUBLISHED`.

## 2. Ubicación de los artefactos

| Ruta | Contenido |
| --- | --- |
| `knowledge/master/<version>/master.json` | Índice del Master: identidad, baseline, procedencia, publicación, dominios, registro de 31 capacidades, checksum |
| `knowledge/master/<version>/capabilities/<ID>/source.json` | Fuente gobernada de la capacidad (secciones transcritas + gaps + checksum) |
| `knowledge/master/<version>/capabilities/<ID>/governance-review.json` | Decisión humana `APPROVED` / `REJECTED` / `PENDING` |
| `knowledge/packs/<packId>/<version>/pack.json` | Knowledge Pack ejecutable |
| `knowledge/packs/<packId>/<version>/published.json` | Registro de inmutabilidad (checksum + estado) |
| `knowledge/fixtures/<packId>/*.fixture.json` | Fixtures de aceptación |
| `knowledge/schemas/*.schema.json` | Referencia editorial de los contratos |
| `knowledge/manifest.json` | Manifest industrial de las 31 capacidades (generado) |
| `knowledge/reports/<ID>.review.md` | Reporte de revisión de gobierno (generado) |
| `packages/knowledge-pipeline/` | Implementación del pipeline |
| `scripts/knowledge-pipeline.ts` | CLI ejecutable desde el repositorio |

El Master representa **fuente gobernada**; el Pack representa **conocimiento
ejecutable derivado** de esa fuente. El contenido no se duplica: las secciones
del Pack se copian verbatim desde `sections` y las claves de identidad
(`packId`, `packVersion`, `status`, `knowledgeMaster`, `$schema`) las asigna el
generador.

## 3. Manifest industrial

`buildCapabilityManifest` produce, por capacidad: `capabilityId`, `domainId`,
`sourceAvailability`, `sourceVersion`, `sourceReference`, `extractionStatus`,
`packId`, `packVersion`, `packStatus`, `schemaValidation`, `semanticValidation`,
`fixtureStatus`, `runtimeTestStatus`, `governanceReviewStatus`,
`publicationStatus`, `gapCount`, `publicationBlockingGapCount`, `checksum`.

Estados del ciclo: `SOURCE_MISSING`, `SOURCE_READY`, `EXTRACTED`,
`PACK_CANDIDATE`, `VALIDATION_FAILED`, `NEEDS_GOVERNANCE_REVIEW`, `VALIDATED`,
`PUBLISHED`, `SUPERSEDED`.

Estado actual: 31 declaradas · 1 `SOURCE_READY` · 1 `PUBLISHED` · 30
`SOURCE_MISSING` · señal `AUTHORITATIVE_SOURCE_REQUIRED`.

## 4. Generador determinístico

`generatePackCandidate(source)` copia verbatim las secciones gobernadas,
asigna identidad, registra procedencia (`masterIdentity`, `masterVersion`,
`baselineStatus`, `sourceReference`, `sourceChecksum`, `derivation`,
`generator`, `generatedFromSections`), lista las transformaciones
(`COPIED_VERBATIM` / `IDENTITY_ASSIGNED`), preserva los gaps y calcula el
checksum canónico.

Rechaza: secciones no soportadas (`UNSUPPORTED_SECTION`), ausencia de secciones
obligatorias (`MISSING_REQUIRED_SECTION`), identidad de capacidad inconsistente
(`CAPABILITY_IDENTITY_MISMATCH`) y checksum de fuente alterado
(`SOURCE_CHECKSUM_MISMATCH`).

No completa campos semánticos, no genera umbrales, no inventa mappings ni
opciones de respuesta, no convierte juicio en regla determinística, no infiere
enlaces cross-capability y no resuelve KCC.

## 5. Gaps como datos de primera clase

Clases preservadas: `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`,
`KNOWLEDGE_CHANGE_CANDIDATE`, `GOVERNED_JUDGMENT`, `UNIMPLEMENTED_GAP`,
`ARCHITECTURE_GAP`, `GENERIC_RUNTIME_EXTENSION_REQUIRED`.

Un Pack con gaps puede ser estructuralmente válido sin ser publicable: solo los
gaps marcados `publicationBlocking: true` bloquean. Los 26 gaps de OP-01
(KCC-AT04-01..03 y GAP-R-OP01-02..13 entre otros) son no bloqueantes y siguen
abiertos.

## 6. Validadores

| Etapa | Qué verifica | Códigos |
| --- | --- | --- |
| `STRUCTURAL` | contrato de `@pymapa/knowledge-schema` | `SCHEMA_INVALID` |
| `REFERENTIAL` | IDs únicos, coherencia bidireccional necesidad↔adquisición, evidencia, CRV↔actividad | `DUPLICATE_ID`, `REFERENCE_UNKNOWN`, `NEED_ACQUISITION_MISMATCH` |
| `GOVERNANCE` | procedencia, extracción `APPROVED`, ausencia de inferencia (diff), reglas `DETERMINISTIC` sin base explícita, gaps bloqueantes | `PROVENANCE_MISSING`, `UNAUTHORIZED_INFERENCE`, `DETERMINISTIC_RULE_WITHOUT_EXPLICIT_BASIS`, `PUBLICATION_BLOCKING_GAP` |
| `RUNTIME_COMPATIBILITY` | niveles P1–P5, modelos de respuesta, triggers, clasificación de reglas, condiciones de CRV y carga real en el engine | `GENERIC_RUNTIME_EXTENSION_REQUIRED`, `RUNTIME_LOAD_FAILED` |

Cualquier fallo impide la publicación automática.

## 7. Clasificación de reglas

Clases industriales: `DETERMINISTIC`, `GOVERNED_JUDGMENT`,
`UNIMPLEMENTED_GAP`. `GOVERNED_JUDGMENT` nunca se promueve automáticamente.
Toda construcción de razonamiento que el runtime actual no soporte produce
`GENERIC_RUNTIME_EXTENSION_REQUIRED` — una extensión genérica pendiente de
aprobación, nunca una excepción por capacidad.

## 8. Fixtures y harness

Tipos: `SOURCE_DERIVED` (exige `sourceReference`), `ARCHITECTURE_RUNTIME`,
`MANUALLY_GOVERNED`. El resultado esperado puede ser legítimamente `UNKNOWN`,
`CONTRADICTORY`, `NOT_APPLICABLE` o `NEEDS_REVIEW`.

`runRuntimeAcceptance({ pack, fixture })` valida el fixture, valida cada
observación contra el pack, ejecuta `engine.evaluate` y compara estados de
variables, `needsReview`, contradicciones, finding candidates y la ausencia de
findings confirmados. Devuelve `PASS` / `FAIL` / `NEEDS_GOVERNANCE_REVIEW`.
El harness ejecuta cualquier pack sin branching por capacidad.

`runKnowledgeTests` cubre 12 chequeos: `SCHEMA`, `REFERENTIAL_INTEGRITY`,
`PROVENANCE`, `UNKNOWN_PRESERVATION`, `NOT_APPLICABLE_REASON`,
`CONTRADICTION_PRESERVATION`, `EVIDENCE_REQUIREMENTS`,
`ACQUISITION_REFERENCES`, `RULE_CLASSIFICATION`,
`NO_UNSUPPORTED_DETERMINISTIC_CONCLUSIONS`, `GAPS_PRESERVED`,
`VERSION_CHECKSUM_IDENTITY`.

## 9. Publication gate

`DRAFT → VALIDATED → PUBLISHED → SUPERSEDED`. Bloqueos:
`SCHEMA_VALIDATION_FAILED`, `REFERENTIAL_VALIDATION_FAILED`,
`PROVENANCE_MISSING`, `UNAUTHORIZED_INFERENCE`,
`GENERIC_RUNTIME_EXTENSION_REQUIRED`, `PUBLICATION_BLOCKING_GAP`,
`KNOWLEDGE_TEST_FAILED`, `RUNTIME_ACCEPTANCE_FAILED`,
`GOVERNANCE_REVIEW_PENDING`, `GOVERNANCE_REVIEW_REJECTED`.

Sin decisión humana `APPROVED` el estado máximo es `VALIDATED`. Un pack
publicado es inmutable: `assertPublishedPackUnchanged` compara su checksum
contra `published.json`.

## 10. Source-to-pack diff

`sourceToPackDiff` reporta `missingSourceContent`, `addedContent`,
`transformedContent`, `semanticChanges`, `unresolvedMappings` y
`provenanceLoss`. Resolver un `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER` sin
autorización se reporta como cambio semántico. Ninguna modificación semántica
pasa inadvertida: el diff alimenta la validación de gobierno.

## 11. Lote

`runBatch(entradas)` procesa una o N capacidades con aislamiento por capacidad:
un fallo no invalida el lote. Resultado por capacidad: `PASS`, `FAIL`,
`REVIEW_REQUIRED`.

## 12. Frontera de automatización

| Operación | Clase |
| --- | --- |
| `SOURCE_INGESTION` | HUMAN_GOVERNANCE_REQUIRED |
| `SOURCE_STRUCTURE_VALIDATION` | AUTOMATABLE |
| `PACK_CANDIDATE_GENERATION` | AUTOMATABLE |
| `SCHEMA_VALIDATION` | AUTOMATABLE |
| `REFERENTIAL_VALIDATION` | AUTOMATABLE |
| `GOVERNANCE_VALIDATION` | AUTOMATABLE_WITH_VALIDATION |
| `RUNTIME_COMPATIBILITY` | AUTOMATABLE |
| `FIXTURE_AUTHORING` | HUMAN_GOVERNANCE_REQUIRED |
| `FIXTURE_STRUCTURE_VALIDATION` | AUTOMATABLE |
| `KNOWLEDGE_TESTS` | AUTOMATABLE |
| `RUNTIME_ACCEPTANCE` | AUTOMATABLE |
| `SOURCE_TO_PACK_DIFF` | AUTOMATABLE_WITH_VALIDATION |
| `GOVERNANCE_REVIEW` | HUMAN_GOVERNANCE_REQUIRED |
| `PUBLICATION` | HUMAN_GOVERNANCE_REQUIRED |
| `GAP_RESOLUTION` | HUMAN_GOVERNANCE_REQUIRED |

## 13. CLI y CI

```bash
bun run knowledge:pipeline   # ejecuta el lote y muestra el resumen
bun run knowledge:write      # regenera knowledge/manifest.json y los reportes
bun run knowledge:validate   # modo estricto de CI (falla si algo no cuadra)
```

`.github/workflows/knowledge-pipeline.yml` ejecuta `knowledge:validate`, las
pruebas y el typecheck ante cambios en `knowledge/master/**`,
`knowledge/packs/**`, `knowledge/schemas/**`, `knowledge/fixtures/**` y los
paquetes de conocimiento. Un cambio inválido no puede pasar en silencio: el
modo estricto verifica también que el manifest en disco esté al día.

## 14. Independencia arquitectónica

El pipeline vive en el repositorio, se ejecuta con Bun desde `process.cwd()` y
no depende de historial de prompts, estado de Lovable, configuración privada ni
copy/paste manual. Tests de arquitectura verifican que no importa frontend,
Supabase ni Lovable y que no contiene branching por capacidad. Las capacidades
se descubren por directorio (`discoverCapabilityPipelineInputs`), sin lista
literal en código.

## 15. Regresión del Golden Pack OP-01

El pipeline regenera el candidato de OP-01 desde su fuente gobernada y lo
compara con el pack publicado: equivalencia exacta (ignorando `$schema` y
`status`), diff limpio, procedencia y 26 gaps preservados, KCC-AT04-01..13
intactos, 4 fixtures de aceptación en `PASS`, inmutabilidad verificada. El pack
publicado nunca se regenera de forma destructiva.

## 16. Gaps de arquitectura registrados

| ID | Tipo | Enunciado |
| --- | --- | --- |
| `ARCH-M2A-01` | ARCHITECTURE_GAP | La fuente de OP-01 es `GOLDEN_PACK_TRANSCRIPTION`: refleja el pack publicado, no un volcado independiente del Master. Al recibirse el Master completo debe reconciliarse. |
| `ARCH-M2A-02` | ARCHITECTURE_GAP | 30 capacidades sin fuente materializada (`AUTHORITATIVE_SOURCE_REQUIRED`). |
| `ARCH-M2A-03` | ARCHITECTURE_GAP | La publicación de una KnowledgeVersion en base de datos sigue siendo un paso manual de ingeniería; el pipeline valida pero no publica. |

## 17. Qué necesita recibir M2-B

Para procesar el primer lote real, M2-B necesita exactamente:

1. `knowledge/master/v1.0/master.json` actualizado con las capacidades del lote
   marcadas `SOURCE_READY` y su `sourceRef`.
2. Un `knowledge/master/v1.0/capabilities/<ID>/source.json` por capacidad, con
   secciones transcritas del Master, procedencia `APPROVED`, gaps declarados y
   checksum.
3. `governance-review.json` por capacidad cuando el gobierno editorial decida.
4. Fixtures en `knowledge/fixtures/<packId>/` para las capacidades a publicar.

Nada más: generador, validadores, harness, gate, manifest, diff, CLI y CI ya
existen y no requieren cambios por capacidad.
