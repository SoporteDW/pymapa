# M1-M · OP-01 Production Closure & Industrialization Readiness Gate

Estado al cierre: **387 tests verdes (24 archivos)**, `tsgo --noEmit` limpio, security scan sin
hallazgos abiertos. M1-M no añadió funcionalidad de producto: auditó el vertical productivo de
OP-01, corrigió defectos arquitectónicos y midió si el patrón sirve para industrializar el resto
del Knowledge Master.

Base heredada: M1-KL aprobado y congelado (369 tests). Los 18 tests nuevos son exclusivamente del
closure gate (`src/lib/production/cierre-m1m.test.ts`).

No existe una segunda KnowledgeVersion publicada real. El cambio de versión sigue cubierto por
tests contractuales (KV A → KV B) y **no se fabricó ninguna versión ficticia**.

---

## 1. Full vertical audit

Recorrido auditado end-to-end sobre la app real y el código:

Auth → Organization/Membership → Case → Assessment (pinneado) → KnowledgeVersion → Knowledge Pack →
Adaptive Acquisition → Response → Evidence → Observation → EvaluationRun → Finding Candidate →
RecommendationCandidate → Intervention → Activity → Deliverable → Done → CRV → Validation →
Follow-up → Reassessment.

| Paso | Estado | Nota |
|---|---|---|
| Auth / sesión / logout | PRODUCTIVO | Supabase Auth, `/acceso` |
| Organization + Membership (bootstrap) | PRODUCTIVO | `bootstrap_organization()` + revalidación RLS |
| Case / Assessment / pinning | PRODUCTIVO | `assessments.knowledge_version_id` obligatorio |
| Knowledge Pack / KnowledgeVersion | PRODUCTIVO | pack versionado en repo + checksum |
| Adaptive Acquisition / Response | PRODUCTIVO | decisión en el engine, no en la UI |
| Evidence (storage privado) | PRODUCTIVO | bucket privado + links de observación |
| Observation / EvaluationRun | PRODUCTIVO | server-side, con KV + EngineVersion |
| Finding / RecommendationCandidate | PRODUCTIVO | nacen en revisión humana salvo determinísticos |
| Intervention / Activity / Deliverable / Done | PRODUCTIVO | objetos separados, transiciones gobernadas |
| CRV / Validation / Follow-up | PRODUCTIVO | único CRV explícito: A04 |
| Reassessment / Comparison | PRODUCTIVO | Assessment nuevo, Baseline inmutable |

Sin mocks, sin demo state y sin `localStorage` en ningún módulo del vertical productivo
(`caso-uso.ts`, `puertos.ts`, `runtime.server.ts`, `op01.functions.ts`, `services/production/*`).
Verificado además por test automático, no solo por inspección.

## 2. Knowledge leakage audit

Resultado: **sin leakage de conocimiento diagnóstico**. El contenido gobernado (variables,
information needs, adquisiciones, reglas, findings H01–H08, R01–R09, A01–A09, CRV-A04-01, KCC) vive
únicamente en `knowledge/packs/op-01/1.0.0/pack.json`. En código solo aparecen identificadores de
routing (`"OP-01"` como id de capacidad, `OP01-P01` en fixtures/tests) y textos de UI genéricos. Los
mapeos H↔R↔VA no están duplicados en documentación.

Defecto detectado y corregido: `runtime.server.ts` importaba el pack de OP-01 de forma estática y
exponía `cargarEngineOp01`. Ahora hay un registro genérico (`PACKS_REGISTRADOS`) con
`cargarEngine(packId)` / `checksumPack(packId)` y error `KNOWLEDGE_PACK_NOT_REGISTERED`; los alias
anteriores se conservan solo por compatibilidad.

## 3. Generic Engine audit

`packages/knowledge-engine` y `packages/knowledge-schema` no contienen ninguna comparación contra un
identificador de capacidad concreto (`capabilityId ===`, `"OP-0x"`), verificado por test. Las
primitivas genéricas expuestas son: KnowledgeState, InformationNeed, Acquisition, EvidenceRequirement,
Observation, Evaluation (con contradicción y UNKNOWN ≠ NO), Finding Candidate,
RecommendationCandidate, ValidationRequirement, comparación de estados y lineage.

