# SPRINT-04-FIX · Product Integration & Acceptance Correction

## 1. Root causes corrected
- **OUT_OF_ASSIGNMENT_SCOPE across capabilities** — `asegurarRespondentPropio` reused the respondent's first non-revoked assignment (e.g. `CAPABILITY:DG-01`) for any capability, so it never created the PC-01 assignment and the use case rejected. Now it only reuses an assignment that covers the requested acquisition (or capability), checking respondent, assessment and status; OWNER/ADMIN get one auditable `CAPABILITY` assignment per capability on first participation; MEMBER/delegated respondents are never auto-granted.
- **Granular scopes crossing packs** — `INFORMATION_NEED`/`SECTION` refs (`NI01`) repeat between packs. New invitations store `<capability>::<ref>`; unqualified historical refs belong to the historical untagged capability (same rule as `capability-scope.ts`). Invitations whose scope is outside the current capability are rejected (`SCOPE_OUTSIDE_CAPABILITY`).
- **Collaboration panel showing other capabilities** — assignments are filtered to the capability; evidence is returned with `relation`: `CAPABILITY` (linked to this capability's observations) or `ORGANIZATION` (reusable, shown separately, never attributed). Linking evidence to another capability's observation is rejected.
- **UI state leaking between capabilities** — the generic capability route remounts on `capabilityId` (`key`).
- **Shell switching to MVP Alfa** — `modoShell()` in `entrada.ts` is the single shell authority; `/ayuda` is productive; authenticated `/` uses the production shell; other legacy routes stay explicit demo (with banner).
- **Help content** — rewritten to describe real persistence, onboarding, capabilities, evidence, collaboration and preliminary results.
- **OP-01 duplicate entry** — removed from sidebar; reached from the 31-capability catalog (generic route redirects to its Golden screen, kept until parity is verified).
- Pre-existing typecheck error in `__root.tsx` ErrorComponent fixed.

No DB migration, no changes to packs, Knowledge Master, Engine 0.2.0, historical runs/snapshots or knowledge versions.

## 2. Files changed
`caso-uso.ts`, `capability-handlers.ts`, `entrada.ts`, `__root.tsx`, `production-sidebar.tsx`, `capacidad.$id.tsx`, `evidencia-panel.tsx`, `ayuda.tsx`; new `sprint04-integracion.test.ts`.

## 3. Tests added
`sprint04-integracion.test.ts` (11) drives the real handlers with only the PostgreSQL client and context bootstrap substituted: A three capabilities sequentially by OWNER; B MEMBER rejected / delegated DG-01 rejected on PC-01 / qualified NI scope / invite outside scope / evidence link outside scope; C remount key; D evidence reuse without contamination; E shell authority; F Help content; G OP-01 catalog. H (cold-start onboarding, membership, knowledge-version integrity) remains covered by `pkg02a-entrada.test.ts` and `pkg01-runtime.test.ts`.

## 4. Results
851/851 tests, typecheck clean, `knowledge:validate`, `knowledge:seal:check`, `knowledge:factory:check` PASS.

## 5. Authenticated browser verification (owner session, preview)
PC-01 → DT-01 → DG-02 answered sequentially; each count increased after reload (persisted). DG-01 already complete. Collaboration panel shows only the current capability's assignment; other evidence appears collapsed as "Otras evidencias de tu organización". `/ayuda` renders in the production shell. Test answers ("Prueba de aceptación Sprint 04") were written to the owner's real assessment.

## 6. Not verified
Invited/delegated respondent in a real browser session; file upload of evidence in browser; mobile navigation; published domain.

## 7. Known limitations
Evidence without an observation link is shown as organization evidence (no capability column exists). OP-01 still uses its dedicated Golden screen. Results remain preliminary. Legacy MVP Alfa routes still exist as demo.

SPRINT04_FIX_CODE_COMPLETE_PENDING_HUMAN_ACCEPTANCE
