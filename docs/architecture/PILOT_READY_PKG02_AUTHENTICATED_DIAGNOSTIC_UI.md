# PILOT-READY-01 · PKG-02 · Authenticated Diagnostic UI

## Alcance entregado
Acceso → contexto real (organización/caso) → hub de 6 dominios / 31 capacidades → experiencia genérica de capacidad → respuestas, evidencia y delegación → estados reales → punto de entrada a resultados (placeholder explícito, sin mock).

| Pieza | Archivo |
|---|---|
| Hub autenticado | `src/routes/_authenticated/diagnostico-productivo.tsx`, `src/components/diagnostico/catalogo-capacidades.tsx` |
| Capacidad genérica | `src/routes/_authenticated/capacidad.$id.tsx` (OP-01 redirige a su pantalla Golden, intacta) |
| Renderer por modo | `src/components/capacidad/acquisition-renderer.tsx`, `acquisition-input.tsx` |
| Evidencia / colaboración | `src/components/capacidad/evidencia-panel.tsx`, `colaboracion-panel.tsx` |
| Aceptación de invitación | `src/routes/invitacion.tsx` + `acceptInvitationHandler` |
| Resultados | `src/routes/_authenticated/resultados-productivos.tsx` (PKG-03 pendiente, declarado) |
| Workspace server-side | `src/lib/production/actionable.ts`, `getCapabilityWorkspaceHandler`, `getDiagnosticHubHandler` |
| Aislamiento por capacidad | `src/lib/production/capability-scope.ts` |

## Decisiones
1. **Server-authoritative.** Estado accionable, tareas pendientes y conteos los calcula el servidor con Engine 0.2.0 + pack publicado. El frontend solo renderiza.
2. **Sin texto inventado.** Preguntas literales solo cuando el pack las trae (`question`). `INFORMATION_NEED` muestra el `statement` literal de la NI; `GOVERNED_STRUCTURAL_CORRESPONDENCE` muestra variable y declaración de correspondencia literales; `CAPABILITY_PROGRESSIVE` usa sus preguntas P1 literales. Sin orden ordinal inventado entre tareas.
3. **Aislamiento en Assessment compartido.** El runtime reutiliza un BASELINE anclado a `PYMAPA-RUNTIME-MANIFEST 1.0.0` para las 31 capacidades y los IDs (`ACQ·NI01`, `VA01`) se repiten entre packs. Se etiqueta `capabilityId` en el JSON de `responses.payload` / `observations.value` y se filtran lecturas. Filas históricas sin etiqueta pertenecen a OP-01 (única capacidad activa antes de PKG-01). Sin migración.
4. **Estados.** `NOT_STARTED | IN_PROGRESS | AWAITING_INFORMATION | NEEDS_CLARIFICATION | ACQUISITION_EXHAUSTED`. Ninguno declara completitud diagnóstica universal. Capacidades mixtas (OP-03/04) no se agotan al acabar las preguntas si quedan NI.
5. **CONTRADICTORY** exige ≥2 observaciones previas en conflicto (regla del Engine), igual que OP-01.
6. **Invitaciones.** Token aleatorio mostrado una sola vez en el fragmento `/invitacion#<token>`; solo se persiste el hash. La aceptación exige invitación pendiente, no expirada, email coincidente; activa al respondent y no crea Membership (el invitado queda limitado a Case + Assessment + Assignment Scope).

## Sin cambios
Engine 0.2.0, 31 packs publicados, Knowledge Master, EvaluationRuns/snapshots históricos, schema, migraciones, RLS. `git status` no muestra cambios en `knowledge/`, `packages/knowledge-engine/` ni `supabase/migrations/`.

## Verificación
- `tsgo --noEmit`: OK.
- `vitest run`: 37 archivos, **822/822** (incluye `pkg02-journey.test.ts`: literal, INFORMATION_NEED, correspondencia, mixtas, estados, CONTRADICTORY sin fuentes rechazado, aislamiento, legado OP-01, invitación, 31 sin EC-01, fail-closed, sin mocks/legacy en pantallas productivas, proyector server-only).
- `knowledge:validate`, `knowledge:seal:check`, `knowledge:factory:check`: OK.
- `vite build`: OK.
- Navegador: sin sesión, `/diagnostico-productivo` y `/capacidad/DG-01` redirigen a `/acceso` (compuerta correcta). **No se pudo probar con sesión iniciada en el navegador**: el proyecto no tiene cuenta de prueba para el usuario solicitante. Queda como verificación manual pendiente.

## Limitaciones conocidas
- El hub evalúa 31 capacidades por solicitud (lecturas memoizadas); optimizar si la latencia lo exige.
- La aceptación de invitación hace dos escrituras secuenciales (respondent, invitation) sin transacción; un fallo intermedio deja la invitación PENDING y se puede reintentar.

PKG02_COMPLETE_READY_FOR_PKG03
