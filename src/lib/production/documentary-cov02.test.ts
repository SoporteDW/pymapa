/**
 * INT-01-COV-02 · Banco sintético del contrato gobernado de cobertura
 * documental (DG-01). Sin IA, sin datos reales, sin tocar Master/packs/Engine.
 *
 * Regla bajo prueba: una correspondencia VALIDATED con observación admitida
 * NO descuenta la adquisición; el descuento exige decisión FULL gobernada
 * (OWNER/ADMIN, justificada, ligada a la adquisición factual) sin conflicto
 * vigente. PARTIAL es el default conservador y nunca descuenta.
 */
import { readFileSync } from "node:fs";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { describe, expect, it } from "vitest";
import { createInMemoryProductionRepository, type DocumentMappingRecord, type ObservationRecord } from "./puertos";
import { admitirCorrespondenciasDocumentales } from "./document-admission-bridge";
import { evaluarCapacidad, submitAcquisitionResponse } from "./caso-uso";
import { createActionableProjector } from "./actionable";
import { reutilizarEvidenciaDocumental } from "./cross-capability-evidence";
import { assertDocumentGovernanceRole } from "./capability-handlers";

function pack(id: string) { return JSON.parse(readFileSync(`knowledge/packs/${id.toLowerCase()}/1.0.0/pack.json`, "utf8")); }
const ORG = "qa-cov02-a", ASSESS = "qa-cov02-assessment", KV = "qa-cov02-kv";

function setup(id = "DG-01", role: "OWNER" | "ADMIN" | "MEMBER" = "OWNER") {
  const raw = pack(id), engine = createKnowledgeEngine(raw);
  const repo = createInMemoryProductionRepository([{ id: ASSESS, organizationId: ORG, caseId: "qa-cov02-case",
    knowledgeVersionId: KV, type: "BASELINE", startedAt: null, closedAt: null, updatedAt: "2026-10-18" }],
    [{ organizationId: ORG, userId: "qa-cov02-user", role }]);
  const state = repo.estado as unknown as { documentMappings: DocumentMappingRecord[]; observations: ObservationRecord[]; auditEvents: unknown[] };
  return { raw, engine, repo, state, deps: { engine, repository: repo, knowledgeVersionId: KV } };
}

function mapping(overrides: Partial<DocumentMappingRecord> = {}): DocumentMappingRecord {
  return { id: "qa-cov02-map", organizationId: ORG, assessmentId: ASSESS, capabilityId: "DG-01",
    targetType: "VARIABLE", targetRef: "VA01", fragmentId: "qa-cov02-fragment", interpretationId: "qa-cov02-interpretation",
    knowledgeVersionId: KV, knowledgePackId: "dg-01", knowledgePackVersion: "1.0.0",
    proposedBy: "HUMAN", status: "VALIDATED", admissionBasis: "HUMAN_VALIDATION", admissionRuleRef: null,
    factualCorrespondenceRef: "ACQ·NI01", validatedBy: "qa-cov02-user", validatedAt: "2026-10-18",
    supersedesMappingId: null, createdAt: "2026-10-18", extractionId: "qa-cov02-extraction", evidenceId: "qa-cov02-evidence",
    fragmentText: "Fragmento sintético verificable", interpretationStatement: "Hecho sintético completo",
    ...overrides };
}

/** Decisión gobernada FULL sobre la adquisición factual del mapping. */
function conCoberturaFull(m: DocumentMappingRecord): DocumentMappingRecord {
  return { ...m, coverageScope: "FULL", coverageAcquisitionRef: m.factualCorrespondenceRef,
    coverageJustification: "La evidencia sintética cubre por completo la adquisición.", coverageDecidedBy: "qa-cov02-user",
    coverageDecidedAt: "2026-10-18" };
}

async function workspace(s: ReturnType<typeof setup>) {
  const result = await evaluarCapacidad(s.deps, ASSESS);
  if (!result) throw new Error("missing synthetic assessment");
  return { result, workspace: createActionableProjector(s.raw).derive({ engine: s.engine, ...result }) };
}

