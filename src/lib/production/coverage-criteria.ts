/** Auxiliary human-governed coverage interpretation, never diagnostic knowledge. */
export const COVERAGE_CRITERIA_VERSION = "DG01-NI04-COV-1.0.0";
export const COVERAGE_KNOWLEDGE_VERSION_ID = "d1a25af1-3634-4c9b-9465-69ac25875e26";
export const DG01_NI04_COMPONENTS = [
  { componentKey: "TEMPORAL_HORIZON", componentDescription: "Horizonte temporal", required: true },
  { componentKey: "STRATEGIC_AMBITION", componentDescription: "Ambición estratégica", required: true },
  { componentKey: "MATERIAL_CHANGES", componentDescription: "Cambios materiales previstos", required: true },
  { componentKey: "ENVIRONMENT_CHANGES", componentDescription: "Cambios relevantes del entorno", required: true },
  { componentKey: "SCOPE_EXHAUSTIVENESS", componentDescription: "Exhaustividad del alcance declarado", required: true },
] as const;

export function approvedCoverageCriteria(knowledgeVersionId: string, capabilityId: string, acquisitionRef: string) {
  if (knowledgeVersionId !== COVERAGE_KNOWLEDGE_VERSION_ID || capabilityId !== "DG-01" || acquisitionRef !== "ACQ·NI04") return null;
  return { knowledgeVersionId, capabilityId, acquisitionRef, coverageCriteriaVersion: COVERAGE_CRITERIA_VERSION,
    approvalReference: "INT-01-COV-QA-BUILD-QA01-QA02-v1.0", components: DG01_NI04_COMPONENTS };
}