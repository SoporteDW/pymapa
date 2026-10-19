/**
 * INT-01-COV-03 · BUILD 01 · Gate A (registro transversal) + Gate B (piloto CM-05 / ACQ·P1·01).
 * Sintético, sin IA, sin datos reales; Master/packs/Engine intactos.
 */
import { readFileSync } from "node:fs";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { describe, expect, it } from "vitest";
import { createInMemoryProductionRepository, type DocumentMappingRecord, type ObservationRecord } from "./puertos";
import { admitirCorrespondenciasDocumentales } from "./document-admission-bridge";
import { evaluarCapacidad } from "./caso-uso";
import { createActionableProjector } from "./actionable";
import { hasVerifiedStructuredCoverage } from "./documentary-coverage";
import {
  approvedCoverageCriteria, CM05_P101_COMPONENTS, COVERAGE_CRITERIA_REGISTRY, COVERAGE_KNOWLEDGE_VERSION_ID as KV, coverageModeFor,
} from "./coverage-criteria";

const ORG = "qa-cov03-org", ASSESS = "qa-cov03-assessment";
const QUOTES = [
  "Los momentos críticos son la entrega del pedido y la atención de reclamos.",
  "Fallar en la entrega es lo más grave porque el cliente pierde su evento.",
  "La dirección declara que no existen otros momentos críticos en la relación.",
];
const raw = JSON.parse(readFileSync("knowledge/packs/cm-05/1.0.0/pack.json", "utf8"));
const packHash = () => readFileSync("knowledge/packs/cm-05/1.0.0/pack.json", "utf8");

function setup() {
  const engine = createKnowledgeEngine(raw);
  const repo = createInMemoryProductionRepository([{ id: ASSESS, organizationId: ORG, caseId: "qa-cov03-case",
    knowledgeVersionId: KV, type: "BASELINE", startedAt: null, closedAt: null, updatedAt: "2026-10-19" }],
    [{ organizationId: ORG, userId: "qa-cov03-owner", role: "OWNER" }]);
  const state = repo.estado as unknown as { documentMappings: DocumentMappingRecord[]; observations: ObservationRecord[] };
  return { engine, repo, state, deps: { engine, repository: repo, knowledgeVersionId: KV } };
}

function mapping(scope: "FULL" | "PARTIAL", over: { components?: typeof CM05_P101_COMPONENTS | readonly { componentKey: string; componentDescription: string }[]; complete?: boolean; version?: string; status?: DocumentMappingRecord["status"] } = {}): DocumentMappingRecord {
  const id = "a0060000-0000-4000-8000-000000000001", fragmentId = "a0060000-0000-4000-8000-000000000002";
  const comps = over.components ?? CM05_P101_COMPONENTS;
  const declaration = { mappingId: id, acquisitionRef: "ACQ·P1·01", knowledgeVersionId: KV,
    coverageCriteriaVersion: over.version ?? "CM05-P101-COV-1.0.0", targetScope: scope,
    componentEvaluations: comps.map((c, i) => ({ componentKey: c.componentKey, componentDescription: c.componentDescription,
      supportState: "SUPPORTED", fragmentId, supportingQuote: QUOTES[i], componentJustification: "Confirmado por la dirección.",
      uncertaintyNotes: "", humanConfirmedRelevance: true })),
    synthesisJustification: "La dirección revisó los tres componentes del piloto.", humanConfirmedCompleteness: over.complete ?? true,
    expectedRevision: 0, requestId: "a0060000-0000-4000-8000-000000000003" };
  return { id, organizationId: ORG, assessmentId: ASSESS, capabilityId: "CM-05", targetType: "ACQUISITION", targetRef: "ACQ·P1·01",
    fragmentId, interpretationId: null, knowledgeVersionId: KV, knowledgePackId: "cm-05", knowledgePackVersion: "1.0.0",
    proposedBy: "HUMAN", status: over.status ?? "VALIDATED", admissionBasis: "HUMAN_VALIDATION", admissionRuleRef: null,
    factualCorrespondenceRef: null, validatedBy: "qa-cov03-owner", validatedAt: "2026-10-19", supersedesMappingId: null,
    createdAt: "2026-10-19", extractionId: "qa-cov03-extraction", evidenceId: "qa-cov03-evidence", fragmentText: QUOTES.join("\n"),
    interpretationStatement: null, coverageScope: scope, coverageAcquisitionRef: scope === "FULL" ? "ACQ·P1·01" : null,
    coverageDecidedBy: "qa-cov03-owner", coverageRevision: 1, coverageEvidenceCurrent: true,
    coverageEvaluation: { declaration, result: { coverageScope: scope, revision: 1 }, decidedBy: "qa-cov03-owner",
      evidenceId: "qa-cov03-evidence", extractionId: "qa-cov03-extraction" } } as DocumentMappingRecord;
}

async function ws(s: ReturnType<typeof setup>) {
  const r = await evaluarCapacidad(s.deps, ASSESS);
  if (!r) throw new Error("no assessment");
  return { r, w: createActionableProjector(raw).derive({ engine: s.engine, ...r }) };
}
const known = (r: Awaited<ReturnType<typeof ws>>["r"]) => r.evaluation.variableEvaluations.filter((v) => v.state === "KNOWN").map((v) => v.variableRef);

