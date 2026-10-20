/**
 * INT-01-COV-03 · BUILD 02 · Gate C · piloto OP-05 / ACQ·VA01#NI@L254 (operacional, N:1).
 * Sintético, sin IA, sin datos reales; Master/packs/Engine intactos.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { describe, expect, it } from "vitest";
import { createInMemoryProductionRepository, type DocumentMappingRecord, type ObservationRecord } from "./puertos";
import { admitirCorrespondenciasDocumentales } from "./document-admission-bridge";
import { evaluarCapacidad } from "./caso-uso";
import { createActionableProjector } from "./actionable";
import { hasVerifiedStructuredCoverage } from "./documentary-coverage";
import { validateStructuredCoverage } from "./structured-coverage";
import {
  approvedCoverageCriteria, COVERAGE_CRITERIA_REGISTRY, COVERAGE_KNOWLEDGE_VERSION_ID as KV, coverageModeFor, OP05_VA01_L254_COMPONENTS,
} from "./coverage-criteria";

const ACQ = "ACQ·VA01#NI@L254";
const ORG = "qa-cov03c-org", ASSESS = "qa-cov03c-assessment";
const QUOTES = [
  "El proyecto nace del problema de pedidos entregados tarde a clientes mayoristas.",
  "La dirección declara que este es el único problema que origina el objetivo.",
];
const PACK = "knowledge/packs/op-05/1.0.0/pack.json";
const raw = JSON.parse(readFileSync(PACK, "utf8"));
const ALL = (raw.acquisitions as { id: string }[]).map((a) => a.id);

function setup() {
  const engine = createKnowledgeEngine(raw);
  const repo = createInMemoryProductionRepository([{ id: ASSESS, organizationId: ORG, caseId: "qa-cov03c-case",
    knowledgeVersionId: KV, type: "BASELINE", startedAt: null, closedAt: null, updatedAt: "2026-10-19" }],
    [{ organizationId: ORG, userId: "qa-cov03c-owner", role: "OWNER" }]);
  const state = repo.estado as unknown as { documentMappings: DocumentMappingRecord[]; observations: ObservationRecord[] };
  return { engine, repo, state, deps: { engine, repository: repo, knowledgeVersionId: KV } };
}

type Comp = { componentKey: string; componentDescription: string };
function mapping(scope: "FULL" | "PARTIAL", over: { components?: readonly Comp[]; complete?: boolean; version?: string; status?: DocumentMappingRecord["status"]; targetRef?: string; org?: string } = {}): DocumentMappingRecord {
  const id = "c0700000-0000-4000-8000-000000000001", fragmentId = "c0700000-0000-4000-8000-000000000002";
  const target = over.targetRef ?? ACQ;
  const declaration = { mappingId: id, acquisitionRef: target, knowledgeVersionId: KV,
    coverageCriteriaVersion: over.version ?? "OP05-VA01-L254-COV-1.0.0", targetScope: scope,
    componentEvaluations: (over.components ?? OP05_VA01_L254_COMPONENTS).map((c, i) => ({ componentKey: c.componentKey, componentDescription: c.componentDescription,
      supportState: "SUPPORTED", fragmentId, supportingQuote: QUOTES[i], componentJustification: "Confirmado por la dirección.",
      uncertaintyNotes: "", humanConfirmedRelevance: true })),
    synthesisJustification: "La dirección revisó los dos componentes del piloto OP-05.", humanConfirmedCompleteness: over.complete ?? true,
    expectedRevision: 0, requestId: "c0700000-0000-4000-8000-000000000003" };
  return { id, organizationId: over.org ?? ORG, assessmentId: ASSESS, capabilityId: "OP-05", targetType: "ACQUISITION", targetRef: target,
    fragmentId, interpretationId: null, knowledgeVersionId: KV, knowledgePackId: "op-05", knowledgePackVersion: "1.0.0",
    proposedBy: "HUMAN", status: over.status ?? "VALIDATED", admissionBasis: "HUMAN_VALIDATION", admissionRuleRef: null,
    factualCorrespondenceRef: null, validatedBy: "qa-cov03c-owner", validatedAt: "2026-10-19", supersedesMappingId: null,
    createdAt: "2026-10-19", extractionId: "qa-cov03c-extraction", evidenceId: "qa-cov03c-evidence", fragmentText: QUOTES.join("\n"),
    interpretationStatement: null, coverageScope: scope, coverageAcquisitionRef: scope === "FULL" ? target : null,
    coverageDecidedBy: "qa-cov03c-owner", coverageRevision: 1, coverageEvidenceCurrent: true, coveragePilotAuthorized: true,
    coverageEvaluation: { declaration, result: { coverageScope: scope, revision: 1 }, decidedBy: "qa-cov03c-owner",
      evidenceId: "qa-cov03c-evidence", extractionId: "qa-cov03c-extraction" } } as DocumentMappingRecord;
}

async function ws(s: ReturnType<typeof setup>) {
  const r = await evaluarCapacidad(s.deps, ASSESS);
  if (!r) throw new Error("no assessment");
  return { r, w: createActionableProjector(raw).derive({ engine: s.engine, ...r }) };
}
const pending = (w: Awaited<ReturnType<typeof ws>>["w"]) => w.pendingInformationTasks.map((t) => t.acquisitionId);
const states = (r: Awaited<ReturnType<typeof ws>>["r"]) => r.evaluation.variableEvaluations.map((v) => [v.variableRef, v.state]);

describe("COV-03C · inventario OP-05 (pack publicado, sin inferir 1:1)", () => {
  it("64 NI, 64 adquisiciones INFORMATION_NEED, 10 VA, N:1 hacia variables", () => {
    expect(raw.informationNeeds).toHaveLength(64);
    expect(ALL).toHaveLength(64);
    expect(raw.variables).toHaveLength(10);
    expect(raw.acquisitions.every((a: { acquisitionMode: string; variableRefs: string[] }) => a.acquisitionMode === "INFORMATION_NEED" && a.variableRefs.length === 1)).toBe(true);
    const perVar = new Map<string, number>();
    for (const a of raw.acquisitions) perVar.set(a.variableRefs[0], (perVar.get(a.variableRefs[0]) ?? 0) + 1);
    expect(Math.min(...perVar.values())).toBeGreaterThan(1);
  });
  it("criterio piloto trazable literalmente a la NI y a la fuente (L254)", () => {
    const ni = raw.informationNeeds.find((n: { id: string }) => n.id === "VA01#NI@L254");
    expect(ni.statement).toBe("problema/oportunidad;");
    expect(ni.acquisitionRefs).toEqual([ACQ]);
    const src = readFileSync("knowledge/intake/OP-05/text/OP-05_Completo.txt", "utf8").split("\n");
    expect(src[253]).toBe("- problema/oportunidad;");
    const e = approvedCoverageCriteria(KV, "OP-05", ACQ);
    expect(e?.approvalStatus).toBe("PILOT_TEST_GOVERNED");
    expect(e?.mappingTargetType).toBe("ACQUISITION");
  });
  it("solo L254 es FULL_ELIGIBLE; hermanas de VA01 y las otras 63 siguen PARTIAL_ONLY", () => {
    expect(ALL.filter((a) => coverageModeFor(KV, "OP-05", a, true) === "FULL_ELIGIBLE")).toEqual([ACQ]);
    expect(coverageModeFor(KV, "OP-04", ACQ)).toBe("PARTIAL_ONLY");
  });
  it("el registro TS se replica literalmente en la última definición SQL", () => {
    const files = readdirSync("drizzle/migrations").filter((f) => f.endsWith(".sql")).sort();
    const sql = files.map((f) => readFileSync(`drizzle/migrations/${f}`, "utf8")).filter((t) => t.includes("function public.approved_coverage_components")).at(-1);
    if (!sql) throw new Error("Missing SQL criteria definition");
    for (const e of COVERAGE_CRITERIA_REGISTRY) {
      expect(sql).toContain(`_capability='${e.capabilityId}' and _acquisition='${e.acquisitionRef}' and _version='${e.coverageCriteriaVersion}'`);
      for (const c of e.components) expect(sql).toContain(`{"componentKey":"${c.componentKey}","componentDescription":"${c.componentDescription}"}`);
    }
  });
});

describe("COV-03C · piloto OP-05 / ACQ·VA01#NI@L254", () => {
  it("C1: inicialmente las 64 adquisiciones están pendientes", async () => {
    const { r, w } = await ws(setup());
    expect(r.answeredAcquisitionIds).toEqual([]);
    expect(w.nextQuestion).toBeNull(); // OP-05 no tiene preguntas literales: son tareas de información
    expect(pending(w)).toEqual(ALL);
    expect(w.counts.literalQuestions).toBe(0);
  });
  it("C2: PARTIAL, FULL incompleto, sin confirmación o con versión no registrada no descuentan", async () => {
    for (const m of [mapping("PARTIAL"), mapping("FULL", { components: OP05_VA01_L254_COMPONENTS.slice(0, 1) }),
      mapping("FULL", { complete: false }), mapping("FULL", { version: "OP05-VA01-L254-COV-9.9.9" })]) {
      const s = setup(); s.state.documentMappings.push(m);
      const { r, w } = await ws(s);
      expect(r.answeredAcquisitionIds).toEqual([]);
      expect(pending(w)).toEqual(ALL);
    }
  });
  it("C3–C6: FULL válido descuenta solo L254; 63 restantes intactas, sin observaciones ni variables KNOWN", async () => {
    const before = await ws(setup());
    const s = setup(); s.state.documentMappings.push(mapping("FULL"));
    const report = await admitirCorrespondenciasDocumentales(s.deps, { organizationId: ORG, assessmentId: ASSESS });
    expect(report.admitted).toBe(0);
    const { r, w } = await ws(s);
    expect(r.answeredAcquisitionIds).toEqual([ACQ]);
    expect(pending(w)).toEqual(ALL.filter((a) => a !== ACQ));
    expect(pending(w)).toHaveLength(63);
    expect(w.documentaryCoverage.map((c) => [c.acquisitionId, c.state])).toEqual([[ACQ, "COMPLETE"]]);
    expect(s.state.observations).toHaveLength(0);
    expect(states(r)).toEqual(states(before.r));
    expect(r.evaluation.variableEvaluations.some((v) => v.state === "KNOWN")).toBe(false);
  });
  it("C7: revocación (SUPERSEDED) restituye exclusivamente L254", async () => {
    const s = setup(); s.state.documentMappings.push(mapping("FULL", { status: "SUPERSEDED" }));
    const { r, w } = await ws(s);
    expect(r.answeredAcquisitionIds).toEqual([]);
    expect(pending(w)).toEqual(ALL);
  });
  it("C10a cardinalidad: los criterios de L254 no cubren una hermana (L255) aunque se declare FULL", async () => {
    const s = setup(); s.state.documentMappings.push(mapping("FULL", { targetRef: "ACQ·VA01#NI@L255" }));
    expect((await ws(s)).r.answeredAcquisitionIds).toEqual([]);
  });
  it("C10b citas: una cita inexistente en el fragmento se rechaza", () => {
    const d = mapping("FULL").coverageEvaluation as { declaration: Parameters<typeof validateStructuredCoverage>[0] };
    const bad = { ...d.declaration, componentEvaluations: d.declaration.componentEvaluations.map((c, i) => i === 0 ? { ...c, supportingQuote: "cita inventada" } : c) };
    expect(() => validateStructuredCoverage(bad, { capabilityId: "OP-05", knowledgeVersionId: KV, acquisitionRef: ACQ,
      fragmentId: "c0700000-0000-4000-8000-000000000002", fragmentText: QUOTES.join("\n"), evidenceCurrent: true, hasConflict: false, pilotAuthorized: true })).toThrow("INVALID_COMPONENT_QUOTE");
  });
  it("C10c versión de conocimiento distinta y archetype VARIABLE no verifican cobertura", () => {
    expect(hasVerifiedStructuredCoverage({ ...mapping("FULL"), knowledgeVersionId: "ee463f4d-2ed1-428d-8809-aa6ac0f43cb9" })).toBe(false);
    expect(hasVerifiedStructuredCoverage({ ...mapping("FULL"), targetType: "VARIABLE", targetRef: "VA01", factualCorrespondenceRef: ACQ })).toBe(false);
  });
  it("C10d multitenant: un mapping de otra organización no descuenta", async () => {
    const s = setup(); s.state.documentMappings.push(mapping("FULL", { org: "otra-org" }));
    expect((await ws(s)).r.answeredAcquisitionIds).toEqual([]);
  });
  it("C10e no propagación: un FULL verificado de otra capacidad en el mismo assessment no descuenta en OP-05", async () => {
    const s = setup();
    s.state.documentMappings.push({ ...mapping("FULL"), capabilityId: "CM-05" }, { ...mapping("FULL"), id: "c0700000-0000-4000-8000-000000000009", knowledgeVersionId: "ee463f4d-2ed1-428d-8809-aa6ac0f43cb9" });
    expect((await ws(s)).r.answeredAcquisitionIds).toEqual([]);
  });
  it("C11: el pack OP-05 no se altera", () => {
    const h = readFileSync(PACK, "utf8"); setup(); expect(readFileSync(PACK, "utf8")).toBe(h);
  });
});
