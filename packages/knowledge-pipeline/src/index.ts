/**
 * @pymapa/knowledge-pipeline
 *
 * Pipeline industrial y gobernado:
 *   Governed Knowledge Source → Capability Source Extraction → Pack Candidate
 *   → Schema Validation → Semantic/Referential Validation → Fixtures
 *   → Knowledge Tests → Runtime Acceptance Tests → Human/Governance Review
 *   → VALIDATED → PUBLISHED
 *
 * INVARIANTES:
 * - Generar un candidato no equivale a conocimiento aprobado.
 * - Ningún contenido inferido pasa silenciosamente a PUBLISHED.
 * - Los vacíos son datos de primera clase y se preservan.
 * - No existe branching por capabilityId en ninguna etapa.
 * - El pipeline se ejecuta desde el repositorio, sin dependencias de frontend.
 */
export * from "./checksum.ts";
export * from "./master.ts";
export * from "./generator.ts";
export * from "./diff.ts";
export * from "./validators.ts";
export * from "./fixtures.ts";
export * from "./knowledge-tests.ts";
export * from "./runtime-harness.ts";
export * from "./publication.ts";
export * from "./manifest.ts";
export * from "./pipeline.ts";
export * from "./automation.ts";
export * from "./report.ts";
export * from "./loader.ts";
export * from "./transversal.ts";
export * from "./canonical-baseline.ts";
export * from "./raw-source.ts";
export * from "./candidate.ts";
export * from "./runtime-extensions.ts";
export * from "./factory.ts";
export * from "./structural-extractor.ts";
export * from "./supersession-resolver.ts";
export * from "./governance-decisions.ts";
export * from "./cross-capability.ts";
