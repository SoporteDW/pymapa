import { readFileSync } from "node:fs";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { describe, expect, it } from "vitest";
import { createInMemoryProductionRepository, type DocumentMappingRecord, type ObservationRecord } from "./puertos";
import { admitirCorrespondenciasDocumentales } from "./document-admission-bridge";
import { evaluarCapacidad, getNextAcquisition, submitAcquisitionResponse } from "./caso-uso";
import { createActionableProjector } from "./actionable";
import { reutilizarEvidenciaDocumental } from "./cross-capability-evidence";
import { scopeRepositoryToCapability } from "./capability-scope";

function pack(id: string) { return JSON.parse(readFileSync(`knowledge/packs/${id.toLowerCase()}/1.0.0/pack.json`, "utf8")); }
const ORG = "qa-e2-a", ASSESS = "qa-e2-assessment", KV = "qa-e2-kv";
function setup(id = "DG-01", role: "OWNER" | "ADMIN" | "MEMBER" = "OWNER") {
  const raw = pack(id), engine = createKnowledgeEngine(raw);
  const repo = createInMemoryProductionRepository([{ id: ASSESS, organizationId: ORG, caseId: "qa-e2-case",
    knowledgeVersionId: KV, type: "BASELINE", startedAt: null, closedAt: null, updatedAt: "2026-10-18" }],
    [{ organizationId: ORG, userId: "qa-e2-user", role }]);
  const state = repo.estado as unknown as { documentMappings: DocumentMappingRecord[]; observations: ObservationRecord[]; auditEvents: unknown[] };
  return { raw, engine, repo, state, deps: { engine, repository: repo, knowledgeVersionId: KV } };
}
function mapping(id = "DG-01", acquisitionId = "ACQ·NI01", variable = "VA01"): DocumentMappingRecord {
  return { id: "qa-e2-map", organizationId: ORG, assessmentId: ASSESS, capabilityId: id,
    targetType: "VARIABLE", targetRef: variable, fragmentId: "qa-e2-fragment", interpretationId: "qa-e2-interpretation",
    knowledgeVersionId: KV, knowledgePackId: id.toLowerCase(), knowledgePackVersion: "1.0.0",
    proposedBy: "HUMAN", status: "VALIDATED", admissionBasis: "HUMAN_VALIDATION", admissionRuleRef: null,
    factualCorrespondenceRef: acquisitionId, validatedBy: "qa-e2-user", validatedAt: "2026-10-18",
    supersedesMappingId: null, createdAt: "2026-10-18", extractionId: "qa-e2-extraction", evidenceId: "qa-e2-evidence",
    fragmentText: "Fragmento sintético incompleto", interpretationStatement: "Hecho sintético parcial" };
}
async function workspace(s: ReturnType<typeof setup>) {
  const result = await evaluarCapacidad(s.deps, ASSESS);
  if (!result) throw new Error("missing synthetic assessment");
  return { result, workspace: createActionableProjector(s.raw).derive({ engine: s.engine, ...result }) };
}
async function reuseSetup(role: "OWNER" | "ADMIN" | "MEMBER" = "OWNER") {
  const s = setup("DG-01", role); s.state.documentMappings.push(mapping());
  await s.repo.insertEvidence({ id: undefined, organizationId: ORG, assessmentId: ASSESS, caseId: "qa-e2-case",
    candidateRef: null, evidenceType: "SYNTHETIC", source: "DOCUMENT", storageBucket: null, storagePath: null,
    externalReference: null, title: "QA", note: null, submittedBy: "qa-e2-user", respondentId: null, capturedAt: null } as Parameters<typeof s.repo.insertEvidence>[0]);
  const evidence = await s.repo.listEvidence(ASSESS);
  const first = evidence[0]; if (!first) throw new Error("missing evidence");
  s.state.documentMappings[0] = { ...mapping(), evidenceId: first.id };
  const target = createKnowledgeEngine(pack("PC-01"));
  const reuseDeps = { repository: s.repo, knowledgeVersionId: KV, packId: target.pack.packId, packVersion: target.pack.packVersion,
    catalog: { capabilityId: "PC-01", acquisitions: target.listAcquisitions(), variableIds: target.pack.variables.map((v) => v.id),
      informationNeedIds: (target.pack.informationNeeds ?? []).map((n) => n.id), evidenceCriterionIds: [] } };
  const input = { organizationId: ORG, assessmentId: ASSESS, actorUserId: "qa-e2-user", sourceMappingId: "qa-e2-map",
    targetType: "INFORMATION_NEED" as const, targetRef: "NI01" };
  return { ...s, target, reuseDeps, input };
}

