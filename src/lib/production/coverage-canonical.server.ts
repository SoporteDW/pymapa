/** BUILD03: published identity validation, never diagnostic or semantic inference. */
import { getRegisteredPack, OFFICIAL_CAPABILITY_IDS } from "./packs-registry";
import { COVERAGE_CRITERIA_REGISTRY, COVERAGE_KNOWLEDGE_VERSION_ID, type CoverageCriteriaEntry } from "./coverage-criteria";

export interface CanonicalCoveragePack {
  acquisitions: { id: string; variableRefs: string[]; acquisitionMode?: string; informationNeedRef?: string; question?: string }[];
  variables: { id: string }[];
  informationNeeds?: { id: string; statement: string; variableRefs?: string[]; acquisitionRefs?: string[]; sourceLines?: number[]; mappingStatus?: string }[];
}

export function validateCanonicalCriteria(entries: readonly CoverageCriteriaEntry[]) {
  const identities = new Set<string>();
  for (const e of entries) {
    const pack = getRegisteredPack(e.capabilityId).pack as CanonicalCoveragePack;
    if (e.knowledgeVersionId !== COVERAGE_KNOWLEDGE_VERSION_ID) throw new Error("CRITERIA_KNOWLEDGE_VERSION_INVALID");
    if (!pack.acquisitions.some((a) => a.id === e.acquisitionRef)) throw new Error("CANONICAL_ACQUISITION_NOT_FOUND");
    const identity = JSON.stringify([e.knowledgeVersionId, e.capabilityId, e.acquisitionRef, e.coverageCriteriaVersion]);
    if (identities.has(identity)) throw new Error("CRITERIA_IDENTITY_DUPLICATE");
    identities.add(identity);
    if (!e.coverageCriteriaVersion.trim() || !e.approvalReference.trim()) throw new Error("CRITERIA_VERSION_INVALID");
    if (!e.components.length || new Set(e.components.map((c) => c.componentKey)).size !== e.components.length
      || e.components.some((c) => !c.componentKey.trim() || !c.componentDescription.trim() || c.required !== true)) throw new Error("CRITERIA_COMPONENTS_INVALID");
  }
  return true;
}

export function buildCoverageInventory() {
  validateCanonicalCriteria(COVERAGE_CRITERIA_REGISTRY);
  return OFFICIAL_CAPABILITY_IDS.map((capabilityId) => {
    const registered = getRegisteredPack(capabilityId);
    const pack = registered.pack as CanonicalCoveragePack;
    const needs = pack.informationNeeds ?? [];
    const modes = [...new Set(pack.acquisitions.map((a) => a.acquisitionMode))];
    const archetype = capabilityId.startsWith("OP-") ? "OPERATIONAL_MIXED"
      : modes.includes("CAPABILITY_PROGRESSIVE") ? "PROGRESSIVE"
      : needs.some((n) => n.mappingStatus === "GOVERNED_STRUCTURAL_CORRESPONDENCE") ? "STRUCTURAL" : "ONE_TO_ONE";
    return { capabilityId, domainId: registered.domainId, archetype, packId: registered.packId, packVersion: registered.packVersion,
      packChecksum: registered.packChecksum, knowledgeVersionId: COVERAGE_KNOWLEDGE_VERSION_ID,
      variables: pack.variables.map((v) => v.id), informationNeeds: needs,
      acquisitions: pack.acquisitions.map((a) => ({ ...a,
        sourceText: a.question ?? needs.find((n) => n.id === a.informationNeedRef)?.statement ?? "",
        cardinality: { variableCount: a.variableRefs.length, informationNeedCount: needs.filter((n) => n.acquisitionRefs?.includes(a.id)).length },
        criteria: COVERAGE_CRITERIA_REGISTRY.filter((e) => e.capabilityId === capabilityId && e.acquisitionRef === a.id),
      })),
      acquisitionsWithoutCriteria: pack.acquisitions.filter((a) => !COVERAGE_CRITERIA_REGISTRY.some((e) => e.capabilityId === capabilityId && e.acquisitionRef === a.id)).map((a) => a.id),
      needsWithoutExplicitAcquisition: needs.filter((n) => !n.acquisitionRefs?.some((id) => pack.acquisitions.some((a) => a.id === id))).map((n) => ({ ...n,
        diagnosticImpact: "NOT_ASSUMED_ZERO", evidenceState: "NO_SYNTHETIC_EVIDENCE_IN_INVENTORY",
        factualAdmission: "REQUIRES_VALIDATED_VARIABLE_MAPPING_AND_REAL_CANONICAL_ACQUISITION; THEMATIC_NI_NOT_ADMISSIBLE",
      })),
      technicalCompatibility: "ATOMIC_ACQUISITION_COVERAGE_SUPPORTED",
      gaps: ["NO_AUTOMATED_SEMANTIC_VALIDATION", "NO_GOVERNED_SUFFICIENCY_FORMULA", "CRITERIA_REVIEW_REQUIRED_BEFORE_EXPANSION"],
    };
  });
}