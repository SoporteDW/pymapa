/**
 * M1-HIJ · Acceptance tests de Findings, Recommendation Candidates,
 * Intervention, Activities y Deliverables.
 *
 * Verifica las invariantes de gobierno: ningún juicio gobernado confirma un
 * finding por sí solo, no existe severidad numérica ni algoritmo de prioridad,
 * los objetos permanecen distintos entre sí, una referencia cruzada nunca
 * ejecuta la capacidad destino y producir un entregable no valida nada.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { createInMemoryProductionRepository, type AssessmentRecord } from "./puertos";
import {
  cambiarEstadoActividad,
  crearActividad,
  crearIntervencion,
  decidirRecommendationCandidate,
  listActivities,
  listDeliverables,
  listDerivedDependencyReferences,
  listFindings,
  listInterventions,
  listRecommendationCandidates,
  RECOMMENDATION_NOT_SELECTED,
  registrarEntregable,
  registrarRecommendationCandidate,
  revisarFinding,
  SELECTION_REQUIRED,
  submitAcquisitionResponse,
  type ProductionDeps,
} from "./caso-uso";

const PACK_PATH = join(process.cwd(), "knowledge", "packs", "op-01", "1.0.0", "pack.json");
const packRaw = JSON.parse(readFileSync(PACK_PATH, "utf8")) as Record<string, unknown>;

const KV = "kv-op01-1.0.0";

function assessment(): AssessmentRecord {
  return {
    id: "assess-1",
    organizationId: "org-1",
    caseId: "case-1",
    knowledgeVersionId: KV,
    type: "BASELINE",
    startedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("M1-HIJ · Findings gobernados", () => {
  let repository: ReturnType<typeof createInMemoryProductionRepository>;
  let deps: ProductionDeps;

  const base = {
    assessmentId: "assess-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    acquisitionId: "OP01-P01",
  } as const;

  beforeEach(async () => {
    repository = createInMemoryProductionRepository([assessment()]);
    deps = {
      engine: createKnowledgeEngine(packRaw),
      repository,
      knowledgeVersionId: KV,
      hashToken: (t) => `sha256:${t}`,
    };
    await submitAcquisitionResponse(deps, {
      ...base,
      knowledgeState: "KNOWN",
      semanticValue: "Implícita",
    });
  });

  it("Journey A: un juicio gobernado no confirma un finding automáticamente", async () => {
    const findings = await listFindings(deps, "assess-1");
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.lifecycleState).toBe("NEEDS_REVIEW");
      expect(f.reviewedAt).toBeNull();
      expect(f.detail?.["deterministicallyConfirmable"]).toBe(false);
    }
  });

  it("todo finding conserva su lineage completo", async () => {
    const finding = (await listFindings(deps, "assess-1"))[0]!;
    expect(finding.assessmentId).toBe("assess-1");
    expect(finding.caseId).toBe("case-1");
    expect(finding.capabilityId).toBe("OP-01");
    expect(finding.knowledgeVersionId).toBe(KV);
    expect(finding.knowledgePackId).toBeTruthy();
    expect(finding.knowledgePackVersion).toBeTruthy();
    expect(finding.engineVersion).toBe(deps.engine.engineVersion);
    expect(finding.evaluationRunId).toBeTruthy();
    expect(finding.ruleRefs.length).toBeGreaterThan(0);
    expect(finding.variableRefs.length).toBeGreaterThan(0);

    const enlaces = await repository.listFindingObservationLinks(finding.id);
    expect(enlaces.length).toBeGreaterThan(0);
  });

  it("una reevaluación sustituye el finding sin perder el histórico", async () => {
    const antes = await listFindings(deps, "assess-1");
    await submitAcquisitionResponse(deps, {
      ...base,
      acquisitionId: "OP01-P05",
      knowledgeState: "KNOWN",
      semanticValue: "Cada persona lo interpreta a su manera",
    });
    const despues = await listFindings(deps, "assess-1");
    expect(despues.length).toBeGreaterThan(antes.length);

    const sustituido = despues.find((f) => f.id === antes[0]!.id)!;
    expect(sustituido.lifecycleState).toBe("SUPERSEDED");
    expect(sustituido.supersededByFindingId).toBeTruthy();
    // El histórico permanece: la fila anterior sigue existiendo con su run.
    expect(sustituido.evaluationRunId).toBe(antes[0]!.evaluationRunId);
  });

  it("H08 (fortaleza) no se confirma con un umbral inventado", async () => {
    const findings = await listFindings(deps, "assess-1");
    const h08 = findings.find((f) => f.findingRef === "H08");
    if (h08) {
      expect(h08.polarity).toBe("STRENGTH");
      expect(h08.lifecycleState).toBe("NEEDS_REVIEW");
      expect(String(h08.detail?.["reason"])).toContain("KCC-AT04-03");
    }
    // Ningún finding de fortaleza puede nacer confirmado.
    expect(findings.filter((f) => f.polarity === "STRENGTH" && f.lifecycleState === "CONFIRMED")).toHaveLength(
      0,
    );
  });

  it("no existe severidad numérica ni algoritmo de prioridad", async () => {
    const findings = await listFindings(deps, "assess-1");
    for (const f of findings) {
      expect(f.severityQualitative).toBeNull();
      expect(f.severityReason).toContain("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
      expect(Object.keys(f)).not.toContain("priority");
      expect(Object.keys(f)).not.toContain("severityScore");
    }
    const serializado = JSON.stringify(findings);
    expect(serializado).not.toMatch(/"priority"/);
    expect(serializado).not.toMatch(/"score"/);
  });

  it("la confirmación es una decisión humana registrada", async () => {
    const finding = (await listFindings(deps, "assess-1"))[0]!;
    const salida = await revisarFinding(deps, {
      findingId: finding.id,
      decision: "CONFIRMED",
      reviewedBy: "user-1",
    });
    expect(salida.accepted).toBe(true);
    expect(salida.finding?.lifecycleState).toBe("CONFIRMED");
    expect(salida.finding?.reviewedBy).toBe("user-1");

    const eventos = await repository.listAuditEvents("org-1");
    expect(eventos.some((e) => e.eventType === "FINDING_CONFIRMED")).toBe(true);
    expect(eventos.some((e) => e.eventType === "FINDING_CREATED")).toBe(true);
  });

  it("Journey D: la referencia cruzada no ejecuta la capacidad destino", async () => {
    const refs = await listDerivedDependencyReferences(deps, "assess-1");
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) {
      expect(r.executable).toBe(false);
      expect(r.sourceCapabilityId).toBe("OP-01");
    }
    // Ningún assessment nuevo, ninguna evaluación de otra capacidad.
    const estado = repository.estado as unknown as { runs: { assessmentId: string }[] };
    expect(estado.runs.every((r) => r.assessmentId === "assess-1")).toBe(true);
    expect(refs.some((r) => r.targetCapabilityId === "PC-02")).toBe(true);
  });

  it("PC-02 sigue sin Knowledge Pack ejecutable", async () => {
    const refs = await listDerivedDependencyReferences(deps, "assess-1");
    const pc02 = refs.find((r) => r.targetCapabilityId === "PC-02");
    expect(pc02?.executable).toBe(false);
    expect(deps.engine.pack.capability.id).toBe("OP-01");
  });
});

describe("M1-HIJ · Recommendation Candidate ≠ Finding ≠ Intervention", () => {
  let repository: ReturnType<typeof createInMemoryProductionRepository>;
  let deps: ProductionDeps;

  beforeEach(async () => {
    repository = createInMemoryProductionRepository([assessment()]);
    deps = {
      engine: createKnowledgeEngine(packRaw),
      repository,
      knowledgeVersionId: KV,
      hashToken: (t) => `sha256:${t}`,
    };
    await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Implícita",
    });
  });

  it("no se generan recomendaciones automáticamente al evaluar", async () => {
    expect(await listRecommendationCandidates(deps, "assess-1")).toHaveLength(0);
    expect(await listInterventions(deps, "assess-1")).toHaveLength(0);
  });

  it("un RecommendationCandidate es un objeto distinto del Finding", async () => {
    const finding = (await listFindings(deps, "assess-1"))[0]!;
    await revisarFinding(deps, { findingId: finding.id, decision: "CONFIRMED", reviewedBy: "user-1" });
    const salida = await registrarRecommendationCandidate(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      recommendationRef: "R01",
      findingId: finding.id,
      createdBy: "user-1",
    });
    expect(salida.accepted).toBe(true);
    expect(salida.candidate!.id).not.toBe(finding.id);
    expect(salida.candidate!.findingId).toBe(finding.id);
    expect(salida.candidate!.status).toBe("CANDIDATE");
    expect(salida.candidate!.mappingStatus).toBe("NOT_GOVERNED");
    expect(salida.candidate!.contentStatus).toContain("NOT_EXPLICIT");
  });

  it("un candidato no puede colgarse de un finding sin revisar", async () => {
    const finding = (await listFindings(deps, "assess-1"))[0]!;
    const salida = await registrarRecommendationCandidate(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      recommendationRef: "R01",
      findingId: finding.id,
      createdBy: "user-1",
    });
    expect(salida.accepted).toBe(false);
    expect(salida.rejectionReason).toBe("FINDING_NOT_REVIEWED");
  });

  it("Journey B: la Intervention exige selección y es un objeto distinto", async () => {
    const finding = (await listFindings(deps, "assess-1"))[0]!;
    await revisarFinding(deps, { findingId: finding.id, decision: "CONFIRMED", reviewedBy: "user-1" });
    const candidato = (
      await registrarRecommendationCandidate(deps, {
        assessmentId: "assess-1",
        organizationId: "org-1",
        recommendationRef: "R01",
        findingId: finding.id,
        createdBy: "user-1",
      })
    ).candidate!;

    // Sin selección humana no hay intervención: el mapeo no está gobernado.
    const sinSeleccion = await crearIntervencion(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      title: "Plan",
      recommendationCandidateId: candidato.id,
      createdBy: "user-1",
    });
    expect(sinSeleccion.accepted).toBe(false);
    expect(sinSeleccion.rejectionReason).toBe(RECOMMENDATION_NOT_SELECTED);

    await decidirRecommendationCandidate(deps, {
      recommendationCandidateId: candidato.id,
      decision: "SELECTED",
      decidedBy: "user-1",
    });

    const conSeleccion = await crearIntervencion(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      title: "Aclarar responsabilidades",
      recommendationCandidateId: candidato.id,
      createdBy: "user-1",
    });
    expect(conSeleccion.accepted).toBe(true);
    const intervencion = conSeleccion.intervention!;
    expect(intervencion.id).not.toBe(candidato.id);
    expect(intervencion.id).not.toBe(finding.id);
    expect(intervencion.recommendationCandidateId).toBe(candidato.id);
    expect(intervencion.status).toBe("PROPOSED");

    const eventos = await repository.listAuditEvents("org-1");
    expect(eventos.some((e) => e.eventType === "RECOMMENDATION_SELECTED")).toBe(true);
    expect(eventos.some((e) => e.eventType === "INTERVENTION_CREATED")).toBe(true);
  });

  it("sin recomendación, la intervención exige una selección registrada", async () => {
    const sinNota = await crearIntervencion(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      title: "Plan improvisado",
      createdBy: "user-1",
    });
    expect(sinNota.accepted).toBe(false);
    expect(sinNota.rejectionReason).toBe(SELECTION_REQUIRED);

    const conNota = await crearIntervencion(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      title: "Plan elegido",
      selectionNote: "Elegido por el responsable del proceso",
      createdBy: "user-1",
    });
    expect(conNota.accepted).toBe(true);
  });

  it("Minimum Sufficient Intervention es principio, nunca fórmula", () => {
    const principio = deps.engine.getInterventionPrinciple()!;
    expect(principio.id).toBe("MINIMUM_SUFFICIENT_INTERVENTION");
    expect(principio.formula).toContain("NOT_EXPLICIT");
    expect(principio.automatable).toBe(false);
  });
});

describe("M1-HIJ · Activity / Deliverable", () => {
  let repository: ReturnType<typeof createInMemoryProductionRepository>;
  let deps: ProductionDeps;
  let interventionId: string;

  beforeEach(async () => {
    repository = createInMemoryProductionRepository([assessment()]);
    deps = {
      engine: createKnowledgeEngine(packRaw),
      repository,
      knowledgeVersionId: KV,
      hashToken: (t) => `sha256:${t}`,
    };
    const intervencion = await crearIntervencion(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      title: "Plan elegido",
      selectionNote: "Decisión registrada",
      createdBy: "user-1",
    });
    interventionId = intervencion.intervention!.id;
  });

  it("una Activity pertenece siempre a una Intervention", async () => {
    const salida = await crearActividad(deps, {
      interventionId,
      organizationId: "org-1",
      title: "Escribir la guía del proceso",
      createdBy: "user-1",
    });
    expect(salida.accepted).toBe(true);
    expect(salida.activity!.interventionId).toBe(interventionId);

    const huerfana = await crearActividad(deps, {
      interventionId: "itv-inexistente",
      organizationId: "org-1",
      title: "Actividad suelta",
      createdBy: "user-1",
    });
    expect(huerfana.accepted).toBe(false);
    expect(huerfana.rejectionReason).toBe("INTERVENTION_NOT_FOUND");
  });

  it("los mappings Finding→Activity son candidatos: A01–A09 sin contenido aprobado", async () => {
    const identidades = deps.engine.listActivityIdentities();
    expect(identidades.map((a) => a.activityRef)).toEqual([
      "A01",
      "A02",
      "A03",
      "A04",
      "A05",
      "A06",
      "A07",
      "A08",
      "A09",
    ]);
    for (const a of identidades) {
      expect(a.title).toBeNull();
      expect(a.mappingStatus).toBe("NOT_GOVERNED");
    }
  });

  it("Journey C: Deliverable ≠ Activity y producirlo no valida nada", async () => {
    const actividad = (
      await crearActividad(deps, {
        interventionId,
        organizationId: "org-1",
        title: "Mapa del proceso",
        createdBy: "user-1",
      })
    ).activity!;

    const salida = await registrarEntregable(deps, {
      activityId: actividad.id,
      organizationId: "org-1",
      title: "Mapa en una página",
      registeredBy: "user-1",
    });
    expect(salida.accepted).toBe(true);
    expect(salida.deliverable!.id).not.toBe(actividad.id);
    expect(salida.deliverable!.activityId).toBe(actividad.id);

    // El estado máximo alcanzable es DELIVERABLE_PRODUCED: nunca validación.
    expect(salida.activity!.state).toBe("DELIVERABLE_PRODUCED");
    const estados = (await listActivities(deps, interventionId)).map((a) => a.state);
    expect(estados).not.toContain("VALIDATED");
    expect(JSON.stringify(estados)).not.toMatch(/VALIDATED|FOLLOW_UP|CONSOLIDATED/);

    const entregables = await listDeliverables(deps, actividad.id);
    expect(entregables).toHaveLength(1);

    const eventos = await repository.listAuditEvents("org-1");
    const evento = eventos.find((e) => e.eventType === "DELIVERABLE_REGISTERED")!;
    expect(evento.detail?.["validated"]).toBe(false);
  });

  it("el estado de ejecución se limita a PENDING / EXECUTING / DELIVERABLE_PRODUCED", async () => {
    const actividad = (
      await crearActividad(deps, {
        interventionId,
        organizationId: "org-1",
        title: "Tarea",
        createdBy: "user-1",
      })
    ).activity!;
    expect(actividad.state).toBe("PENDING");
    const enCurso = await cambiarEstadoActividad(deps, {
      activityId: actividad.id,
      state: "EXECUTING",
      actorUserId: "user-1",
    });
    expect(enCurso.activity!.state).toBe("EXECUTING");

    const eventos = await repository.listAuditEvents("org-1");
    expect(eventos.filter((e) => e.eventType === "ACTIVITY_STATE_CHANGED").length).toBeGreaterThan(0);
  });
});