Prueba estructural: el mismo engine interpreta un pack con otro `capability.id` sin cambios de
código (fixture estructural, sin conocimiento inventado y sin publicarse como KnowledgeVersion).

## 4. Frontend boundary audit

El frontend representa estado, captura input e invoca contratos. Ningún archivo de
`src/routes`, `src/components` o `src/hooks` importa `caso-uso`, `puertos`, `runtime.server` ni el
cliente con service role. `capacidad.op-01.tsx` solo renderiza valores ya decididos por el servidor
(contradicción, polaridad, severidad cualitativa, suficiencia, estados de CRV/Validation).

Tests añadidos en este bloque cierran los huecos detectados: ausencia de autoridad diagnóstica en el
frontend y ausencia de imports del núcleo productivo desde la capa de presentación.

## 5. MVP_ENGINE coexistence

`MVP_ENGINE` sigue existiendo y gobernando las otras capacidades; no se eliminó nada. Está
demostrado por test que el vertical productivo de OP-01 no importa `src/lib/motor`,
`src/lib/diagnostico` (scoring/repositorio), mocks ni `localStorage`.

Dependencia MVP restante, acotada y documentada: `assessment-adapter.ts` usa un import **de tipos**
de `@/lib/diagnostico/tipos` para el adaptador MVP; no participa de la rama `PRODUCTION_ENGINE`.

## 6. Lovable independence audit

Para ejecutar OP-01 basta: repositorio GitHub + `supabase/migrations` + secretos/infra de Supabase +
los Knowledge Packs versionados. Nada necesario vive solo en prompts, historial de Lovable o estado
no versionado. Se añadieron los scripts estándar `npm test` y `npm run typecheck`, que faltaban.
No se incluyen secretos en este reporte; un test verifica que no hay claves de servicio ni literales
secretos en el código versionado del frontend.

## 7. Knowledge version audit

- Todo Assessment está pinneado a una KnowledgeVersion; una versión distinta a la fijada es
  rechazada (`KNOWLEDGE_VERSION_MISMATCH`).
- Todo EvaluationRun registra KnowledgeVersion + EngineVersion.
- `published` no cambia silenciosamente: histórico no se recalcula.
- Reassessment es siempre un Assessment nuevo; Baseline conserva su KV original.
- El test contractual A→B se mantiene; no se creó una segunda versión ficticia.

## 8. Provenance & reproducibility audit

Test end-to-end de lineage sobre un recorrido real: Response → Observation → EvaluationRun →
Finding (con `evaluationRunId`, KV y EngineVersion) → RecommendationCandidate (tras revisión humana)
→ Intervention → Activity → Deliverable → Done → ValidationRequirement (CRV-A04-01) → 3 casos →
Validation VALIDATED con `activityId`, `interventionId`, `validationRequirementId`, KV, EngineVersion
y `reviewedBy`. **Sin rupturas de lineage detectadas.**

## 9. Security audit

Hallazgo corregido: `RLS_EXPOSURE` (error) — cualquier usuario autenticado podía leer todos los
registros de `knowledge_versions`. Se reemplazó la política por `knowledge_versions_read_published`,
que expone solo versiones `PUBLISHED`/`SUPERSEDED`.

Verificado además: aislamiento por tenant en todas las tablas productivas vía
`private.is_organization_member`, escrituras del engine solo server-side (`service_role`), evidencia
en bucket privado, alcance de assignment para respondents externos, permiso de validación separado
del de aportar evidencia, funciones `SECURITY DEFINER` con `search_path` fijo, y ausencia de secretos
en el navegador. Security scan final sin hallazgos.

## 10. Industrialization simulation (segunda capability, sin implementarla)

