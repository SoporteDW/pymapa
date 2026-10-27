# Isolated DG-01 pilot
- Experimental modules importing Engine or Schema must use `.server.ts` and may be reached from the application only through `src/lib/piloto-dg01/piloto.server.ts`; this enforces a bundler boundary rather than relying on directory placement.
- Keep synthetic scenarios and dependency-free presentation provenance in the application; never import experimental evaluation from a component, route, hook or shared presentation contract.
- Preserve candidate rules, lexical criteria and raw Engine output; package isolation grants neither semantic nor production authorization.