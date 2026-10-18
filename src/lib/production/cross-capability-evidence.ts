/** E2: original fragment reused; no interpretation, admission or diagnostic values transferred. */
import type { DocumentMappingRecord, ProductionRepository } from "./puertos";
import type { CatalogoCapacidad } from "./fragment-mapping-guard";

export interface ReuseInput {
  organizationId: string; assessmentId: string; actorUserId: string; sourceMappingId: string;
  targetType: DocumentMappingRecord["targetType"]; targetRef: string;
}

export async function reutilizarEvidenciaDocumental(
  deps: { repository: ProductionRepository; catalog: CatalogoCapacidad; knowledgeVersionId: string; packId: string; packVersion: string },
  input: ReuseInput,
): Promise<DocumentMappingRecord> {
  const assessment = await deps.repository.getAssessment(input.assessmentId);
  if (!assessment || assessment.organizationId !== input.organizationId) throw new Error("ORGANIZATION_MISMATCH");
  if (assessment.knowledgeVersionId !== deps.knowledgeVersionId) throw new Error("KNOWLEDGE_VERSION_MISMATCH");
  const role = await deps.repository.getMembershipRole(input.organizationId, input.actorUserId);
  if (role !== "OWNER" && role !== "ADMIN") throw new Error("DOCUMENT_REUSE_FORBIDDEN");
  const source = (await deps.repository.listDocumentMappings(input.assessmentId)).find((m) => m.id === input.sourceMappingId);
  if (!source || source.organizationId !== input.organizationId || source.assessmentId !== input.assessmentId) throw new Error("SOURCE_MAPPING_NOT_IN_ORGANIZATION");
  if (source.status === "SUPERSEDED" || source.status === "REJECTED") throw new Error("SOURCE_MAPPING_NOT_CURRENT");
  if (source.capabilityId === deps.catalog.capabilityId) throw new Error("TARGET_CAPABILITY_MUST_DIFFER");
  if (!source.fragmentId || !source.extractionId || !source.evidenceId || !source.fragmentText) throw new Error("DOCUMENT_LINEAGE_REQUIRED");
  const evidence = (await deps.repository.listEvidence(input.assessmentId)).find((e) => e.id === source.evidenceId);
  if (!evidence || evidence.organizationId !== input.organizationId || evidence.assessmentId !== input.assessmentId || evidence.source !== "DOCUMENT") throw new Error("EVIDENCE_NOT_IN_ORGANIZATION");
  const cat = deps.catalog;
  const exists = input.targetType === "ACQUISITION" ? cat.acquisitions.some((a) => a.id === input.targetRef)
    : input.targetType === "VARIABLE" ? cat.variableIds.includes(input.targetRef)
    : input.targetType === "INFORMATION_NEED" ? cat.informationNeedIds.includes(input.targetRef)
    : cat.evidenceCriterionIds.includes(input.targetRef);
  if (!exists) throw new Error("TARGET_NOT_IN_PACK");
  // Stable primary key: plain INSERT plus duplicate recovery is concurrency safe; no UPDATE.
  const key = JSON.stringify([input.organizationId, input.assessmentId, source.fragmentId, cat.capabilityId, input.targetType, input.targetRef, deps.packId, deps.packVersion]);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const bytes = new Uint8Array(hash).slice(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 15) | 80;
  bytes[8] = ((bytes[8] ?? 0) & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return deps.repository.insertDocumentReuseCandidate({
    id, organizationId: input.organizationId, assessmentId: input.assessmentId,
    fragmentId: source.fragmentId, interpretationId: null, capabilityId: cat.capabilityId,
    targetType: input.targetType, targetRef: input.targetRef, knowledgeVersionId: deps.knowledgeVersionId,
    knowledgePackId: deps.packId, knowledgePackVersion: deps.packVersion, proposedBy: "HUMAN",
    status: "CANDIDATE", admissionBasis: null, admissionRuleRef: null, factualCorrespondenceRef: null,
    validatedBy: null, validatedAt: null, supersedesMappingId: null,
    extractionId: source.extractionId, evidenceId: source.evidenceId, fragmentText: source.fragmentText,
    interpretationStatement: null, reuseSourceMappingId: source.id,
  }, input.actorUserId);
}