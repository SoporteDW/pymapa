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