describe("E2 conservative coverage", () => {
  it.each(["DG-01", "DT-02", "CM-05", "OP-05"])("four archetypes: %s metadata alone never demonstrates completeness", async (id) => {
    const s = setup(id), acq = s.engine.listAcquisitions()[0];
    if (!acq) throw new Error("missing acquisition");
    s.state.documentMappings.push({ ...mapping(id, acq.id, acq.variableRefs[0]), targetType: "ACQUISITION", targetRef: acq.id });
    const { result, workspace: w } = await workspace(s);
    expect(result.evaluation.answeredAcquisitionRefs).not.toContain(acq.id);
    expect(w.counts.answered).toBe(0);
    expect(result.evaluation.sufficiency.state).toBeNull();
  });
  it("T-E2-02: admitted partial DG-01 fact stays pending in Engine and workspace", async () => {
    const s = setup(); s.state.documentMappings.push(mapping());
    expect((await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS })).admitted).toBe(1);
    const { result, workspace: w } = await workspace(s);
    expect(result.evaluation.variableEvaluations.find((v) => v.variableRef === "VA01")?.state).toBe("KNOWN");
    expect(result.evaluation.answeredAcquisitionRefs).not.toContain("ACQ·NI01");
    expect(w.pendingInformationTasks.map((a) => a.acquisitionId)).toContain("ACQ·NI01");
    expect(w.documentaryCoverage[0]?.reason).toBe("ACQUISITION_COMPLETENESS_NOT_GOVERNED");
  });
  it("T-E2-03: CM-05 thematic progressive mapping leaves first question available", async () => {
    const s = setup("CM-05");
    s.state.documentMappings.push(mapping("CM-05", "ACQ·P1·01"));
    expect((await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS })).admitted).toBe(0);
    expect((await getNextAcquisition(s.deps, ASSESS))?.acquisitionId).toBe("ACQ·P1·01");
  });
  it("T-E2-04: supersession withdraws document even before E1 control; manual response remains", async () => {
    const s = setup(); s.state.documentMappings.push(mapping());
    await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    const manual = await submitAcquisitionResponse(s.deps, { organizationId: ORG, assessmentId: ASSESS, submittedBy: "qa-e2-user",
      acquisitionId: "ACQ·NI01", knowledgeState: "KNOWN", semanticValue: "Hecho sintético parcial" });
    expect(manual.accepted).toBe(true);
    s.state.documentMappings[0] = { ...mapping(), status: "SUPERSEDED" };
    const current = await workspace(s);
    expect(current.result.answeredAcquisitionIds).toContain("ACQ·NI01");
    expect(current.workspace.documentaryCoverage).toEqual([]);
    expect((await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS })).invalidated).toBe(1);
    expect((await workspace(s)).result.answeredAcquisitionIds).toContain("ACQ·NI01");
    expect(s.state.observations).toHaveLength(3);
  });
  it("T-E2-04: invalidation without manual response leaves the task pending and no documentary variable", async () => {
    const s = setup(); s.state.documentMappings.push(mapping());
    await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    s.state.documentMappings[0] = { ...mapping(), status: "SUPERSEDED" };
    const result = await workspace(s);
    expect(result.workspace.pendingInformationTasks.map((a) => a.acquisitionId)).toContain("ACQ·NI01");
    expect(result.result.evaluation.variableEvaluations.find((v) => v.variableRef === "VA01")?.state).toBe("UNKNOWN");
    expect(s.state.observations).toHaveLength(1);
  });
  it("manual-document conflict cannot silently hide the task", async () => {
    const s = setup(); s.state.documentMappings.push(mapping());
    await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    await submitAcquisitionResponse(s.deps, { organizationId: ORG, assessmentId: ASSESS, submittedBy: "qa-e2-user",
      acquisitionId: "ACQ·NI01", knowledgeState: "KNOWN", semanticValue: "Otra declaración sintética" });
    const { result, workspace: w } = await workspace(s);
    expect(result.evaluation.contradictions).toHaveLength(1);
    expect(result.answeredAcquisitionIds).not.toContain("ACQ·NI01");
    expect(w.pendingInformationTasks.map((a) => a.acquisitionId)).toContain("ACQ·NI01");
    expect(w.documentaryCoverage[0]?.state).toBe("CONTRADICTORY");
    expect(s.state.observations).toHaveLength(2);
  });
  it("T-E2-09: current manual CM-05 responses still advance to next progressive question", async () => {
    const s = setup("CM-05");
    const response = await submitAcquisitionResponse(s.deps, { organizationId: ORG, assessmentId: ASSESS, submittedBy: "qa-e2-user",
      acquisitionId: "ACQ·P1·01", knowledgeState: "KNOWN", semanticValue: "Respuesta sintética manual" });
    expect(response.accepted).toBe(true);
    expect((await workspace(s)).result.answeredAcquisitionIds).toContain("ACQ·P1·01");
    expect((await getNextAcquisition(s.deps, ASSESS))?.acquisitionId).not.toBe("ACQ·P1·01");
  });
});

