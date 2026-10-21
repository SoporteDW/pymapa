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
- Auxiliary coverage inventories and PROPOSED criteria are generated from the checksum-verified static pack registry; they never rewrite published knowledge or enable diagnostic conclusions — canonical identity and semantic approval remain separate.
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
