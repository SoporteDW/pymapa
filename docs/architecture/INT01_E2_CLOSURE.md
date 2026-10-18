# INT-01 E2 closure — 2026-10-18

## Decision: E2 PASS WITH CONDITIONS

The safely implementable E2 boundaries pass synthetic regression tests. Complete documentary acquisition coverage is **not implemented**: existing mappings record admission and factual correspondence, not acquisition-specific completeness. No complete/partial label is invented. E3 remains unauthorized and unstarted.

## A. Files

Created:
- `src/lib/production/documentary-coverage.ts`
- `src/lib/production/cross-capability-evidence.ts`
- `src/lib/production/documentary-e2.test.ts`
- `docs/architecture/INT01_E2_CLOSURE.md`

Modified:
- `src/lib/production/caso-uso.ts`: separate admitted documentary facts from answered manual acquisitions, withdraw superseded mappings on reads, retain manual/document conflicts.
- `src/lib/production/actionable.ts`: expose documentary coverage separately in workspace.
- `src/lib/production/capability-handlers.ts`: forward coverage to workspace/hub and authenticated reuse handler.
- `src/lib/production/capabilities.functions.ts`: authenticated POST reuse boundary.
- `src/lib/production/puertos.ts`: reuse persistence port and synthetic implementation.
- `src/lib/production/runtime.server.ts`: original-fragment candidate INSERT, deterministic duplicate recovery, provenance and repairable idempotent audit.
- `src/lib/production/fragment-mapping-guard.ts`: retire unsafe legacy VALIDATED→answered shortcut; return empty coverage without governed completeness.
- `src/lib/production/document-first-block1.test.ts`: replace that shortcut's former assertion with conservative E2 rule.
- `src/lib/production/arquitectura.test.ts`: authorize the new synthetic test's Engine import.
- `AGENTS.md`, `roadmap.md`: architectural rules and scope tracking.

## B. Implemented behavior

All current manual observations continue to answer acquisitions. Admitted documentary observations remain available to the Engine but do not automatically contribute answeredAcquisitionRefs. State, next-question, workspace and hub read the same effective answered set rather than counting historical response rows as current coverage. A current documentary fact projects INDETERMINATE / ACQUISITION_COMPLETENESS_NOT_GOVERNED; Engine-detected source conflict projects CONTRADICTORY / SOURCE_CONFLICT and keeps the acquisition open for review. Candidate/validated mapping presence alone never answers an acquisition.

No complete-proof extension field, invented rule registry, external LLM call, scoring, confidence or sufficiency formula was added.

## C. Four archetypes

Inspection of pack metadata yields 11 bijections, 3 structural, 12 progressive multimapped and 5 mixed. Runtime resolves IDs from published packs, not a fixed capability list.

| Archetype | Effective E2 treatment |
|---|---|
| 11 canonical bijections | A one-to-one relationship identifies a target, not completeness of the acquisition's substantive statement; admitted fact remains evaluable but acquisition stays open. |
| 3 structural | Structural correspondence is not proof that all factual content is covered; acquisition stays open. |
| 12 progressive multimapped | No thematic subtraction or generic variable assignment; E1 remains fail-closed. Existing manual progressive answers and acquisition-isolated conflicts preserved. |
| 5 mixed operational | E1 Engine validation of semantic states unchanged; an accepted fact does not by itself prove the full question/task answered. |

Representative synthetic packs: DG-01, DT-02, CM-05, OP-05; existing full suite covers historical operational behavior as well.

## D. Acceptance evidence

Executed `bunx vitest run`: **984 PASS / 0 FAIL / 0 skipped**, 47 files; E1 baseline 966 plus 18 new E2 tests. Latest automatic preview compilation: **build OK** at 2026-10-18T14:16:04Z. No manual build or typecheck command was run.

