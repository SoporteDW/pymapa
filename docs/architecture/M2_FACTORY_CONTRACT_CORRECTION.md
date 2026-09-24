# M2-FACTORY-CONTRACT-03 · Generic Pack Contract Correction

Scope: OP-03, OP-04, OP-05, DG-01..05, PC-01..05. Canonical review not reopened. DT/CM/EC not ingested. Nothing activated in the application.

## Results per capability

| Capability | Pack generated | Fixtures | Engine 0.2.0 | Publication state | Exact blocker |
|---|---|---|---|---|---|
| OP-03 | YES (`sha256:01192851…0321`) | 2/2 PASS | PASS | **PUBLISHED** op-03@1.0.0 | — |
| OP-04 | YES (`sha256:ae1252a8…2625`) | 2/2 PASS | PASS | **PUBLISHED** op-04@1.0.0 | — |
| OP-05 | YES (`sha256:796084c3…5114`) | 2/2 PASS | PASS | **PUBLISHED** op-05@1.0.0 | — |
| DG-01 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-DG-01-VA-ACQUISITION`: 9 NI with no explicit link to VA01–VA09 |
| DG-02 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-DG-02-VA-ACQUISITION` (10 NI / 10 VA) |
| DG-03 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-DG-03-VA-ACQUISITION` (10/10) |
| DG-04 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-DG-04-VA-ACQUISITION` (10/10) |
| DG-05 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-DG-05-VA-ACQUISITION` (12/12) |
| PC-01 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-PC-01-VA-ACQUISITION` (11/11) |
| PC-02 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-PC-02-VA-ACQUISITION` (13/13) |
| PC-03 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-PC-03-VA-ACQUISITION` (14/14) |
| PC-04 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-PC-04-VA-ACQUISITION` (14/14) |
| PC-05 | YES | 1/1 PASS | PASS | VALIDATED · held | `NE-PC-05-VA-ACQUISITION` (15/15) |

13/13 packs generated. 3 published. 10 held before publication, one per capability; none blocks another.

## Schema/contract changes (generic, no capability branches)
- `variables[].criticality` accepts `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`. The engine already resolved it to mode `NOT_EXPLICIT`, so this needed no engine change.
- `variables[].minimumEvidenceResolution: "NOT_EXPLICIT"`: the source is silent on minimum evidence, and that silence is recorded as such. The pack is no longer forced to declare a conditional requirement.
- `variables[].acquisitionResolution` ∈ ACQUISITION_EXPLICIT | INFORMATION_NEED | UNRESOLVED, plus `acquisitionNote`.
- Acquisitions: `level` and `question` are optional. New `acquisitionMode` (QUESTION | INFORMATION_NEED), `questionStatus`. The `acquisitions` and `informationNeeds` arrays may be empty.
- New optional pack section `acquisitionStages`: P1–P5 stages with literal prompts, `variableRefsResolution: CONTEXTUAL`. These stages are not served and do not admit observations.
- `capability.definitionStatus`, `definitionSourceLines`.
- Engine 0.2.0 (version unchanged). The only runtime edit: acquisitions without a literal question are no longer offered as questions. Behaviour for OP-01/OP-02 is identical.
- Factory/pipeline: a declared `publicationBlocking` gap now puts the capability in REVIEW_REQUIRED (held). Before, it produced FAIL.
- Field classification (`PACK_FIELD_CONTRACT` in `runnable-projection.ts`):
  - REQUIRED_FOR_RUNTIME: capability.id, capability.name, variables, variables[].acquisitionResolution
  - NOT_EXPLICIT_ALLOWED: definition, criticality, minimumEvidence, informationNeeds, acquisitions
  - OPTIONAL_SOURCE_METADATA: conditionsOfExistence, semanticStates, acquisition level/question
  - DERIVED_FROM_EXPLICIT_STRUCTURE: NI→VA links, NI acquisition-channel IDs
  - CONTEXTUAL: acquisitionStages[].variableRefs

## Criticality
- Before: pack generation failed for all 13 capabilities (GRE-CRITICALITY-NOT-EXPLICIT).
- After: criticality is preserved as NOT_EXPLICIT, and a non-blocking gap `NE-<cap>-CRITICALITY` is recorded. No level is inferred.

## Acquisition/question contract
- Before: generation required P1–P5 questions that name the VA word for word. 11 of 13 capabilities failed on this.
- After: VA → NI → acquisition. Every NI linked to a VA gives that VA an admissible channel (`ACQ·<NI>`) with no invented question. Literal questions that name a VA are kept in QUESTION mode (OP-03: 3, OP-04: 4). All other stages are kept as literal CONTEXTUAL prompts. Every VA declares either how it is acquired or why acquisition is unresolved.

## Capability definition
Rule: a definition marker (“definición…:” or a heading containing “definición”), followed by a line that starts with “<ID> evalúa”, and carrying a productive/canonical qualifier.
- DG-01..05 and PC-01..05: EXPLICIT (“definición productiva V1”).
- OP-04: EXPLICIT (“1.1 Definición auditada”, L5446–5447, from the K1 audit).
- OP-03: NOT_EXPLICIT. The source only has hypotheses.
- OP-05: NOT_EXPLICIT. Its only candidate is marked “definición inicial” (L13); it is kept but not promoted.
- In all NOT_EXPLICIT cases the non-blocking gap `NE-<cap>-DEFINITION` is recorded. No text was drafted.

## NI→VA linkage
Links use structural containment only: the NI appears under a heading that names exactly one final VA.
- OP-03: 37 NI, 8/8 VA linked. OP-04: 55 NI, 9/9 VA. OP-05: 64 NI (literal bullets under `## VAxx`, with derived locator IDs), 10/10 VA.
- DG/PC: 124 NI in tables under a generic block. The source states no relation to any VA, so all are UNRESOLVED.
- In all 10 DG/PC capabilities the NI count equals the VA count, and their numbering runs in parallel (NI_n / VA_n). This was **not** used as a link, because ordinal correspondence is not explicit source evidence.

## Remaining
- Genuine runtime extensions: 0.
- Genuine human semantic decision: 1, generic, applying to all 10 DG/PC capabilities. Does the numbering correspondence NI_n ↔ VA_n in the NI tables have authoritative standing? Alternatively, a source supplement can state the link explicitly. Until one of these happens, DG/PC stay VALIDATED and held.
- Checks run: 768/768 tests, typecheck, knowledge:validate, knowledge:seal:check, knowledge:factory:check. OP-01 Golden and the published OP-02 pack are unchanged (byte-identical). Historical 0.1.0 EvaluationRuns were not touched. Engine version is 0.2.0. Pack generation is deterministic (reproducible checksum, verified by test).
- Security: the changed code is offline tooling and schema only. No database, auth or app changes.

## DT + CM + EC readiness
The Factory now supports: source-native provenance, accepted baseline → runnable pack, optional or NOT_EXPLICIT criticality, NI-based acquisition, optional literal questions, contextual stages, split-line/table parsing, lifecycle/supersession, non-semantic metadata enrichment, and capability-independent publication.

If DT/CM/EC use the same NI-table format as DG/PC, they will be generated and validated but held on the same generic NI↔VA source decision. That decision is not Factory development.

FACTORY_READY_FOR_FINAL_MASS_BATCH
