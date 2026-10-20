/**
 * INT-01-COV-03A · Registro extensible de criterios auxiliares de cobertura.
 *
 * Interpretación auxiliar gobernada por humanos, NUNCA conocimiento
 * diagnóstico. Cada entrada se identifica por versión de conocimiento,
 * capacidad, adquisición canónica y versión de criterios. Toda adquisición
 * sin entrada individualmente aprobada queda en PARTIAL_ONLY (fail-closed).
 * El mismo registro debe replicarse literalmente en la función SQL
 * `approved_coverage_components` (ver coverage-criteria.test.ts).
 */
export const COVERAGE_KNOWLEDGE_VERSION_ID = "d1a25af1-3634-4c9b-9465-69ac25875e26";
export const COVERAGE_CRITERIA_VERSION = "DG01-NI04-COV-1.0.0";

export type CoverageApprovalStatus = "PROPOSED" | "APPROVED" | "PILOT_TEST_GOVERNED";
export interface CoverageComponent { componentKey: string; componentDescription: string; required: true }
export interface CoverageCriteriaEntry {
  knowledgeVersionId: string;
  capabilityId: string;
  acquisitionRef: string;
  coverageCriteriaVersion: string;
  approvalReference: string;
  approvalStatus: CoverageApprovalStatus;
  /** Tipo de mapping al que aplica: factual sobre variable o cobertura pura de adquisición. */
  mappingTargetType: "VARIABLE" | "ACQUISITION";
  components: readonly CoverageComponent[];
}

export const DG01_NI04_COMPONENTS = [
  { componentKey: "TEMPORAL_HORIZON", componentDescription: "Horizonte temporal", required: true },
  { componentKey: "STRATEGIC_AMBITION", componentDescription: "Ambición estratégica", required: true },
  { componentKey: "MATERIAL_CHANGES", componentDescription: "Cambios materiales previstos", required: true },
  { componentKey: "ENVIRONMENT_CHANGES", componentDescription: "Cambios relevantes del entorno", required: true },
  { componentKey: "SCOPE_EXHAUSTIVENESS", componentDescription: "Exhaustividad del alcance declarado", required: true },
] as const;

/** Piloto COV-03B: derivado literalmente de «¿En qué momentos de la relación es más grave fallarle al cliente?». */
export const CM05_P101_COMPONENTS = [
  { componentKey: "RELATIONSHIP_MOMENTS", componentDescription: "Momentos de la relación con el cliente identificados", required: true },
  { componentKey: "FAILURE_SEVERITY", componentDescription: "Gravedad relativa de fallar en esos momentos", required: true },
  { componentKey: "SCOPE_EXHAUSTIVENESS", componentDescription: "Exhaustividad del alcance declarado", required: true },
] as const;

/**
 * Piloto COV-03C · BUILD 02: derivado literalmente de OP-05 «VA01 · Objetivo y resultado ·
 * Necesitamos saber: problema/oportunidad;» (OP-05_Completo.txt L254, NI VA01#NI@L254).
 * Solo cubre ESA necesidad; las hermanas L255–L258 permanecen PARTIAL_ONLY.
 */
export const OP05_VA01_L254_COMPONENTS = [
  { componentKey: "PROBLEM_OR_OPPORTUNITY", componentDescription: "Problema u oportunidad que origina el objetivo identificado", required: true },
  { componentKey: "SCOPE_EXHAUSTIVENESS", componentDescription: "Exhaustividad del alcance declarado", required: true },
] as const;

export const COVERAGE_CRITERIA_REGISTRY: readonly CoverageCriteriaEntry[] = [
  { knowledgeVersionId: COVERAGE_KNOWLEDGE_VERSION_ID, capabilityId: "DG-01", acquisitionRef: "ACQ·NI04",
    coverageCriteriaVersion: COVERAGE_CRITERIA_VERSION, approvalReference: "INT-01-COV-QA-BUILD-QA01-QA02-v1.0",
    approvalStatus: "APPROVED", mappingTargetType: "VARIABLE", components: DG01_NI04_COMPONENTS },
  { knowledgeVersionId: COVERAGE_KNOWLEDGE_VERSION_ID, capabilityId: "CM-05", acquisitionRef: "ACQ·P1·01",
    coverageCriteriaVersion: "CM05-P101-COV-1.0.0", approvalReference: "INT-01-COV-03-BUILD-01",
    approvalStatus: "PILOT_TEST_GOVERNED", mappingTargetType: "ACQUISITION", components: CM05_P101_COMPONENTS },
  { knowledgeVersionId: COVERAGE_KNOWLEDGE_VERSION_ID, capabilityId: "OP-05", acquisitionRef: "ACQ·VA01#NI@L254",
    coverageCriteriaVersion: "OP05-VA01-L254-COV-1.0.0", approvalReference: "INT-01-COV-03-BUILD-02",
    approvalStatus: "PILOT_TEST_GOVERNED", mappingTargetType: "ACQUISITION", components: OP05_VA01_L254_COMPONENTS },
];

export function approvedCoverageCriteria(knowledgeVersionId: string, capabilityId: string, acquisitionRef: string) {
  return COVERAGE_CRITERIA_REGISTRY.find((e) => e.knowledgeVersionId === knowledgeVersionId
    && e.capabilityId === capabilityId && e.acquisitionRef === acquisitionRef) ?? null;
}

export type CoverageMode = "FULL_ELIGIBLE" | "PARTIAL_ONLY";
/** Authorization is read from the database, never from client input or organization names. */
export function criteriaEligible(entry: CoverageCriteriaEntry | null | undefined, pilotAuthorized = false): boolean {
  return entry?.approvalStatus === "APPROVED" || (entry?.approvalStatus === "PILOT_TEST_GOVERNED" && pilotAuthorized);
}
export function coverageModeFor(knowledgeVersionId: string, capabilityId: string, acquisitionRef: string, pilotAuthorized = false): CoverageMode {
  return criteriaEligible(approvedCoverageCriteria(knowledgeVersionId, capabilityId, acquisitionRef), pilotAuthorized) ? "FULL_ELIGIBLE" : "PARTIAL_ONLY";
}

/** Adquisición canónica cubierta por un mapping: factual (VARIABLE) o directa (ACQUISITION). */
export function coveredAcquisitionOf(m: { targetType: string; targetRef: string; factualCorrespondenceRef: string | null }): string | null {
  if (m.targetType === "VARIABLE") return m.factualCorrespondenceRef ?? null;
  if (m.targetType === "ACQUISITION") return m.targetRef;
  return null;
}
