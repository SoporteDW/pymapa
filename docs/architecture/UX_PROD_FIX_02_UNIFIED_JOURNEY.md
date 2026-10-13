# UX-PROD-FIX-02 · Unified Product Journey & Diagnostic Experience

## 1. Workstreams implemented
1. **One product.** `destinoRutaLegacy()` (`src/lib/production/entrada.ts`) + root `beforeLoad` redirect every legacy route (perfil, inicio, diagnostico/*, resultados/*, dashboard, plan-de-accion, roadmap, seguimiento, proyecto, colaboracion, apoyo, cohorte, demostracion, moda-origen) to its production destination. Legacy code is preserved, just unreachable. Header no longer links to demos; avatar always goes to `/empresa`; 404/error pages point to production; Home no longer links to the simulated Moda Origen demo and describes the future demo as a real isolated company on the same workflow (not built).
2. **Response history & governed correction.** Workspace returns `responseHistory` (acquisition, literal label, value, date, respondent, corrected/correction flags, `canCorrect`). Correction = new Response+Observation carrying `correctsObservationId`; `observacionesVigentes()` excludes corrected observations before the Engine evaluates. No row is deleted or rewritten. Only the original respondent or OWNER/ADMIN may correct (`CORRECTION_NOT_AUTHORIZED`); a target can be corrected once and only by the same acquisition (`CORRECTION_TARGET_INVALID`).
3. **Clarification.** `clarificationDetails` explains each contradiction from Engine provenance (`DECLARED_CONTRADICTORY` vs `DIVERGENT_VALUES`), lists the conflicting responses and offers "Corregir". When the pack declares no clarification acquisition (DG-02), the UI says so explicitly and correction is the resolution path. State only changes when the Engine re-evaluates without contradiction.
4. **Evidence.** Three groups: linked to this capability / uploaded here pending link / organization documents for reuse. Each shows upload date, uploader, upload context (new nullable column `evidence.upload_context_capability_id`; historical rows show "no registrado"), and explicit links (capability + acquisition). New `linkCapabilityEvidence` links an existing document to a response of this capability (tenant + capability checked). Linking ≠ validated ≠ need satisfied.
5. **Counters & performance.** Counts now separate literal questions (`literalQuestions`/`pendingQuestions`) from information requirements (`informationTasks`/`pendingInformationTasks`) and clarifications. Hub: Organization→Case→Assessment bootstrap resolved once per coverage group (was 31× in series) + bounded concurrency (8). Client: after saving, the freshly evaluated workspace patches the hub cache immediately, then the hub revalidates.
6. **Results & Help.** `/resultados-productivos` shows only countable metrics from persisted records (capabilities with activity, active responses, pending questions, pending requirements, clarifications, documents uploaded/linked, preliminary findings) per six domains/31 capabilities. No maturity %, no completion %, no ranking; the "Para continuar" list is labelled a navigation suggestion. Help rewritten for SME owners, stating what is not available yet.

## 2. Files changed
`src/lib/production/{entrada,caso-uso,capability-handlers,capabilities.functions,actionable,puertos,runtime.server}.ts`, `src/routes/{__root,index,ayuda}.tsx`, `src/routes/_authenticated/{capacidad.$id,resultados-productivos}.tsx`, `src/components/layout/app-header.tsx`, `src/components/capacidad/evidencia-panel.tsx`, `src/components/diagnostico/catalogo-capacidades.tsx`, tests `ux-prod-fix02.test.ts` (new), `pkg02a-entrada.test.ts` (2 superseded assertions updated), migration adding `evidence.upload_context_capability_id`.

## 3. Root causes addressed
- DG-02 dead end: ACQ·NI06 was saved as "Hay versiones que se contradicen" (declared CONTRADICTORY citing NI01/NI03). DG-02 has no clarification acquisition, so the screen had nothing to offer.
- OP-01/OP-02 "0 pending": cards only showed information-requirement counts; literal questions were not counted.
- Slow hub: 31 sequential bootstraps (~5 DB round trips each) + sequential evaluation.
- Evidence confusion: no upload context, no link provenance, contradictory empty-state text.

## 4. Hub latency (dev sandbox, authenticated Digiway session, 3 loads)
- Before: 29.2 s / 26.6 s / 27.1 s (server fn ≈ 25–27 s)
- After: 6.1 s (cold) / 3.6 s / 3.0 s

## 5. Tests
- Typecheck clean. Full suite 862/862 (40 files). New acceptance file covers: legacy redirects & no demo links (1), history + correction + DG-02-style clarification resolution (2,3,4), invited respondent cannot correct (5), OP-01/OP-02 and information-need counters (6,7), evidence origin/linkage and cross-capability reuse without transfer (8,9), hub state + totals equal persisted records (10,11), tenant isolation (13). All use an isolated in-memory organization (14).
- knowledge:validate, knowledge:seal:check, knowledge:factory:check: pass. No knowledge/ or packages/ files changed (12: OP-01 Golden and history intact).

## 6. Authenticated browser verification (read-only)
Executed with the user's session: hub load timing, `/capacidad/DG-02` shows the clarification card with ACQ·NI06 and its cited sources and the 10-entry history, `/resultados-productivos` shows real counts, `/perfil`→`/empresa`, `/inicio`→hub, `/demostracion`→`/`, `/resultados`→results. **A correction was NOT submitted in the browser** to avoid writing into Digiway Corp; that step is covered by automated tests and remains for human acceptance.

## 7. Test data in Digiway Corp (not modified)
Six observations with "Prueba de aceptación Sprint 04": PC-01 ACQ·NI01/NI02, DT-01 ACQ·NI01/NI02, DG-02 ACQ·NI01/NI02 (created 2026-10-13 17:14–17:17 UTC). Controlled correction path: "Corregir" in each capability's history (original preserved, marked corrected).

## 8. Remaining limitations
- Upload context exists only for documents registered from now on.
- Results show no sufficiency/closure: no governed formula exists.
- No contract blocked; Engine 0.2.0, 31 packs, Master, checksums untouched.

UX_PROD_FIX_02_CODE_COMPLETE_PENDING_HUMAN_ACCEPTANCE
