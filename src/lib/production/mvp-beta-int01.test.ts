/**
 * MVP-BETA-INT-01 · Reglas del paquete integral (fixtures 100% sintéticos).
 * Engine 0.2.0 y packs publicados reales; sin IA ni red.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { createInMemoryProductionRepository, type DocumentMappingRecord, type ObservationRecord } from "./puertos";
import { admitirCorrespondenciasDocumentales } from "./document-admission-bridge";
import { crearActividad, crearIntervencion, listFindings, reevaluarTrasCambioDocumental, revisarFinding, SELECTION_REQUIRED } from "./caso-uso";
import { citaEsLiteral, IngestaSinteticaError, proponerCorrespondenciasSinteticas, REGLAS_SINTETICAS } from "./ingesta-sintetica";
import { esRecomendacionGobernada } from "./recomendaciones";

const pack = (id: string) => JSON.parse(readFileSync(join(process.cwd(), "knowledge", "packs", id, "1.0.0", "pack.json"), "utf8"));
const KV = "kv-runtime-manifest-1.0.0";
const ORG = "org-qa-a";
const ASSESS = "assess-qa-int01";

const LINEAS = [
  { pagina: 1, texto: "Sensores Andina S.A.S. · documento SYNTHETIC_QA_ONLY" },
  { pagina: 1, texto: "01 · Horizonte, ambición y cambios esperados" },
  { pagina: 1, texto: "El plan cubre 2026 a 2028." },
  { pagina: 1, texto: "Queremos liderar la calibración industrial en la región andina." },
  { pagina: 2, texto: "02 · Dependencia de conocimiento individual" },
  { pagina: 2, texto: "La calibración final depende solo de Marta Ruiz; si ella falta, el proceso se detiene." },
  { pagina: 2, texto: "03 · Otro tema" },
  { pagina: 2, texto: "Texto ajeno." },
];

describe("MVP-BETA-INT-01 · ingesta SYNTHETIC_QA_ONLY", () => {
  it("sin la marca SYNTHETIC_QA_ONLY no propone nada", () => {
    expect(() => proponerCorrespondenciasSinteticas(LINEAS.slice(1), "OP-01")).toThrow(IngestaSinteticaError);
  });

  it("propone solo la sección de su capacidad, con cita literal de una sola página", () => {
    const op = proponerCorrespondenciasSinteticas(LINEAS, "OP-01");
    expect(op).toHaveLength(1);
    expect(op[0]!.rule.targetRef).toBe("VA07");
    expect(op[0]!.page).toBe(2);
    expect(op[0]!.verbatim).toBe("La calibración final depende solo de Marta Ruiz; si ella falta, el proceso se detiene.");
    const dg = proponerCorrespondenciasSinteticas(LINEAS, "DG-01");
    expect(dg.map((p) => p.rule.targetRef)).toEqual(["VA04"]);
    expect(dg[0]!.verbatim).toBe("El plan cubre 2026 a 2028. Queremos liderar la calibración industrial en la región andina.");
    expect(proponerCorrespondenciasSinteticas(LINEAS, "CM-05")).toEqual([]);
    const pagina1 = LINEAS.filter((l) => l.pagina === 1).map((l) => l.texto).join(" ");
    expect(citaEsLiteral(pagina1, dg[0]!.verbatim)).toBe(true);
    expect(citaEsLiteral(pagina1, "texto inventado")).toBe(false);
  });

  it("cada regla apunta a una adquisición publicada que alimenta la variable", () => {
    for (const r of REGLAS_SINTETICAS) {
      const engine = createKnowledgeEngine(pack(r.capabilityId.toLowerCase()));
      expect(engine.getAcquisition(r.factualCorrespondenceRef)?.variableRefs).toContain(r.targetRef);
    }
  });
});

function setupOp01() {
  const engine = createKnowledgeEngine(pack("op-01"));
  const repo = createInMemoryProductionRepository([
    { id: ASSESS, organizationId: ORG, caseId: "case-qa", knowledgeVersionId: KV, type: "BASELINE",
      startedAt: "2026-01-01T00:00:00.000Z", closedAt: null, updatedAt: "2026-01-01T00:00:00.000Z" },
  ]);
  const mapping: DocumentMappingRecord = {
    id: "map-op01-va07", organizationId: ORG, assessmentId: ASSESS, fragmentId: "frag-1", interpretationId: "int-1",
    capabilityId: "OP-01", targetType: "VARIABLE", targetRef: "VA07", knowledgeVersionId: KV,
    knowledgePackId: engine.pack.packId, knowledgePackVersion: engine.pack.packVersion, proposedBy: "DETERMINISTIC_RULE",
    status: "VALIDATED", admissionBasis: "HUMAN_VALIDATION", admissionRuleRef: null, factualCorrespondenceRef: "OP01-P11",
    validatedBy: "owner-qa", validatedAt: "2026-01-02T00:00:00.000Z", supersedesMappingId: null,
    createdAt: "2026-01-01T00:00:00.000Z", extractionId: "ext-1", evidenceId: "ev-1",
    fragmentText: LINEAS[5]!.texto, interpretationStatement: LINEAS[5]!.texto,
  } as DocumentMappingRecord;
  (repo.estado as unknown as { documentMappings: DocumentMappingRecord[] }).documentMappings.push(mapping);
  return { engine, repo, deps: { engine, repository: repo, knowledgeVersionId: KV, hashToken: (t: string) => t }, mapping };
}

describe("MVP-BETA-INT-01 · hallazgo real del Engine y revocación", () => {
  it("VA07 admitido desde documento produce H04 y H06 en revisión humana, nunca confirmados", async () => {
    const { deps } = setupOp01();
    const report = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG });
    expect(report.admitted).toBe(1);
    await reevaluarTrasCambioDocumental(deps, { assessmentId: ASSESS, organizationId: ORG, trigger: "EVIDENCE_ADDED" });
    const findings = await listFindings(deps, ASSESS);
    expect(findings.map((f) => f.findingRef).sort()).toEqual(["H04", "H06"]);
    expect(findings.every((f) => f.lifecycleState === "NEEDS_REVIEW")).toBe(true);
  });

  it("revocar el documento retira el hallazgo (SUPERSEDED, auditado) sin borrar historial", async () => {
    const { deps, repo, mapping } = setupOp01();
    await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG });
    await reevaluarTrasCambioDocumental(deps, { assessmentId: ASSESS, organizationId: ORG, trigger: "EVIDENCE_ADDED" });
    const h04 = (await listFindings(deps, ASSESS)).find((f) => f.findingRef === "H04")!;
    await revisarFinding(deps, { findingId: h04.id, decision: "CONFIRMED", reviewedBy: "owner-qa" });
    mapping.status = "SUPERSEDED";
    const r = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG });
    expect(r.invalidated).toBe(1);
    await reevaluarTrasCambioDocumental(deps, { assessmentId: ASSESS, organizationId: ORG, trigger: "OBSERVATION_UPDATED" });
    const despues = await listFindings(deps, ASSESS);
    expect(despues).toHaveLength(2);
    expect(despues.every((f) => f.lifecycleState === "SUPERSEDED")).toBe(true);
    const estado = repo.estado as unknown as { observations: ObservationRecord[]; auditEvents: { eventType: string }[] };
    expect(estado.observations).toHaveLength(2);
    expect(estado.auditEvents.filter((e) => e.eventType === "FINDING_SUPPORT_WITHDRAWN")).toHaveLength(2);
  });

  it("la acción humana exige motivo y guarda responsable y plazo", async () => {
    const { deps } = setupOp01();
    await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG });
    await reevaluarTrasCambioDocumental(deps, { assessmentId: ASSESS, organizationId: ORG, trigger: "EVIDENCE_ADDED" });
    const h04 = (await listFindings(deps, ASSESS)).find((f) => f.findingRef === "H04")!;
    const sinMotivo = await crearIntervencion(deps, { assessmentId: ASSESS, organizationId: ORG, title: "Transferir", findingId: h04.id, createdBy: "owner-qa" });
    expect(sinMotivo.rejectionReason).toBe(SELECTION_REQUIRED);
    const itv = await crearIntervencion(deps, { assessmentId: ASSESS, organizationId: ORG, title: "Transferir", findingId: h04.id, selectionNote: "Decisión del equipo", createdBy: "owner-qa" });
    expect(itv.intervention?.findingId).toBe(h04.id);
    expect(itv.intervention?.recommendationCandidateId).toBeNull();
    const act = await crearActividad(deps, { interventionId: itv.intervention!.id, organizationId: ORG, title: "Documentar calibración", responsibleLabel: "Jefe de planta", dueDate: "2026-12-15", createdBy: "owner-qa" });
    expect(act.activity?.responsibleLabel).toBe("Jefe de planta");
    expect(act.activity?.dueDate).toBe("2026-12-15");
  });

  it("las recomendaciones OP-01 publicadas no son gobernadas", () => {
    const engine = createKnowledgeEngine(pack("op-01"));
    const recs = engine.getRecommendationCandidates();
    expect(recs.length).toBe(9);
    expect(recs.filter(esRecomendacionGobernada)).toEqual([]);
  });
});
