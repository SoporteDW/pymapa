/** E2: admission is not acquisition coverage. No published completeness rule exists. */
import type { DocumentMappingRecord, ObservationRecord } from "./puertos";

export type DocumentaryCoverageState = "INDETERMINATE" | "CONTRADICTORY";
export interface DocumentaryCoverage {
  acquisitionId: string;
  state: DocumentaryCoverageState;
  reason: "ACQUISITION_COMPLETENESS_NOT_GOVERNED" | "SOURCE_CONFLICT";
  observationIds: string[];
  mappingIds: string[];
}

/** Fail closed when the backing mapping is no longer valid, even before E1 control is appended. */
export function documentalesVigentes(
  observations: ObservationRecord[], mappings: DocumentMappingRecord[],
  scope: { organizationId: string; assessmentId: string; capabilityId: string; knowledgeVersionId: string; packId: string; packVersion: string },
): ObservationRecord[] {
  return observations.filter((o) => {
    if (!o.value.documentProvenance) return true;
    const p = o.value.documentProvenance;
    return mappings.some((m) => m.id === p.mappingId && m.status === "VALIDATED"
      && m.organizationId === scope.organizationId && o.organizationId === scope.organizationId
      && m.assessmentId === scope.assessmentId && o.assessmentId === scope.assessmentId
      && m.capabilityId === scope.capabilityId && m.knowledgeVersionId === scope.knowledgeVersionId
      && m.knowledgePackId === scope.packId && m.knowledgePackVersion === scope.packVersion
      && m.targetType === "VARIABLE" && m.targetRef === o.variableRef
      && m.factualCorrespondenceRef === o.value.acquisitionRef
      && m.fragmentId === p.fragmentId && m.evidenceId === p.evidenceId
      && m.interpretationId === p.interpretationId && m.extractionId === p.extractionId);
  });
}

export function proyectarCoberturaDocumental(
  observations: ObservationRecord[], conflicts: readonly { conflictingObservationIds: string[] }[],
): DocumentaryCoverage[] {
  const groups = new Map<string, ObservationRecord[]>();
  for (const o of observations) {
    if (o.value.documentProvenance) groups.set(o.value.acquisitionRef, [...(groups.get(o.value.acquisitionRef) ?? []), o]);
  }
  return [...groups].map(([acquisitionId, rows]) => {
    const conflict = conflicts.some((c) => rows.some((o) => c.conflictingObservationIds.includes(o.id)));
    return {
      acquisitionId, state: conflict ? "CONTRADICTORY" : "INDETERMINATE",
      reason: conflict ? "SOURCE_CONFLICT" : "ACQUISITION_COMPLETENESS_NOT_GOVERNED",
      observationIds: rows.map((o) => o.id),
      mappingIds: rows.flatMap((o) => o.value.documentProvenance ? [o.value.documentProvenance.mappingId] : []),
    };
  });
}