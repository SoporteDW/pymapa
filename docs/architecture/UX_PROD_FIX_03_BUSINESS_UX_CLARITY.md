# UX-PROD-FIX-03 · Business UX Clarity & Continuous Journey

Presentation-only correction. Engine 0.2.0, the 31 published packs, Knowledge Master, manifests and checksums are unchanged. No PKG-03 / PR-DOC / UX-DIAG functionality.

## Changes
1. **Responses and clarification** (`capacidad.$id.tsx`): saved answers show "Registrada" with an optional link-style «Modificar respuesta»; superseded versions show "Versión anterior (reemplazada)" without action. Warning styling and «Resolver aclaración» only appear inside the "Aclaración pendiente" card (Engine `clarificationDetails`). After a modification the workspace is re-fetched (governed reevaluation) and the toast reports what the Engine says: resolved, or still pending. Editing never declares resolution by itself. History, permissions (`canCorrect`) and append-only corrections unchanged.
2. **Wording and navigation**: `ACQUISITION_EXHAUSTED` → «Sin preguntas disponibles por ahora» (neutral tone). Empty state «No hay más preguntas disponibles por ahora» with «Continuar con otra capacidad» (first NOT_STARTED in catalog order, labeled as navigation only), «Volver al diagnóstico», «Consultar respuestas». Counters show available questions and "condicionales no activadas (no son trabajo pendiente)" instead of unanswered conditional totals.
3. **Evidence**: upload states it is recorded automatically in the current capability (existing `upload_context_capability_id`); ACQ/NI codes replaced by the business label of the answer; "Cargado ≠ validado" on every document.
4. **Results**: every metric is a button with drill-down (capabilities list or documents with upload context and links). Exploration bar "X de 31 capacidades abordadas · Y % del catálogo explorado" = capabilities with ≥1 current answer / 31, labeled as catalog exploration, not diagnostic completion.
5. **Header**: Help and Company are separate 44px targets with gap and text labels from `sm`; Company keeps `?editar=true` (otherwise `/empresa` forwards to the hub).

## Business Journey Acceptance Matrix
Browser (Playwright, dev preview), isolated QA organization «Organización de trabajo» (qa.op01, sole OWNER, no respondent/membership in Digiway Corp — verified in DB before any write).

| # | Step | Status |
|---|------|--------|
| 1 | Enter platform, correct organization | PASS |
| 2 | Open diagnostic dashboard | PASS |
| 3 | Select capability (DG-03), requirements in business language | PASS |
| 4 | Record answer, persists after reload | PASS |
| 5 | Saved answer reads "Registrada" + optional «Modificar respuesta» | PASS |
| 6 | Real clarification (declared contradiction) → Resolver → reevaluation → state "Pendiente de información", toast "Aclaración resuelta" | PASS |
| 7 | Upload from DG-03 → shown "desde DG-03", not validated | PASS |
| 8 | Navigate to other capability keeping org/assessment | PASS |
| 9 | Hub counters reflect records; Results drill-down (documents) | PASS |
| 10 | Results, Help, Company open production routes | PASS |
| 11 | Desktop and mobile (390px) header routes | PASS (mobile: header/navigation only; full capability flow on mobile NOT_TESTED) |

Not verified: CM-05 and DG-02 in Digiway Corp (writes there forbidden; same code path verified on DG-03 in QA org); divergent-value contradictions in browser (covered by unit tests); published domain.

UX_PROD_FIX_03_CODE_COMPLETE_PENDING_HUMAN_ACCEPTANCE
