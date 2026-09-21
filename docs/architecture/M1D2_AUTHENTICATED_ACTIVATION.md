# M1-D2 · Activación productiva autenticada (OP-01)

Objetivo: ejecutar OP01-P01 desde la aplicación real con sesión autenticada,
sin introducir conocimiento diagnóstico en el frontend.

## Autenticación
- `src/hooks/use-auth.ts` — sesión Supabase (`onAuthStateChange` + `getSession`),
  `signIn`, `signUp`, `signOut`, `isHydrated`.
- `src/routes/acceso.tsx` — ruta pública `/acceso` (email + contraseña).
  Si ya hay sesión, redirige a `/capacidad/op-01`.
- `src/routes/_authenticated/route.tsx` — layout `ssr: false` que valida
  `supabase.auth.getUser()` y redirige a `/acceso`.
- `src/components/layout/app-header.tsx` — acción de entrar / salir.

## Tenant bootstrap
- Función `public.bootstrap_organization(_name text)` `SECURITY DEFINER`:
  opera solo sobre `auth.uid()`; devuelve la organización donde el usuario ya
  tiene membership o crea organización + membership `OWNER`.
- No se crean organizaciones desde el browser con inserts directos, y la
  membership se vuelve a verificar con el cliente del usuario (RLS activa)
  antes de tocar `cases` / `assessments`.

## Case + Assessment
- `src/lib/production/runtime.server.ts` → `asegurarContextoProductivo(db, userId)`:
  organización → membership verificada → case productivo (`get or create`) →
  assessment `BASELINE` abierto, pinneado a la `knowledge_versions` publicada
  del pack (`identifier` OP-01, `status = PUBLISHED`, mayor `published_at`).
- Sin `localStorage` en este recorrido: la fuente de verdad es PostgreSQL.

## Routing de motor
- `PRODUCTION_CAPABILITY_IDS = ["OP-01"]`; el resto sigue en `MVP_ENGINE`.
  `src/lib/motor` y las 12 capacidades del MVP no se tocan.

## Recorrido visible
`/acceso` → login → `/capacidad/op-01`: la pregunta llega del Knowledge Pack vía
`AssessmentClient` → `op01.functions.ts` → caso de uso → engine; al enviar se
escribe la respuesta y se muestra el `AssessmentState` devuelto por el core.

## Tablas escritas en el recorrido real
`organizations`, `memberships`, `cases`, `assessments`, `responses`,
`observations`, `evaluation_runs`, `variable_evaluations`,
`information_need_states`.

## Tests
`src/lib/production/activacion-op01.test.ts` (12 pruebas): sesión requerida,
membership requerido, aislamiento entre organizaciones, pinning de
KnowledgeVersion, ruteo OP-01 → PRODUCTION_ENGINE, otra capacidad en
MVP_ENGINE, P01 servido desde el pack, submission → EvaluationRun, ausencia de
credenciales privilegiadas en el frontend. Total suite: 283 verdes.
