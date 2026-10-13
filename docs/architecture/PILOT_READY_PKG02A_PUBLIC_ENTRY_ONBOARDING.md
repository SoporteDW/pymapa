# PILOT-READY-01 · PKG-02A · Public Entry & Real Company Onboarding

## 1. Root cause corrected
The Home CTA "Iniciar mi recorrido" pointed to legacy `/perfil` (MVP Alfa, localStorage, demo state). It now enters the production journey.

## 2. Files changed
- New: `src/lib/production/entrada.ts` (pure routing/identity rules), `src/lib/production/company-handlers.ts`, `src/lib/production/company.functions.ts`, `src/routes/_authenticated/empresa.tsx`, `src/components/layout/production-sidebar.tsx`, `src/lib/production/pkg02a-entrada.test.ts`.
- Modified: `src/routes/index.tsx`, `src/routes/acceso.tsx`, `src/routes/__root.tsx`, `src/components/layout/app-header.tsx`, `mobile-nav.tsx`, `app-footer.tsx`, `src/lib/production/pkg02-journey.test.ts` (login destination assertion now `/empresa`).
- Not modified: Knowledge Engine, packs, Master, migrations/RLS, historical runs/snapshots/knowledge versions.

## 3. Public CTA routing
- Unauthenticated → `/acceso`.
- Authenticated → `/empresa`: name missing/provisional → onboarding form; otherwise immediate redirect to `/diagnostico-productivo`.
- After login `/acceso` → `/empresa` (same rule). Moda Origen CTA unchanged (`/moda-origen`), relabelled "Explorar la demostración".

## 4. New company onboarding
Only field: company name (2–120 chars, provisional name rejected). Confirmation card with a single primary action "Ir a mi diagnóstico". No percentages or stage completion shown.

## 5. PostgreSQL persistence
`getCompany` / `updateCompanyName` (both `requireSupabaseAuth`) resolve the organization via `asegurarContextoProductivo` (bootstrap_organization get-or-create → membership → case → BASELINE assessment pinned to `PYMAPA-RUNTIME-MANIFEST 1.0.0`) and update `organizations.name` with the user's client (RLS `organizations_update_admins`). No localStorage.

## 6. Existing-user continuity
Bootstrap and case/assessment lookups are get-or-create; repeated logins reuse the same org/case/assessment. Existing named organizations are never renamed automatically (only via explicit "Mi empresa" edit, `?editar=true`).

## 7. Production navigation
On production routes (`/empresa`, `/diagnostico-productivo`, `/capacidad/*`, `/resultados-productivos`, `/acceso`, `/invitacion`) the shell uses `ProductionSidebar`: Diagnóstico, Capacidad de referencia (OP-01), Resultados (preliminar), Mi empresa, Ayuda; logout in header. Hidden there: "MVP Alfa" labels, DemoBanner, simulated assistant, legacy `/perfil` link, localStorage progress. Header shows the company name from PostgreSQL.

## 8. Demo isolation
Moda Origen remains in its legacy localStorage sandbox; it never calls production server functions. Production onboarding never reads `useSesion`/`useModoDemo`/mocks. Legacy data was isolated, not deleted.

## 9. Tenant/security validation
Browser-supplied `organizationId` is ignored (input schema only accepts `name`). Role checked server-side (OWNER/ADMIN) plus RLS; RLS-filtered update fails closed (`FORBIDDEN`). No admin client used. Tests cover MEMBER rejection and cross-tenant attempts.

## 10. Tests and validation
- Test suite: 840/840 (38 files), including 19 new PKG-02A tests (A–F).
- Typecheck: clean. Production build: OK.
- `knowledge:validate`, `knowledge:seal:check`, `knowledge:factory:check`: exit 0.
- Browser: unauthenticated Home CTA → `/acceso`; production shell shows no `/perfil` link and no "MVP Alfa".

## 11. Remaining UX/profile limitations
- Only company name is collected; sector, size, country, etc. need a governed context contract (later package).
- "Capacidades" entry links to OP-01 reference; the full 31-capability list is the Diagnóstico hub.
- Legacy routes (`/inicio`, `/perfil`, …) still exist for the demo sandbox; the header "Ver demostraciones" stays available.
- Authenticated end-to-end browser run not performed in this sandbox (no injected session); covered by handler tests.

## 12. Blockers for human acceptance
None known. Email confirmation on sign-up follows current auth settings.

PKG02A_COMPLETE_READY_FOR_HUMAN_ACCEPTANCE