describe("COV-03A · registro transversal de criterios", () => {
  it("preserva DG01-NI04-COV-1.0.0 y registra el piloto CM05-P101 como prueba gobernada", () => {
    expect(approvedCoverageCriteria(KV, "DG-01", "ACQ·NI04")?.coverageCriteriaVersion).toBe("DG01-NI04-COV-1.0.0");
    const p = approvedCoverageCriteria(KV, "CM-05", "ACQ·P1·01");
    expect(p?.coverageCriteriaVersion).toBe("CM05-P101-COV-1.0.0");
    expect(p?.approvalStatus).toBe("PILOT_TEST_GOVERNED");
    expect(COVERAGE_CRITERIA_REGISTRY).toHaveLength(2);
  });
  it("todas las demás adquisiciones de los 31 packs quedan PARTIAL_ONLY", () => {
    const published = JSON.parse(readFileSync("knowledge/manifest.json", "utf8"));
    const ids: string[] = (published.packs ?? published.capabilities ?? []).map((x: { packId?: string; id?: string }) => x.packId ?? x.id);
    let full = 0, total = 0;
    for (const pid of ids) {
      const pk = JSON.parse(readFileSync(`knowledge/packs/${pid.toLowerCase()}/1.0.0/pack.json`, "utf8"));
      for (const a of pk.acquisitions ?? []) { total++; if (coverageModeFor(KV, pk.capability.id, a.id) === "FULL_ELIGIBLE") full++; }
    }
    expect(total).toBeGreaterThan(100);
    expect(full).toBe(2);
    expect(coverageModeFor(KV, "CM-05", "ACQ·P1·02")).toBe("PARTIAL_ONLY");
    expect(coverageModeFor("ee463f4d-2ed1-428d-8809-aa6ac0f43cb9", "CM-05", "ACQ·P1·01")).toBe("PARTIAL_ONLY");
  });
  it("los criterios piloto no se aplican a un mapping VARIABLE (arquetipo fijado)", () => {
    const m = { ...mapping("FULL"), targetType: "VARIABLE" as const, targetRef: "VA01", factualCorrespondenceRef: "ACQ·P1·01" };
    expect(hasVerifiedStructuredCoverage(m)).toBe(false);
  });
});

describe("COV-03B · piloto CM-05 / ACQ·P1·01 (DEC-COVQA-06)", () => {
  it("B1: inicialmente ACQ·P1·01 es la siguiente pregunta", async () => {
    const { w } = await ws(setup());
    expect(w.nextQuestion?.acquisitionId).toBe("ACQ·P1·01");
  });
  it("B2: una declaración PARTIAL no descuenta", async () => {
    const s = setup(); s.state.documentMappings.push(mapping("PARTIAL"));
    const { r, w } = await ws(s);
    expect(r.answeredAcquisitionIds).not.toContain("ACQ·P1·01");
    expect(w.nextQuestion?.acquisitionId).toBe("ACQ·P1·01");
  });
  it("B2b: FULL incompleto, sin confirmación o con criterios no aprobados no descuenta", async () => {
    for (const m of [mapping("FULL", { components: CM05_P101_COMPONENTS.slice(0, 2) }), mapping("FULL", { complete: false }), mapping("FULL", { version: "CM05-P101-COV-9.9.9" })]) {
      const s = setup(); s.state.documentMappings.push(m);
      expect((await ws(s)).r.answeredAcquisitionIds).not.toContain("ACQ·P1·01");
    }
  });
  it("B3-B6: FULL válido descuenta, siguiente es ACQ·P1·02, sin observaciones ni variables KNOWN", async () => {
    const before = await ws(setup());
    const s = setup(); s.state.documentMappings.push(mapping("FULL"));
    const report = await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    expect(report.admitted).toBe(0);
    expect(report.rejected[0]?.reason).toBe("THEMATIC_MAPPING_NOT_FACTUAL");
    const { r, w } = await ws(s);
    expect(r.answeredAcquisitionIds).toEqual(["ACQ·P1·01"]);
    expect(w.documentaryCoverage.find((c) => c.acquisitionId === "ACQ·P1·01")?.state).toBe("COMPLETE");
    expect(w.nextQuestion?.acquisitionId).toBe("ACQ·P1·02");
    expect(s.state.observations).toHaveLength(0);
    expect(known(r)).toEqual([]);
    expect(r.evaluation.variableEvaluations.map((v) => [v.variableRef, v.state])).toEqual(before.r.evaluation.variableEvaluations.map((v) => [v.variableRef, v.state]));
  });
  it("B7: revocación (SUPERSEDED) restituye ACQ·P1·01 pendiente", async () => {
    const s = setup(); s.state.documentMappings.push(mapping("FULL", { status: "SUPERSEDED" }));
    const { r, w } = await ws(s);
    expect(r.answeredAcquisitionIds).not.toContain("ACQ·P1·01");
    expect(w.nextQuestion?.acquisitionId).toBe("ACQ·P1·01");
  });
  it("B8: el pack CM-05 no se altera", () => {
    const h = packHash(); setup(); expect(packHash()).toBe(h);
  });
});