describe("E2 cross-capability reuse", () => {
  it("T-E2-05: original evidence, independent candidate, auditable and concurrent retries idempotent", async () => {
    const s = await reuseSetup();
    const results = await Promise.all(Array.from({ length: 4 }, () => reutilizarEvidenciaDocumental(s.reuseDeps, s.input)));
    expect(new Set(results.map((m) => m.id)).size).toBe(1);
    expect(s.state.documentMappings).toHaveLength(2);
    expect(results[0]?.status).toBe("CANDIDATE");
    expect(results[0]?.fragmentId).toBe("qa-e2-fragment");
    expect(results[0]?.evidenceId).toBe(s.state.documentMappings[0]?.evidenceId);
    expect(results[0]?.interpretationId).toBeNull();
    expect(results[0]?.admissionBasis).toBeNull();
    expect(results[0]?.factualCorrespondenceRef).toBeNull();
    expect((await s.repo.listEvidence(ASSESS))).toHaveLength(1);
    expect(s.state.auditEvents).toHaveLength(1);
  });
  it("T-E2-06: foreign organization source is rejected with no write", async () => {
    const s = await reuseSetup();
    const source = s.state.documentMappings[0]; if (!source) throw new Error("missing source");
    s.state.documentMappings[0] = { ...source, organizationId: "qa-e2-b" };
    await expect(reutilizarEvidenciaDocumental(s.reuseDeps, s.input)).rejects.toThrow("SOURCE_MAPPING_NOT_IN_ORGANIZATION");
    expect(s.state.documentMappings).toHaveLength(1);
  });
  it("T-E2-07: source validation never validates receiver; retry never resets receiver decision", async () => {
    const s = await reuseSetup();
    const created = await reutilizarEvidenciaDocumental(s.reuseDeps, s.input);
    expect(s.state.documentMappings[0]?.status).toBe("VALIDATED");
    expect(created.status).toBe("CANDIDATE");
    const index = s.state.documentMappings.findIndex((m) => m.id === created.id);
    s.state.documentMappings[index] = { ...created, status: "REJECTED" };
    expect((await reutilizarEvidenciaDocumental(s.reuseDeps, s.input)).status).toBe("REJECTED");
  });
  it("T-E2-08: candidate does not bypass E1 or transfer observations/conclusions to PC-01", async () => {
    const s = await reuseSetup(); await reutilizarEvidenciaDocumental(s.reuseDeps, s.input);
    const targetDeps = { engine: s.target, repository: scopeRepositoryToCapability(s.repo, "PC-01"), knowledgeVersionId: KV };
    expect((await admitirCorrespondenciasDocumentales(targetDeps, { organizationId: ORG, assessmentId: ASSESS })).admitted).toBe(0);
    const evaluated = await evaluarCapacidad(targetDeps, ASSESS);
    expect(evaluated?.evaluation.answeredAcquisitionRefs).toEqual([]);
    expect(evaluated?.evaluation.variableEvaluations.every((v) => v.state === "UNKNOWN")).toBe(true);
    expect(s.state.observations).toHaveLength(0);
    expect((await s.repo.listFindings(ASSESS))).toHaveLength(0);
  });
  it("MEMBER cannot create reuse proposal", async () => {
    const s = await reuseSetup("MEMBER");
    await expect(reutilizarEvidenciaDocumental(s.reuseDeps, s.input)).rejects.toThrow("DOCUMENT_REUSE_FORBIDDEN");
    expect(s.state.documentMappings).toHaveLength(1);
  });
  it("target absent from canonical pack cannot be proposed", async () => {
    const s = await reuseSetup();
    await expect(reutilizarEvidenciaDocumental(s.reuseDeps, { ...s.input, targetRef: "NI-NOT-CANONICAL" })).rejects.toThrow("TARGET_NOT_IN_PACK");
    expect(s.state.documentMappings).toHaveLength(1);
  });
});