| Test | Result / scope |
|---|---|
| T-E2-01 | BLOCKED by missing canonical acquisition-completeness contract; no synthetic COMPLETE flag used to manufacture PASS. |
| T-E2-02 | PASS: VALIDATED/admitted partial fixture remains pending; runtime labels indeterminate because partialness itself lacks a governed contract. |
| T-E2-03 | PASS: CM-05 first progressive question remains available after thematic documentary mapping; no admitted generic VA. |
| T-E2-04 | PASS for available contract: supersession removes factual evaluation immediately, no manual response → pending task; independent current manual response survives. Previously recognized COMPLETE coverage restoration cannot be tested because COMPLETE is not representable. |
| T-E2-05 | PASS synthetic: independent CANDIDATE, one original evidence/fragment, concurrent identical retries yield one candidate. |
| T-E2-06 | PASS synthetic: foreign source organization and foreign evidence rejected without candidate writes. |
| T-E2-07 | PASS synthetic: source VALIDATED does not validate receiver; retry does not reset receiver decision. Actual OWNER/ADMIN validation RPC unchanged, not newly exercised on hosted QA. |
| T-E2-08 | PASS synthetic: no interpretation/admission/value/observation/finding transferred; reused NI candidate cannot bypass E1. |
| T-E2-09 | PASS: manual progression preserved; source conflict kept visible; two internal CM-05 conflicts remain separate. |
| T-E2-10 | PASS: final complete suite 984/984; original E1 nine tests still pass. |

Hosted authenticated endpoint write/readback, live concurrent DB retries, live role/RLS rejection and browser end-to-end: **NOT_TESTED in this E2 execution**. No claim of live operational acceptance is made. Synthetic tests exercise the core service/repository contract, not the production adapter against a live database.

## E. Invalidation

E1's append-only control mechanism is unchanged. E2 additionally checks current backing mapping, org/assessment, pack/version, factual target and lineage before a documentary observation enters the Engine. Thus SUPERSEDED documents are withdrawn even before E1's next control append. Manual responses are not invalidated by documentary control; history is never deleted. Absent canonical COMPLETE coverage, documentary tasks never disappear in the first place.

## F. Reuse and security

`reuseCapabilityDocument` requires authenticated session. The handler reads membership and source mapping with the caller's RLS-bound client before privileged operations. Service checks OWNER/ADMIN, assessment/version, source org, original evidence org, fragment lineage and target existence in receiver pack. No permission changes, schema changes or migrations were made.

Receiver mapping references the original fragment, with null interpretation, admission and factual correspondence. Its independent decision remains subject to the existing OWNER/ADMIN validation RPC. A deterministic primary key permits INSERT-only concurrency recovery; retry does not UPDATE immutable rows or resurrect a rejected candidate. Original proposal trigger remains, and a separately identified provenance audit records actor, source mapping, fragment, extraction, evidence and receiver pack. Audit failure is surfaced; retry repairs the deterministic audit event.

## G. Conditions / limits

1. Governed acquisition-specific completeness criteria are absent. All documentary acquisition subtraction is intentionally disabled. T-E2-01 is not PASS.
2. No canonical evidence supports runtime COMPLETE/PARTIAL determinations; partial fixtures are safely treated as indeterminate. No sufficiency inference.
3. Reuse exposes a server boundary, not a new UI workflow. E3 UI/integration acceptance was not started.
4. Receiver interpretation must be independently supplied through an authorized future workflow; it is not copied from sender. Candidate validation alone still cannot bypass E1's factual admission checks.
5. Live QA validation/RLS/concurrent persistence and browser readback remain unverified, not silently declared passed.

## H. Protected components

SHA-256 comparison of the before/after protected files found zero changes under `knowledge/` (Master and 31 packs), `packages/knowledge-engine/`, `src/lib/document-first/`, and `src/routes/moda-origen.tsx`. No live database writes, no Digiway Corp changes, no real business documents, no external AI calls and no publication. Existing tests process synthetic demo PDFs only.

## I. Final disposition

**E2 PASS WITH CONDITIONS** for conservative coverage boundaries and synthetic independent reuse. Full documentary subtraction is pending a canonical completeness contract; live operational acceptance is NOT_TESTED. Wait for explicit authorization before E3.