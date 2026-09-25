# PILOT-READY-01 · PKG-01 · Runtime & API genérico — desbloqueo de 31 capacidades

## 1. Archivos creados
- `src/lib/production/packs-registry.ts` — registro estático de los 31 packs publicados.
- `src/lib/production/capability-handlers.ts` — handlers genéricos del boundary (parametrizados por `capabilityId`).
- `src/lib/production/capabilities.functions.ts` — 26 server functions genéricas (auth obligatoria).
- `src/lib/production/pkg01-runtime.test.ts` — batería PKG-01 (A–F).
- este documento.

## 2. Archivos modificados
- `src/lib/production/runtime.server.ts` — loader genérico, runtime manifest, resolución inmutable de KnowledgeVersion, bootstrap por capacidad.
- `src/lib/production/op01.functions.ts` — superficie OP-01 preservada (25 funciones, mismos nombres/entradas/salidas) que delega con `capabilityId = "OP-01"`.
- `src/lib/production/caso-uso.ts` — `ProductionDeps.packChecksum?` opcional y `capabilityPack` en snapshots nuevos.
- `src/services/production/execution-source.ts` — 31 IDs → `PRODUCTION_ENGINE`.
- `src/services/production/production-client.ts` — `createProductionAssessmentClient(capabilityId = "OP-01")`.
- `src/hooks/use-diagnostico.ts` — pasa el `capabilityId` al cliente (sin cambio visual; las IDs del MVP siguen en MVP_ENGINE).
- Tests guardia: `arquitectura.test.ts`, `activacion-op01.test.ts` (expectativa "solo OP-01" → "31 publicadas").

Sin cambios: `packages/knowledge-engine/**`, `knowledge/packs/**`, `knowledge/master/**`, `supabase/migrations/**`, RLS, rutas UI, resultados/dashboard (verificado por `git status`).

## 3. Registro de 31 packs
Imports estáticos de `pack.json` + `published.json` por capacidad (OP-01..05, DG-01..05, PC-01..05, DT-01..06, CM-01..06, EC-02..05; EC-01 excluida). Al primer uso verifica por entrada: `capability.id` = clave, `published.status = PUBLISHED`, identidad packId/packVersion, y checksum canónico (`sha256` de JSON con claves ordenadas, mismo algoritmo del pipeline) = `published.json.checksum`. Cualquier fallo → `KNOWLEDGE_PACK_INTEGRITY_ERROR`; ID desconocido → `KNOWLEDGE_PACK_NOT_REGISTERED`. API: `getPack`, `getRegisteredPack`, `isPublishedCapability`, `listPublishedCapabilities`, `computeRuntimeManifestChecksum`.

## 4. Runtime manifest
- identifier `PYMAPA-RUNTIME-MANIFEST` · version `1.0.0` · status `PUBLISHED`
- checksum = `sha256(canonicalJson({identifier, version, packs:[{capabilityId, packId, packVersion, packChecksum}] ordenados}))`
- valor actual: `sha256:fce3f229491a608f9057faf9c4db5669a9af912b742f219824cbee6d7d734e1d`
- Evolución: un pack 1.0.1 ⇒ nuevo release `PYMAPA-RUNTIME-MANIFEST 1.0.1` (el checksum cambia y el 1.0.0 existente fallaría cerrado).

## 5. Fila histórica intacta
`PYMAPA-KNOWLEDGE-MASTER 1.0.0` (checksum M1 = sha256 hex de `JSON.stringify(pack OP-01)`, algoritmo conservado en `checksumPack`) no se crea, no se actualiza ni se reinterpreta: solo se lee y se verifica por checksum para seguir sirviendo a los assessments OP-01 existentes. `resolverKnowledgeVersionInmutable` nunca emite UPDATE (test estático: sin `.update/.upsert/.delete` sobre `knowledge_versions`). Sin backfill, sin migración.

Cobertura declarativa por release (`coberturaDeReleases`): M1 → [OP-01]; runtime manifest → 31. El bootstrap busca el BASELINE más antiguo del Case pinneado a un release que cubre la capacidad: usuarios OP-01 existentes continúan en su assessment histórico; cualquier assessment nuevo se pinnea al runtime manifest.

## 6. Loader genérico
`cargarEngine(capabilityId)` → registro → `createKnowledgeEngine` (Engine 0.2.0), cacheado por capacidad, sin ramas por capacidad. Alias: `cargarEngineOp01()`, `checksumPackOp01()`. Extras: `identidadPack`, `listarCapacidadesDisponibles`.

## 7. Server functions genéricas
`listAvailableCapabilities` + versiones `*Capability*` de las 25 operaciones OP-01 (context, assessment state, next acquisition, submit response, collaboration, invite, evidence, findings, review, recomendaciones, intervenciones, actividades, entregables, Done, CRV, validación, follow-up, reassessment, comparación, validation). Todas con `requireSupabaseAuth` y `capabilityId` validado (`^[A-Z]{2}-\d{2}$` + registro, fail-closed). Reutilizan `caso-uso.ts` sin duplicar lógica.

## 8. Compatibilidad OP-01
Mismos nombres, validadores y payloads; la ruta protegida OP-01 no se modificó. Todos los tests OP-01 en verde.

## 9. Cliente
`createProductionAssessmentClient(capabilityId?)`: OP-01 usa las funciones OP-01 históricas; otras capacidades usan el boundary genérico inyectando `capabilityId`. Misma interfaz `ProductionAssessmentClient`.

## 10. Pruebas representativas (OP-02, DG-01, PC-01, DT-04, CM-01, EC-02)
Carga de pack, Engine `pymapa-knowledge-engine/0.2.0`, reutilización, estado, adquisición, respuesta aceptada, EvaluationRun con engine 0.2.0, findings y findings en espera de resolución — sin código OP-01. Nota: en capacidades `INFORMATION_NEED` (p. ej. DG-01, PC-01) Engine 0.2.0 devuelve `getNextAcquisition = null` porque no hay pregunta literal; la vía se adquiere por su id gobernado (`ACQ·NIxx`). No se inventaron preguntas.

## 11. Snapshots / versionado
Snapshots nuevos añaden `capabilityPack {capabilityId, packVersion, packChecksum}`; sin checksum el payload queda idéntico al histórico. Assessments no ganan `capability_id`; un Assessment sigue siendo el diagnóstico completo del Case.

## 12. Totales
798/798 tests (36 archivos), antes 774.

## 13. Verificaciones
typecheck OK · `knowledge:validate` OK · `knowledge:seal:check` OK · `knowledge:factory:check` sin FAIL · integridad de los 31 packs y del runtime manifest verificada por tests · build OK · schema/RLS sin cambios (sin migraciones).

## 14. Pendientes antes de PKG-02
Ninguno bloqueante. Para PKG-02: la UI debe presentar las vías `INFORMATION_NEED` (sin pregunta literal) usando el id de adquisición y su `responseModel`, ya que `getNextAcquisition` no las propone.

PKG01_COMPLETE_READY_FOR_PKG02