| Categoría | Clasificación | Qué haría falta |
|---|---|---|
| Knowledge Pack | CAPABILITY-SPECIFIC DEVELOPMENT | Autoría del pack desde el Knowledge Master aprobado (único trabajo inevitable) |
| Knowledge Schema | NO CHANGE | Ya es genérico; solo cambia si el Master introduce un tipo de conocimiento nuevo |
| Knowledge Engine | NO CHANGE | Sin semántica de capacidad; interpreta cualquier pack válido |
| Application Core | CONFIGURATION-ONLY | Registrar el pack en `PACKS_REGISTRADOS` y añadir el id a `PRODUCTION_CAPABILITY_IDS` |
| Database | NO CHANGE | Tablas y enums son genéricos por capacidad |
| API / contracts | NO CHANGE | Contratos parametrizados por assessment/capacidad |
| Frontend | CONFIGURATION-ONLY | Routing de la capacidad; la pantalla productiva es genérica en su contenido |
| RLS | NO CHANGE | Políticas por organización, no por capacidad |
| Tests | GENERIC EXTENSION | Fixtures + acceptance tests del nuevo pack, reutilizando los helpers existentes |

Conclusión: no quedan dependencias estructurales de OP-01 fuera del propio pack y de dos puntos de
registro explícitos.

## 11. Capability onboarding contract

Documentado en `docs/architecture/CAPABILITY_ONBOARDING.md`: Knowledge Master → Knowledge Pack →
Schema validation → Fixtures → Knowledge tests → Runtime acceptance tests → Registrar el pack →
Publish KnowledgeVersion → Enable capability. Automatizables hoy: validación de schema de todos los
packs (ya corre en la suite), checksum, y los acceptance tests genéricos. No automatizable: la
autoría del pack y la aprobación humana del conocimiento.

## 12. Knowledge gaps registry (sin resolver)

| Referencia | Tipo | Contenido |
|---|---|---|
| KCC-AT04-01..04 | NOT EXPLICIT IN KNOWLEDGE MASTER | Umbrales/criterios no enunciados en AT-04 |
| KCC-AT04-05..08 | NOT EXPLICIT IN KNOWLEDGE MASTER | Definiciones de suficiencia/contradicción no cerradas |
| KCC-AT04-09..11 | NOT EXPLICIT IN KNOWLEDGE MASTER | Severidad, prioridad y contenido de R01–R09 / A01–A09 |
| KCC-AT04-12..13 | NOT EXPLICIT IN KNOWLEDGE MASTER | CRV ausentes para actividades distintas de A04 |
| Severidad/prioridad numérica | KNOWLEDGE CHANGE CANDIDATE | Requeriría decisión del Knowledge Master, no inferencia |
| Segunda KnowledgeVersion publicada real | ARCHITECTURE GAP | Soportada y testeada; sin caso real todavía |
| Referencias cross-capability no ejecutables | ARCHITECTURE GAP | Registradas; destino no ejecuta hasta cargar esa capacidad |

Ningún gap fue resuelto por inferencia.

## 13. Tests

387 verdes (369 heredados + 18 del gate). Los nuevos cubren: independencia de MVP_ENGINE, frontend
sin autoridad diagnóstica, engine sin branching semántico por capacidad, validación de schema de
todos los packs, version pinning, reproducibilidad histórica, lineage end-to-end, aislamiento
cross-tenant, onboarding sin copiar el engine y ausencia de secretos privilegiados en el frontend.
`tsgo --noEmit` limpio.

## 14. Defectos encontrados y corregidos en M1-M

1. RLS: `knowledge_versions` legible completo por cualquier autenticado → política limitada a
   PUBLISHED/SUPERSEDED.
2. Acoplamiento: carga estática del pack de OP-01 en el runtime → registro genérico de packs.
3. Independencia operativa: faltaban los scripts `test` y `typecheck` en `package.json`.
4. Cobertura: faltaban tests de frontera (frontend/MVP/engine/lineage) → añadidos como closure gate.

## 15. Blockers y conclusión

Blockers para producto (no para arquitectura): severidad y prioridad no gobernadas; contenido de
R01–R09 y A01–A09 ausente; CRV explícito solo para A04; segunda KnowledgeVersion publicada aún
inexistente.

**Conclusión factual:** el patrón productivo de OP-01 está listo para industrializar nuevas
capacidades. Incorporar una segunda capability no exige cambios en engine, schema, base de datos,
contratos ni RLS: exige el Knowledge Pack aprobado y dos registros de configuración. El límite real
para escalar a 31 capacidades no es arquitectónico, es la disponibilidad de conocimiento aprobado en
el Knowledge Master.

M1-M cerrado. No se implementó ninguna capability nueva.
