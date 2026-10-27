import { describe, expect, it } from "vitest";
import { OFFICIAL_CAPABILITY_IDS, getRegisteredPack } from "./packs-registry";
import { cargarEngine } from "./runtime.server";
import { createActionableProjector } from "./actionable";
import { createInMemoryProductionRepository } from "./puertos";
import { scopeRepositoryToCapability } from "./capability-scope";
import { evaluarCapacidad, registrarEvidencia, submitAcquisitionResponse } from "./caso-uso";

const assessment = { id: "nov-assessment", organizationId: "nov-org", caseId: "nov-case", knowledgeVersionId: "nov-kv", type: "BASELINE" as const, startedAt: null, closedAt: null, updatedAt: "2026-10-27T00:00:00Z" };

describe("PYM-NOV-B01 · contratos transversales", () => {
  it("31 capacidades en seis dominios; dos con reglas publicadas y 29 de captura", () => {
    expect(OFFICIAL_CAPABILITY_IDS).toHaveLength(31);
    expect(new Set(OFFICIAL_CAPABILITY_IDS.map((id) => id.slice(0, 2))).size).toBe(6);
    const evaluables = OFFICIAL_CAPABILITY_IDS.filter((id) => createActionableProjector(getRegisteredPack(id).pack).diagnosticMode === "PUBLISHED_RULES");
    expect(evaluables).toEqual(["OP-01", "OP-02"]);
    expect(OFFICIAL_CAPABILITY_IDS.length - evaluables.length).toBe(29);
  });

  it.each(OFFICIAL_CAPABILITY_IDS)("%s carga, captura y recupera con nuevo scope; evidencia asociada", async (id) => {
    const base = createInMemoryProductionRepository([assessment]);
    const engine = cargarEngine(id);
    const projector = createActionableProjector(getRegisteredPack(id).pack);
    const repository = scopeRepositoryToCapability(base, id);
    const deps = { engine, repository, knowledgeVersionId: assessment.knowledgeVersionId };
    const initial = await evaluarCapacidad(deps, assessment.id);
    if (!initial) throw new Error("missing assessment");
    const workspace = projector.derive({ engine, evaluation: initial.evaluation, answeredAcquisitionIds: initial.answeredAcquisitionIds });
    const acquisition = workspace.nextQuestion ?? workspace.pendingInformationTasks[0];
    if (!acquisition) throw new Error(`No capture contract: ${id}`);
    expect(acquisition.allowedKnowledgeStates).toEqual(["KNOWN", "UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"]);
    const result = await submitAcquisitionResponse(deps, { assessmentId: assessment.id, organizationId: assessment.organizationId, submittedBy: null, acquisitionId: acquisition.acquisitionId, knowledgeState: "UNKNOWN" });
    expect(result.accepted).toBe(true);
    if (!result.observationId) throw new Error("missing observation");
    const evidence = await registrarEvidencia(deps, { organizationId: assessment.organizationId, caseId: assessment.caseId, assessmentId: assessment.id, evidenceType: "DOCUMENT", source: "DOCUMENT", submittedBy: null, title: `Synthetic B01 ${id}`, uploadContextCapabilityId: id, observationIds: [result.observationId] });
    expect(evidence.evidence.organizationId).toBe("nov-org");
    expect(evidence.evidence.uploadContextCapabilityId).toBe(id);
    expect(evidence.links.map((l) => l.observationId)).toEqual([result.observationId]);
    const recovered = scopeRepositoryToCapability(base, id);
    expect((await recovered.listResponses(assessment.id))[0]?.payload.capabilityId).toBe(id);
    expect((await recovered.listObservations(assessment.id))[0]?.value.knowledgeState).toBe("UNKNOWN");
    const evaluation = await evaluarCapacidad({ ...deps, repository: recovered }, assessment.id);
    if (!evaluation) throw new Error("missing recovered evaluation");
    expect(projector.derive({ engine, evaluation: evaluation.evaluation, answeredAcquisitionIds: evaluation.answeredAcquisitionIds }).counts.answered).toBe(1);
    if (id !== "OP-01" && id !== "OP-02") expect(await recovered.listFindings(assessment.id)).toEqual([]);
    const otherId = id === "DG-01" ? "PC-01" : "DG-01";
    expect(await scopeRepositoryToCapability(base, otherId).listResponses(assessment.id)).toEqual([]);
    expect(await recovered.listResponses("another-organization-assessment")).toEqual([]);
  });

  it.each(["KNOWN", "UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"] as const)("%s sigue siendo disponibilidad y nunca crea hallazgos en las otras 29", async (state) => {
    for (const id of OFFICIAL_CAPABILITY_IDS.filter((id) => id !== "OP-01" && id !== "OP-02")) {
      const base = createInMemoryProductionRepository([assessment]);
      const deps = { engine: cargarEngine(id), repository: scopeRepositoryToCapability(base, id), knowledgeVersionId: "nov-kv" };
      const acquisition = deps.engine.listAcquisitions()[0];
      if (!acquisition) throw new Error("missing acquisition");
      const result = await submitAcquisitionResponse(deps, { assessmentId: assessment.id, organizationId: assessment.organizationId, submittedBy: null, acquisitionId: acquisition.id, knowledgeState: state, semanticValue: state === "KNOWN" || state === "CONTRADICTORY" ? "Dato sintético B01" : null, notApplicableReason: state === "NOT_APPLICABLE" ? "Alcance sintético excluido" : null, ...(state === "CONTRADICTORY" ? { conflictingObservationIds: ["synthetic-source-a", "synthetic-source-b"] } : {}) });
      expect(result.accepted).toBe(true);
      expect(await deps.repository.listFindings(assessment.id)).toEqual([]);
    }
  });
});