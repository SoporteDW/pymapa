import { z } from "zod";
import { approvedCoverageCriteria } from "./coverage-criteria";

export const componentEvidenceEvaluationSchema = z.object({
  componentKey: z.string().min(1),
  componentDescription: z.string().min(1),
  supportState: z.enum(["SUPPORTED", "PARTIAL", "UNSUPPORTED", "UNCERTAIN"]),
  fragmentId: z.string().uuid(),
  supportingQuote: z.string().max(12000),
  componentJustification: z.string().max(2000),
  uncertaintyNotes: z.string().max(2000),
  humanConfirmedRelevance: z.boolean(),
}).strict();

export const structuredCoverageDeclarationSchema = z.object({
  mappingId: z.string().uuid(), acquisitionRef: z.string().min(1),
  knowledgeVersionId: z.string().uuid(), coverageCriteriaVersion: z.string().min(1),
  targetScope: z.enum(["FULL", "PARTIAL"]),
  componentEvaluations: z.array(componentEvidenceEvaluationSchema).max(20),
  synthesisJustification: z.string().trim().min(10).max(2000),
  humanConfirmedCompleteness: z.boolean(),
  expectedRevision: z.number().int().nonnegative(), requestId: z.string().uuid(),
}).strict();
export type ComponentEvidenceEvaluation = z.infer<typeof componentEvidenceEvaluationSchema>;
export type StructuredCoverageDeclaration = z.infer<typeof structuredCoverageDeclarationSchema>;

/** Structural integrity and literal provenance only. Human relevance is an attestation, not an algorithmic verdict. */
export function validateStructuredCoverage(d: StructuredCoverageDeclaration, context: {
  capabilityId: string; knowledgeVersionId: string; acquisitionRef: string; fragmentId: string; fragmentText: string;
  evidenceCurrent: boolean; hasConflict: boolean;
}) {
  if (d.knowledgeVersionId !== context.knowledgeVersionId || d.acquisitionRef !== context.acquisitionRef) throw new Error("COVERAGE_IDENTITY_MISMATCH");
  const criteria = approvedCoverageCriteria(context.knowledgeVersionId, context.capabilityId, context.acquisitionRef);
  const reasons: string[] = [];
  if (!criteria || criteria.coverageCriteriaVersion !== d.coverageCriteriaVersion) reasons.push("GOVERNED_COMPONENTS_NOT_DEFINED");
  const keys = new Set<string>();
  const quotes = new Set<string>();
  for (const c of d.componentEvaluations) {
    if (keys.has(c.componentKey)) throw new Error("DUPLICATE_COMPONENT");
    keys.add(c.componentKey);
    const approved = criteria?.components.find((x) => x.componentKey === c.componentKey);
    if (!approved || approved.componentDescription !== c.componentDescription) reasons.push("COMPONENT_NOT_GOVERNED");
    if (c.supportState === "SUPPORTED") {
      if (c.fragmentId !== context.fragmentId || !c.supportingQuote.trim() || !context.fragmentText.includes(c.supportingQuote)) throw new Error("INVALID_COMPONENT_QUOTE");
      if (quotes.has(c.supportingQuote.trim())) reasons.push("QUOTE_REUSED_FOR_OTHER_COMPONENT");
      quotes.add(c.supportingQuote.trim());
      if (!c.humanConfirmedRelevance || !c.componentJustification.trim() || c.uncertaintyNotes.trim()) reasons.push("COMPONENT_RELEVANCE_NOT_GOVERNED");
    }
  }
  if (criteria?.components.some((c) => !d.componentEvaluations.some((e) => e.componentKey === c.componentKey && e.supportState === "SUPPORTED"))) reasons.push("REQUIRED_COMPONENT_INCOMPLETE");
  if (!context.evidenceCurrent) reasons.push("EVIDENCE_NOT_CURRENT");
  if (context.hasConflict) reasons.push("SOURCE_CONFLICT");
  if (!d.humanConfirmedCompleteness) reasons.push("HUMAN_COMPLETENESS_NOT_CONFIRMED");
  return { coverageScope: d.targetScope === "FULL" && reasons.length === 0 ? "FULL" as const : "PARTIAL" as const,
    rejectionReasons: [...new Set(reasons)], validationKind: "STRUCTURAL_AND_HUMAN_GOVERNANCE" as const };
}