/**
 * INT-01-R1 · Corrección de integración operativa.
 *
 * Verifica el recorrido completo con fixtures 100% sintéticos (sin IA, sin
 * datos reales, packs publicados reales DG-01 y CM-05):
 * - R1-01/R1-02: mapping factual VALIDATED gobernado → puente → observación
 *   física → el Knowledge Engine evalúa la variable como KNOWN.
 * - R1-03: mapping temático VALIDATED (INFORMATION_NEED) nunca genera
 *   observaciones.
 * - R1-04: mapping de otra organización nunca se admite.
 * - R1-05: rol MEMBER no puede ejecutar operaciones de gobierno documental.
 * - R1-06: reprocesar no duplica (idempotencia).
 * - R1-07: revocación (SUPERSEDED) excluye la observación en la reevaluación.
 * - R1-08: la revocación no altera observaciones manuales independientes.
 * - R1-09: los registros de control jamás ingresan como hechos diagnósticos.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import {
  createInMemoryProductionRepository,
  type DocumentMappingRecord,
  type ObservationRecord,
} from "./puertos";
import { admitirCorrespondenciasDocumentales } from "./document-admission-bridge";
import { evaluarCapacidad, observacionesVigentes } from "./caso-uso";
import { assertDocumentGovernanceRole } from "./capability-handlers";

const packDg01 = JSON.parse(
  readFileSync(join(process.cwd(), "knowledge", "packs", "dg-01", "1.0.0", "pack.json"), "utf8"),
) as Parameters<typeof createKnowledgeEngine>[0];

const KV = "kv-runtime-manifest-1.0.0";
const ORG_A = "org-qa-a";
const ORG_B = "org-qa-b";
const ASSESS = "assess-qa-r1";

function mapping(parcial: Partial<DocumentMappingRecord>): DocumentMappingRecord {
  return {
    id: "map-r1-1",
    organizationId: ORG_A,
    assessmentId: ASSESS,
    fragmentId: "frag-r1-1",
    interpretationId: "interp-r1-1",
    capabilityId: "DG-01",
    targetType: "VARIABLE",
    targetRef: "VA01",
    knowledgeVersionId: KV,
    knowledgePackId: "dg-01",
    knowledgePackVersion: "1.0.0",
    proposedBy: "AI",
    status: "VALIDATED",
    admissionBasis: "HUMAN_VALIDATION",
    admissionRuleRef: null,
    factualCorrespondenceRef: "ACQ·NI01",
    validatedBy: "user-admin-qa",
    validatedAt: "2026-01-02T00:00:00.000Z",
    supersedesMappingId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    extractionId: "ext-r1-1",
    evidenceId: "ev-r1-1",
    fragmentText: "cita literal sintética R1",
    interpretationStatement: "Hecho interpretado sintético R1 sobre DG-01",
    ...parcial,
  };
}

type EstadoMemoria = {
  documentMappings: DocumentMappingRecord[];
  observations: ObservationRecord[];
  evidenceLinks: { observationId: string; evidenceId: string }[];
  auditEvents: { eventType: string }[];
};
const estado = (repo: ReturnType<typeof createInMemoryProductionRepository>) =>
  repo.estado as unknown as EstadoMemoria;

function setup() {
  const engine = createKnowledgeEngine(packDg01);
  const repo = createInMemoryProductionRepository([
    {
      id: ASSESS,
      organizationId: ORG_A,
      caseId: "case-qa-r1",
      knowledgeVersionId: KV,
      type: "BASELINE",
      startedAt: "2026-01-01T00:00:00.000Z",
      closedAt: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ]);
  const deps = { engine, repository: repo, knowledgeVersionId: KV };
  const params = { assessmentId: ASSESS, organizationId: ORG_A, actorUserId: "user-admin-qa" };
  return { engine, repo, deps, params };
}

describe("INT-01-R1 · Integración operativa DocumentAdmissionBridge", () => {
  it("R1-01/R1-02 · mapping factual VALIDATED genera observación física y el Engine la evalúa KNOWN", async () => {
    const { repo, deps, params } = setup();
    estado(repo).documentMappings.push(mapping({}));
    const report = await admitirCorrespondenciasDocumentales(deps, params);
    expect(report.admitted).toBe(1);
    const obs = estado(repo).observations;
    expect(obs).toHaveLength(1);
    expect(obs[0]!.value.documentProvenance?.mappingId).toBe("map-r1-1");
    const evaluation = (await evaluarCapacidad(deps, ASSESS))!.evaluation;
    expect(evaluation.variableEvaluations.find((v) => v.variableRef === "VA01")?.state).toBe("KNOWN");
  });

  it("R1-03 · mapping temático VALIDATED (INFORMATION_NEED) no genera observaciones", async () => {
    const { repo, deps, params } = setup();
    estado(repo).documentMappings.push(
      mapping({ id: "map-r1-ni", targetType: "INFORMATION_NEED", targetRef: "NI01", factualCorrespondenceRef: null }),
    );
    const report = await admitirCorrespondenciasDocumentales(deps, params);
    expect(report.admitted).toBe(0);
    expect(report.rejected[0]!.reason).toBe("THEMATIC_MAPPING_NOT_FACTUAL");
    expect(estado(repo).observations).toHaveLength(0);
  });

  it("R1-04 · mapping de otra organización nunca se admite", async () => {
    const { repo, deps, params } = setup();
    estado(repo).documentMappings.push(mapping({ id: "map-r1-b", organizationId: ORG_B }));
    const report = await admitirCorrespondenciasDocumentales(deps, params);
    expect(report.admitted).toBe(0);
    expect(report.rejected[0]!.reason).toBe("ORGANIZATION_MISMATCH");
    expect(estado(repo).observations).toHaveLength(0);
  });

  it("R1-05 · MEMBER no puede ejecutar operaciones de gobierno documental", () => {
    expect(() => assertDocumentGovernanceRole("MEMBER")).toThrowError("DOCUMENT_GOVERNANCE_FORBIDDEN");
    expect(() => assertDocumentGovernanceRole(null)).toThrowError("DOCUMENT_GOVERNANCE_FORBIDDEN");
    expect(() => assertDocumentGovernanceRole("OWNER")).not.toThrow();
    expect(() => assertDocumentGovernanceRole("ADMIN")).not.toThrow();
  });

  it("R1-06 · reprocesar una admisión no duplica observaciones", async () => {
    const { repo, deps, params } = setup();
    estado(repo).documentMappings.push(mapping({}));
    await admitirCorrespondenciasDocumentales(deps, params);
    const segundo = await admitirCorrespondenciasDocumentales(deps, params);
    expect(segundo.admitted).toBe(0);
    expect(segundo.items[0]!.outcome).toBe("ALREADY_ADMITTED");
    expect(estado(repo).observations).toHaveLength(1);
  });

  it("R1-07 · revocar (SUPERSEDED) excluye la observación documental en la reevaluación", async () => {
    const { repo, deps, params } = setup();
    const m = mapping({});
    estado(repo).documentMappings.push(m);
    await admitirCorrespondenciasDocumentales(deps, params);
    expect(
      (await evaluarCapacidad(deps, ASSESS))!.evaluation.variableEvaluations.find((v) => v.variableRef === "VA01")
        ?.state,
    ).toBe("KNOWN");
    // Revocación gobernada: el mapping pasa a SUPERSEDED (RPC revoke_fragment_mapping).
    estado(repo).documentMappings[0] = { ...m, status: "SUPERSEDED" };
    const report = await admitirCorrespondenciasDocumentales(deps, params);
    expect(report.invalidated).toBe(1);
    const reevaluacion = (await evaluarCapacidad(deps, ASSESS))!.evaluation;
    expect(reevaluacion.variableEvaluations.find((v) => v.variableRef === "VA01")?.state).not.toBe("KNOWN");
    // Historial intacto: la observación admitida sigue existiendo (append-only).
    expect(estado(repo).observations.some((o) => o.value.documentProvenance?.mappingId === "map-r1-1")).toBe(true);
    expect(estado(repo).auditEvents.some((e) => e.eventType === "DOCUMENT_OBSERVATION_INVALIDATED")).toBe(true);
  });

  it("R1-08 · la revocación no altera observaciones manuales independientes", async () => {
    const { repo, deps, params } = setup();
    const m = mapping({});
    estado(repo).documentMappings.push(m);
    await admitirCorrespondenciasDocumentales(deps, params);
    // Respuesta manual independiente sobre otra variable (VA02).
    await repo.insertObservation({
      organizationId: ORG_A,
      assessmentId: ASSESS,
      sourceResponseId: "resp-manual-1",
      respondentId: "respondent-1",
      variableRef: "VA02",
      value: { knowledgeState: "KNOWN", semanticValue: "Respuesta manual", acquisitionRef: "ACQ·NI02" },
    });
    estado(repo).documentMappings[0] = { ...m, status: "SUPERSEDED" };
    await admitirCorrespondenciasDocumentales(deps, params);
    const vigentes = observacionesVigentes(estado(repo).observations);
    const manual = vigentes.find((o) => o.sourceResponseId === "resp-manual-1");
    expect(manual).toBeDefined();
    expect(manual!.value.knowledgeState).toBe("KNOWN");
    const evaluation = (await evaluarCapacidad(deps, ASSESS))!.evaluation;
    expect(evaluation.variableEvaluations.find((v) => v.variableRef === "VA02")?.state).toBe("KNOWN");
  });

  it("R1-09 · los registros de control no ingresan como hechos diagnósticos", async () => {
    const { repo, deps, params } = setup();
    const m = mapping({});
    estado(repo).documentMappings.push(m);
    await admitirCorrespondenciasDocumentales(deps, params);
    estado(repo).documentMappings[0] = { ...m, status: "SUPERSEDED" };
    await admitirCorrespondenciasDocumentales(deps, params);
    const control = estado(repo).observations.find((o) => o.value.documentControl);
    expect(control).toBeDefined();
    // El registro de control jamás aparece entre las vigentes que ve el Engine.
    expect(observacionesVigentes(estado(repo).observations).some((o) => o.id === control!.id)).toBe(false);
    // Idempotencia de la invalidación: reprocesar no crea otro control.
    const tercero = await admitirCorrespondenciasDocumentales(deps, params);
    expect(tercero.invalidated).toBe(0);
    expect(estado(repo).observations.filter((o) => o.value.documentControl)).toHaveLength(1);
  });
});
