<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture decisions
- Capture-only status is projected from each installed pack's rules/findings in the shared actionable projector; capture counts describe registered acquisitions, never semantic sufficiency or diagnosis closure.
- Production response adapters normalize description-free availability states to null, not empty strings, preserving the existing server response contract across legacy and generic capture.
- DG01-VERTICAL-01 evaluates a separate draft pack through a public synthetic-only server function, with Engine imports behind `piloto.server.ts`; raw Engine results and demonstration metadata stay separate to prevent semantic or production admission.
- DG-01 experimental execution lives in `packages/dg01-pilot/src/*.server.ts`, reachable only through the existing `piloto.server.ts` adapter and server-function handler; presentation provenance is dependency-free and UI result types derive from the RPC — filename guards and package graph tests prevent Engine leakage without architecture-test exemptions.
- DG01-VERTICAL-02 semantic interpretation is experimental, deterministic and read-only over observations — it never mutates Engine output nor confirms findings, so technical and semantic results stay separable.
- Auxiliary inventories derive from the verified static registry; never rewrite knowledge or enable conclusions — identity is not semantic approval.
- Complementary prescription content stays in server-only modules and append-only prescriptive_decisions, outside Engine recommendations; server/database lock emission independently of semantic eligibility.
- Subdirectories have their own `AGENTS.md`; read it before changing files there.
- Knowledge packs are loaded only via the static registry `src/lib/production/packs-registry.ts` (31 build-time imports, checksum-verified against `published.json`, fail-closed) — Workers have no runtime filesystem.
- New assessments pin to `PYMAPA-RUNTIME-MANIFEST` (composite checksum of all published packs); `PYMAPA-KNOWLEDGE-MASTER 1.0.0` is a frozen M1/OP-01 row, never updated — historical traceability.
- Server boundary logic lives in `capability-handlers.ts` (capabilityId-parametrized); `op01.functions.ts` and `capabilities.functions.ts` are thin auth-protected wrappers — no per-capability code paths.
- Responses/observations on the shared runtime Assessment carry `capabilityId` in their JSON and are read through `scopeRepositoryToCapability` (untagged legacy rows = OP-01) — acquisition/variable IDs repeat across packs.
- Actionable workspace (pending tasks, states) is derived server-side in `actionable.ts` from Engine + pack source text — UI never invents questions or order.
- `PYMAPA-KNOWLEDGE-MASTER 1.0.0` is verified against the pinned literal `KNOWLEDGE_VERSION_CHECKSUM_HISTORICO`, never recomputed from the evolving OP-01 pack — recomputing breaks the immutable DB row.
- `bootstrap_organization` is SECURITY DEFINER (enforces auth.uid + one org per user) — under RLS its INSERT…RETURNING cannot see the org before the membership exists.
- Granular assignment scopes (INFORMATION_NEED/SECTION) are stored as `<capability>::<ref>`; unqualified refs are historical OP-01 — pack ids repeat across capabilities.
- Shell mode (production vs demo) is decided only by `modoShell()` in `src/lib/production/entrada.ts` — one navigation authority.
- Response corrections append a new Observation with `value.correctsObservationId`; the Engine only sees `observacionesVigentes()` — history is never deleted or rewritten.
- Legacy MVP/demo routes are redirected by `destinoRutaLegacy()` in the root `beforeLoad` — one production journey, legacy code kept for compatibility.
- CAPABILITY_PROGRESSIVE acquisitions with several variableRefs are capability-scoped: `observacionesParaEngine()` in `caso-uso.ts` only feeds them to the Engine on explicit CONTRADICTORY or divergent KNOWN values for the same acquisition — distinct progressive questions are complementary, not the same datum (read-time, no data migration); their vigentes still count as answered via `evaluarAssessment()` extending `answeredAcquisitionRefs` — never a fictitious variableRef, so answered questions are not re-asked.
- Document-First fragment mappings (`fragment_mappings`) start as CANDIDATE and become VALIDATED only via a governed rule or ADMIN/OWNER validation (`validate_fragment_mapping`, `fragment-mapping-guard.ts`); only admitted information may feed `answeredAcquisitionRefs`, never NI sufficiency or capability closure — semantic similarity is not validation.
- Document-First demo (Moda Origen) lives in `src/lib/document-first/` + `/demo-documental`: browser-only sandbox with explicit versioned G1 rules over real PDF text (unpdf), never imports the backend — demo must stay isolated from production orgs.
- AI document interpretation goes through the `LlmGatewayClient` interface (`src/lib/ia/llm-gateway-client.server.ts`); the server verifies literal quotes, pages and canonical pack IDs, and AI proposals stay CANDIDATE — provider can change without touching diagnostic logic.
- AI document readings are persisted server-side (`src/lib/ia/persistencia-documental.server.ts`) as evidence → version → extraction → fragment (one per literal quote) → interpretation → INFORMATION_NEED mapping CANDIDATE; human decisions go only through `validate_fragment_mapping` — accepted NI mappings never create observations, sufficiency or closure.
- Engine contradictions are split per capability-scoped acquisition (`separarContradiccionesPorAdquisicion` in `caso-uso.ts`) — progressive questions share a generic variableRef and must never be clarified together.
- AI document reading reaches the Gateway only via an authorization object issued by `autorizarSemQa` (`src/lib/ia/sem-qa-guard.server.ts`), which re-derives text server-side from the stored file and checks the closed corpus, org/role and DB authorization — client text or labels never unlock the provider.
- Semantic classification ambiguity and missing/invalid types are retained as rejected proposals, never defaulted to explicit — literal quote verification does not establish semantic entailment or admission.
- The company Action Plan (`/plan-de-accion`) is a read-only projection of persisted interventions/activities/deliverables/findings via `getCompanyActionPlan` (`action-plan.ts`); its legacy MVP Alfa subroutes stay redirected — no second source of truth, management stays in the capability screens.
- Company Seguimiento (`/seguimiento`) is a read projection via `getCompanySeguimiento` (`seguimiento.ts`); start/decide follow-up only delegate to existing `iniciarFollowUp`/`decidirFollowUp` after OWNER/ADMIN check and server-derived capability — VALIDATED is reachable only through governed CRV validation, never set directly.
- Diagnostic translation candidates live only in `knowledge/staging/<capability>/` (generated by `scripts/knowledge-staging.ts` via `translateCapability`), validated by the additive `stagingCandidateSchema` with literal non-executable flags — never loaded by runtime/registry, so candidates cannot become published knowledge.
- Structural rule contracts (KNOW-EXEC-08-B, D1–D4) live in `packages/knowledge-schema/src/staging-r-op04-02.ts` as generic schemas without capability literals (the Knowledge Factory rejects capability-specific branching in generic code); concrete values live in `knowledge/staging/<capability>/` artifacts and are asserted in pipeline tests. All structural results stay `NOT_EVALUATED` with `semanticState: null`.
