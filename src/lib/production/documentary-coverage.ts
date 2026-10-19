/**
 * INT-01-COV-02 · Contrato gobernado de cobertura documental.
 *
 * Una correspondencia VALIDATED con observación admitida NO descuenta la
 * adquisición por sí sola: el descuento exige una decisión humana explícita
 * de cobertura COMPLETA (coverage_scope = FULL, solo OWNER/ADMIN, con
 * justificación y adquisición canónica igual a la correspondencia factual).
 * Sin esa decisión la cobertura es PARTIAL y la tarea permanece pendiente.
 * Un conflicto vigente (documento vs. respuesta manual) bloquea el descuento.
 */
import type { DocumentMappingRecord, ObservationRecord } from "./puertos";
import { structuredCoverageDeclarationSchema, validateStructuredCoverage } from "./structured-coverage";
import { approvedCoverageCriteria, coveredAcquisitionOf } from "./coverage-criteria";

export function hasVerifiedStructuredCoverage(m: DocumentMappingRecord): boolean {
  if (!m.coverageEvidenceCurrent || !m.coverageEvaluation || typeof m.coverageEvaluation !== "object") return false;
  const e = m.coverageEvaluation as { declaration?: unknown; result?: { coverageScope?: string; revision?: number }; decidedBy?: string; evidenceId?: string; extractionId?: string };
  const parsed = structuredCoverageDeclarationSchema.safeParse(e.declaration);
  if (!parsed.success || e.result?.coverageScope !== "FULL" || e.result.revision !== m.coverageRevision
    || e.decidedBy !== m.coverageDecidedBy || e.evidenceId !== m.evidenceId || e.extractionId !== m.extractionId
    || parsed.data.mappingId !== m.id) return false;
  const acquisitionRef = coveredAcquisitionOf(m);
  if (!acquisitionRef) return false;
  // COV-03A: the approved entry fixes the mapping archetype; no cross-archetype reuse.
  if (approvedCoverageCriteria(m.knowledgeVersionId, m.capabilityId, acquisitionRef)?.mappingTargetType !== m.targetType) return false;
  try {
    return validateStructuredCoverage(parsed.data, { capabilityId: m.capabilityId, knowledgeVersionId: m.knowledgeVersionId,
      acquisitionRef, fragmentId: m.fragmentId, fragmentText: m.fragmentText,
      evidenceCurrent: true, hasConflict: false }).coverageScope === "FULL";
  } catch { return false; }
}

export type DocumentaryCoverageState = "COMPLETE" | "PARTIAL" | "CONTRADICTORY";
export interface DocumentaryCoverage {
  acquisitionId: string;
  state: DocumentaryCoverageState;
  reason: "COVERAGE_DECLARED_FULL" | "COVERAGE_NOT_FULL" | "SOURCE_CONFLICT";
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
      && p.knowledgePackId === scope.packId && p.knowledgePackVersion === scope.packVersion
      && ((m.admissionBasis === "HUMAN_VALIDATION" && Boolean(m.validatedBy))
        || (m.admissionBasis === "GOVERNED_RULE" && Boolean(m.admissionRuleRef)))
      && m.targetType === "VARIABLE" && m.targetRef === o.variableRef
      && m.factualCorrespondenceRef === o.value.acquisitionRef
      && m.fragmentId === p.fragmentId && m.evidenceId === p.evidenceId
      && m.interpretationId === p.interpretationId && m.extractionId === p.extractionId);
  });
}

/**
 * Proyección de cobertura por adquisición. COMPLETE exige: observación
 * documental KNOWN vigente + mapping VALIDATED + decisión FULL gobernada
 * sobre ESA adquisición canónica + sin conflicto vigente. Todo lo demás es
 * PARTIAL (nunca descuenta) o CONTRADICTORY (conserva la aclaración).
 */
export function proyectarCoberturaDocumental(
  observations: ObservationRecord[],
  mappings: DocumentMappingRecord[],
  conflicts: readonly { conflictingObservationIds: string[] }[],
): DocumentaryCoverage[] {
  const mappingPorId = new Map(mappings.map((m) => [m.id, m]));
  const groups = new Map<string, ObservationRecord[]>();
  for (const o of observations) {
    if (o.value.documentProvenance) groups.set(o.value.acquisitionRef, [...(groups.get(o.value.acquisitionRef) ?? []), o]);
  }
  const fromObservations = [...groups].map(([acquisitionId, rows]) => {
    const base = {
      acquisitionId,
      observationIds: rows.map((o) => o.id),
      mappingIds: rows.flatMap((o) => o.value.documentProvenance ? [o.value.documentProvenance.mappingId] : []),
    };
    const conflict = conflicts.some((c) => rows.some((o) => c.conflictingObservationIds.includes(o.id)));
    if (conflict) return { ...base, state: "CONTRADICTORY" as const, reason: "SOURCE_CONFLICT" as const };
    const completa = rows.some((o) => {
      const p = o.value.documentProvenance;
      if (!p || o.value.knowledgeState !== "KNOWN") return false;
      const m = mappingPorId.get(p.mappingId);
      return Boolean(m && m.status === "VALIDATED" && m.coverageScope === "FULL"
        && m.coverageAcquisitionRef === acquisitionId && hasVerifiedStructuredCoverage(m));
    });
    return completa
      ? { ...base, state: "COMPLETE" as const, reason: "COVERAGE_DECLARED_FULL" as const }
      : { ...base, state: "PARTIAL" as const, reason: "COVERAGE_NOT_FULL" as const };
  });
  // COV-03B · Pure acquisition coverage (target ACQUISITION): no observation is
  // created or required, so no variable changes state. Only a verified FULL
  // structured decision on a VALIDATED mapping discounts the question.
  const covered = new Set(fromObservations.map((c) => c.acquisitionId));
  const directas = new Map<string, DocumentMappingRecord[]>();
  for (const m of mappings) {
    if (m.targetType !== "ACQUISITION" || m.status !== "VALIDATED" || covered.has(m.targetRef)) continue;
    directas.set(m.targetRef, [...(directas.get(m.targetRef) ?? []), m]);
  }
  const fromAcquisitions = [...directas].map(([acquisitionId, ms]) => {
    const full = ms.some((m) => m.coverageScope === "FULL" && m.coverageAcquisitionRef === acquisitionId && hasVerifiedStructuredCoverage(m));
    return { acquisitionId, observationIds: [], mappingIds: ms.map((m) => m.id),
      state: full ? "COMPLETE" as const : "PARTIAL" as const,
      reason: full ? "COVERAGE_DECLARED_FULL" as const : "COVERAGE_NOT_FULL" as const };
  });
  return [...fromObservations, ...fromAcquisitions];
}
