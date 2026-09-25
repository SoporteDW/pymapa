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