describe("INT-01-COV-02 · cobertura documental gobernada (DG-01)", () => {
  it("COV-01: evidencia completa, justificada y gobernada descuenta la adquisición", async () => {
    const s = setup();
    s.state.documentMappings.push(conCoberturaFull(mapping()));
    expect((await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS })).admitted).toBe(1);
    const { result, workspace: w } = await workspace(s);
    expect(w.documentaryCoverage[0]?.state).toBe("COMPLETE");
    expect(w.documentaryCoverage[0]?.reason).toBe("COVERAGE_DECLARED_FULL");
    expect(result.answeredAcquisitionIds).toContain("ACQ·NI01");
    expect(w.pendingInformationTasks.map((a) => a.acquisitionId)).not.toContain("ACQ·NI01");
    expect(w.counts.answered).toBe(1);
  });

  it("COV-02: evidencia parcial (default conservador) no descuenta adquisiciones", async () => {
    const s = setup();
    s.state.documentMappings.push(mapping()); // sin decisión: PARTIAL
    await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    const { result, workspace: w } = await workspace(s);
    expect(w.documentaryCoverage[0]?.state).toBe("PARTIAL");
    expect(result.answeredAcquisitionIds).not.toContain("ACQ·NI01");
    expect(w.pendingInformationTasks.map((a) => a.acquisitionId)).toContain("ACQ·NI01");
  });

  it("COV-03: evidencia temática no factual no descuenta adquisiciones", async () => {
    const s = setup();
    s.state.documentMappings.push(mapping({ targetType: "INFORMATION_NEED", targetRef: "NI01", factualCorrespondenceRef: null }));
    expect((await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS })).admitted).toBe(0);
    const { result, workspace: w } = await workspace(s);
    expect(w.documentaryCoverage).toEqual([]);
    expect(result.answeredAcquisitionIds).not.toContain("ACQ·NI01");
    expect(w.pendingInformationTasks.map((a) => a.acquisitionId)).toContain("ACQ·NI01");
  });

  it("COV-04: evidencia contradictoria no descuenta y conserva la aclaración, incluso con FULL", async () => {
    const s = setup();
    s.state.documentMappings.push(conCoberturaFull(mapping()));
    await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    await submitAcquisitionResponse(s.deps, { organizationId: ORG, assessmentId: ASSESS, submittedBy: "qa-cov02-user",
      acquisitionId: "ACQ·NI01", knowledgeState: "KNOWN", semanticValue: "Declaración manual distinta e incompatible" });
    const { result, workspace: w } = await workspace(s);
    expect(result.evaluation.contradictions).toHaveLength(1);
    expect(w.documentaryCoverage[0]?.state).toBe("CONTRADICTORY");
    expect(result.answeredAcquisitionIds).not.toContain("ACQ·NI01");
    expect(w.pendingInformationTasks.map((a) => a.acquisitionId)).toContain("ACQ·NI01");
  });

  it("COV-05: revocar la cobertura completa restituye la adquisición pendiente", async () => {
    const s = setup();
    s.state.documentMappings.push(conCoberturaFull(mapping()));
    await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    expect((await workspace(s)).result.answeredAcquisitionIds).toContain("ACQ·NI01");
    // Revocación gobernada: FULL → PARTIAL (la observación admitida sigue vigente).
    s.state.documentMappings[0] = { ...s.state.documentMappings[0]!, coverageScope: "PARTIAL", coverageAcquisitionRef: null,
      coverageJustification: "Se revierte: la evidencia no demuestra cobertura completa.", coverageDecidedAt: "2026-10-18" };
    const { result, workspace: w } = await workspace(s);
    expect(w.documentaryCoverage[0]?.state).toBe("PARTIAL");
    expect(result.answeredAcquisitionIds).not.toContain("ACQ·NI01");
    expect(w.pendingInformationTasks.map((a) => a.acquisitionId)).toContain("ACQ·NI01");
  });

  it("COV-06: la reutilización transversal no transfiere la cobertura", async () => {
    const s = setup();
    s.state.documentMappings.push(conCoberturaFull(mapping()));
    await s.repo.insertEvidence({ organizationId: ORG, assessmentId: ASSESS, caseId: "qa-cov02-case",
      candidateRef: null, evidenceType: "SYNTHETIC", source: "DOCUMENT", storageBucket: null, storagePath: null,
      externalReference: null, title: "QA", note: null, submittedBy: "qa-cov02-user", respondentId: null, capturedAt: null });
    const evidence = (await s.repo.listEvidence(ASSESS))[0];
    if (!evidence) throw new Error("missing evidence");
    s.state.documentMappings[0] = { ...s.state.documentMappings[0]!, evidenceId: evidence.id };
    const target = createKnowledgeEngine(pack("PC-01"));
    const reusado = await reutilizarEvidenciaDocumental({
      repository: s.repo, knowledgeVersionId: KV, packId: target.pack.packId, packVersion: target.pack.packVersion,
      catalog: { capabilityId: "PC-01", acquisitions: target.listAcquisitions().map((a) => ({ id: a.id, variableRefs: a.variableRefs,
        ...(a.acquisitionMode ? { acquisitionMode: a.acquisitionMode } : {}) })), variableIds: target.pack.variables.map((v) => v.id),
        informationNeedIds: (target.pack.informationNeeds ?? []).map((n) => n.id), evidenceCriterionIds: [] },
    }, { organizationId: ORG, assessmentId: ASSESS, actorUserId: "qa-cov02-user", sourceMappingId: "qa-cov02-map",
      targetType: "INFORMATION_NEED", targetRef: "NI01" });
    // Candidato independiente: sin admisión, sin factual ref y sin cobertura.
    expect(reusado.status).toBe("CANDIDATE");
    expect(reusado.factualCorrespondenceRef).toBeNull();
    expect(reusado.coverageScope ?? "PARTIAL").toBe("PARTIAL");
    expect(reusado.coverageAcquisitionRef ?? null).toBeNull();
  });

  it("COV-07: MEMBER no puede declarar cobertura (guardia de gobierno)", () => {
    expect(() => assertDocumentGovernanceRole("MEMBER")).toThrowError("DOCUMENT_GOVERNANCE_FORBIDDEN");
    expect(() => assertDocumentGovernanceRole(null)).toThrowError("DOCUMENT_GOVERNANCE_FORBIDDEN");
    expect(() => assertDocumentGovernanceRole("ADMIN")).not.toThrow();
    expect(() => assertDocumentGovernanceRole("OWNER")).not.toThrow();
  });

  it("COV-08: correspondencia VALIDATED histórica sin calificación no descuenta", async () => {
    const s = setup();
    const historica = mapping();
    delete historica.coverageScope; // fila histórica: sin calificación explícita
    s.state.documentMappings.push(historica);
    await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    const { result, workspace: w } = await workspace(s);
    expect(w.documentaryCoverage[0]?.state).toBe("PARTIAL");
    expect(result.answeredAcquisitionIds).not.toContain("ACQ·NI01");
  });

  it("COV-09: la cobertura queda aislada por organización, assessment y adquisición", async () => {
    const s = setup();
    // Mapping FULL de OTRA organización con el mismo assessment id lógico.
    s.state.documentMappings.push(conCoberturaFull(mapping({ organizationId: "qa-cov02-otra-org" })));
    await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    const { result, workspace: w } = await workspace(s);
    expect(w.documentaryCoverage).toEqual([]);
    expect(result.answeredAcquisitionIds).not.toContain("ACQ·NI01");
    // FULL sobre una adquisición distinta de la factual no descuenta ésta.
    const s2 = setup();
    s2.state.documentMappings.push(conCoberturaFull(mapping({ coverageAcquisitionRef: "ACQ·NI02" })));
    await admitirCorrespondenciasDocumentales(s2.deps, { organizationId: ORG, assessmentId: ASSESS });
    const w2 = await workspace(s2);
    expect(w2.workspace.documentaryCoverage[0]?.state).toBe("PARTIAL");
    expect(w2.result.answeredAcquisitionIds).not.toContain("ACQ·NI01");
  });

  it("COV-10: las respuestas manuales conservan su comportamiento", async () => {
    const s = setup();
    const manual = await submitAcquisitionResponse(s.deps, { organizationId: ORG, assessmentId: ASSESS, submittedBy: "qa-cov02-user",
      acquisitionId: "ACQ·NI01", knowledgeState: "KNOWN", semanticValue: "Respuesta manual sintética" });
    expect(manual.accepted).toBe(true);
    const { result, workspace: w } = await workspace(s);
    expect(result.answeredAcquisitionIds).toContain("ACQ·NI01");
    expect(w.documentaryCoverage).toEqual([]);
  });
});
