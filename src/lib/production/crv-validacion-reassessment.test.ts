/**
 * M1-KL · Acceptance tests de CRV, Validation, Follow-up y Reassessment.
 *
 * Invariantes verificadas:
 * Activity ≠ Deliverable ≠ Done ≠ CRV ≠ Validation; el CRV de A04 exige sus
 * tres condiciones conjuntas; una actividad sin CRV explícito nunca se valida
 * automáticamente; aportar evidencia ≠ validar; el Baseline permanece inmutable
 * y pinneado a su KnowledgeVersion; UNKNOWN→KNOWN y CONTRADICTORY→KNOWN no se
 * etiquetan como mejora; LearningCandidate nunca modifica el Knowledge Master.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import {
  createInMemoryProductionRepository,
  type AssessmentRecord,
  type MembershipRecord,
} from "./puertos";
import {
  ACTIVITY_NOT_DONE,
  abrirValidacion,
  cambiarEstadoActividad,
  compararAssessments,
  crearActividad,
  crearIntervencion,
  decidirFollowUp,
  decidirValidacion,
  DELIVERABLE_REQUIRED_BEFORE_DONE,
  evaluarRequisitoValidacion,
  iniciarFollowUp,
  iniciarReassessment,
  listFindings,
  marcarActividadDone,
  registrarCandidatoAprendizaje,
  registrarCasoValidacion,
  registrarEntregable,
  registrarRequisitoValidacion,
  submitAcquisitionResponse,
  VALIDATION_NOT_GOVERNED,
  VALIDATION_PERMISSION_REQUIRED,
  VALIDATION_REQUIREMENT_NOT_EXPLICIT,
  type ProductionDeps,
} from "./caso-uso";

const PACK_PATH = join(process.cwd(), "knowledge", "packs", "op-01", "1.0.0", "pack.json");
const packRaw = JSON.parse(readFileSync(PACK_PATH, "utf8")) as Record<string, unknown>;

const KV_A = "kv-op01-1.0.0";
const KV_B = "kv-op01-1.1.0";

function assessment(): AssessmentRecord {
  return {
    id: "assess-1",
    organizationId: "org-1",
    caseId: "case-1",
    knowledgeVersionId: KV_A,
    type: "BASELINE",
    startedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const MEMBRESIAS: MembershipRecord[] = [
  { organizationId: "org-1", userId: "user-1", role: "OWNER" },
];

let repository: ReturnType<typeof createInMemoryProductionRepository>;
let deps: ProductionDeps;

async function prepararActividad(activityRef: string | null) {
  await submitAcquisitionResponse(deps, {
    assessmentId: "assess-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    acquisitionId: "OP01-P01",
    knowledgeState: "KNOWN",
    semanticValue: "Implícita",
  });
  const finding = (await listFindings(deps, "assess-1"))[0]!;
  const intervencion = await crearIntervencion(deps, {
    assessmentId: "assess-1",
    organizationId: "org-1",
    title: "Formalizar la forma de trabajo",
    findingId: finding.id,
    selectionNote: "Selección humana registrada",
    createdBy: "user-1",
  });
  const actividad = await crearActividad(deps, {
    organizationId: "org-1",
    interventionId: intervencion.intervention!.id,
    title: activityRef ? `Actividad ${activityRef}` : "Actividad sin CRV",
    activityRef,
    createdBy: "user-1",
  });
  return actividad.activity!;
}

async function hastaDone(activityRef: string | null) {
  const actividad = await prepararActividad(activityRef);
  await registrarEntregable(deps, {
    activityId: actividad.id,
    organizationId: "org-1",
    title: "Procedimiento documentado",
    registeredBy: "user-1",
  });
  const done = await marcarActividadDone(deps, { activityId: actividad.id, actorUserId: "user-1" });
  return done.activity!;
}

beforeEach(() => {
  repository = createInMemoryProductionRepository([assessment()], MEMBRESIAS);
  deps = {
    engine: createKnowledgeEngine(packRaw),
    repository,
    knowledgeVersionId: KV_A,
    hashToken: (t) => `sha256:${t}`,
  };
});

describe("M1-KL · Activity ≠ Deliverable ≠ Done ≠ Validation", () => {
  it("un Deliverable producido no implica Done", async () => {
    const actividad = await prepararActividad("A04");
    await registrarEntregable(deps, {
      activityId: actividad.id,
      organizationId: "org-1",
      title: "Procedimiento documentado",
      registeredBy: "user-1",
    });
    const actual = (await repository.getActivity(actividad.id))!;
    expect(actual.state).toBe("DELIVERABLE_PRODUCED");
    expect(actual.doneAt).toBeNull();
  });

  it("no se puede marcar Done sin entregable producido", async () => {
    const actividad = await prepararActividad("A04");
    const salida = await marcarActividadDone(deps, {
      activityId: actividad.id,
      actorUserId: "user-1",
    });
    expect(salida.accepted).toBe(false);
    expect(salida.rejectionReason).toBe(DELIVERABLE_REQUIRED_BEFORE_DONE);
  });

  it("Done no implica Validation", async () => {
    const actividad = await hastaDone("A04");
    expect(actividad.doneAt).not.toBeNull();
    expect(actividad.state).not.toBe("VALIDATED");
    expect(await repository.listValidations("assess-1")).toEqual([]);
  });

  it("no se abre Validation sobre una actividad que no está Done", async () => {
    const actividad = await prepararActividad("A04");
    const salida = await abrirValidacion(deps, { activityId: actividad.id, actorUserId: "user-1" });
    expect(salida.accepted).toBe(false);
    expect(salida.rejectionReason).toBe(ACTIVITY_NOT_DONE);
  });
});

describe("M1-KL · CRV de A04 (único explícito)", () => {
  it("el CRV no es un KPI ni un score: conserva su enunciado y condiciones", () => {
    const crv = deps.engine.getValidationRequirementForActivity("A04")!;
    expect(crv.definition).toBe(
      "Second executor correctly completes 3 consecutive cases without critical assistance.",
    );
    expect(crv.isScore).toBe(false);
    expect(crv.requiredCaseCount).toBe(3);
    expect(crv.conditions.map((c) => c.kind).sort()).toEqual([
      "CONSECUTIVE_CORRECT_CASES",
      "DISTINCT_SECOND_EXECUTOR",
      "NO_CRITICAL_ASSISTANCE",
    ]);
  });

  it("solo A04 tiene CRV explícito en el Knowledge Master", () => {
    expect(deps.engine.listValidationRequirements()).toHaveLength(1);
    for (const ref of ["A01", "A02", "A03", "A05", "A06", "A07", "A08", "A09"]) {
      expect(deps.engine.getValidationRequirementForActivity(ref)).toBeNull();
    }
  });

  async function crvDeA04() {
    const actividad = await hastaDone("A04");
    const requisito = await registrarRequisitoValidacion(deps, {
      activityId: actividad.id,
      primaryExecutorRespondentId: "resp-original",
      createdBy: "user-1",
    });
    return { actividad, requirement: requisito.requirement! };
  }

  async function registrarCasos(
    requirementId: string,
    casos: { executor: string; correcto: boolean; asistencia: boolean }[],
  ) {
    let ultimo;
    for (const caso of casos) {
      ultimo = await registrarCasoValidacion(deps, {
        validationRequirementId: requirementId,
        executorRespondentId: caso.executor,
        outcome: caso.correcto ? "CORRECT" : "INCORRECT",
        criticalAssistance: caso.asistencia,
        registeredBy: "user-1",
      });
    }
    return ultimo!;
  }

  it("dos casos correctos del segundo ejecutor NO satisfacen el CRV", async () => {
    const { requirement } = await crvDeA04();
    const salida = await registrarCasos(requirement.id, [
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
    ]);
    expect(salida.evaluation.satisfied).toBe(false);
    expect(salida.evaluation.status).toBe("IN_PROGRESS");
    expect(salida.evaluation.consecutiveCorrectCount).toBe(2);
    expect(salida.evaluation.score).toBeNull();
  });

  it("el tercer caso consecutivo correcto satisface el CRV", async () => {
    const { requirement } = await crvDeA04();
    const salida = await registrarCasos(requirement.id, [
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
    ]);
    expect(salida.evaluation.satisfied).toBe(true);
    expect(salida.evaluation.status).toBe("SATISFIED");
    expect(salida.evaluation.unmetConditionIds).toEqual([]);
  });

  it("la asistencia crítica rompe la condición", async () => {
    const { requirement } = await crvDeA04();
    const salida = await registrarCasos(requirement.id, [
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: true },
      { executor: "resp-segundo", correcto: true, asistencia: false },
    ]);
    expect(salida.evaluation.satisfied).toBe(false);
    expect(salida.evaluation.unmetConditionIds).toContain("NO_CRITICAL_ASSISTANCE");
  });

  it("tres casos del ejecutor original no satisfacen el CRV", async () => {
    const { requirement } = await crvDeA04();
    const salida = await registrarCasos(requirement.id, [
      { executor: "resp-original", correcto: true, asistencia: false },
      { executor: "resp-original", correcto: true, asistencia: false },
      { executor: "resp-original", correcto: true, asistencia: false },
    ]);
    expect(salida.evaluation.satisfied).toBe(false);
    expect(salida.evaluation.unmetConditionIds).toContain("SECOND_EXECUTOR");
  });

  it("Journey A: antes del tercer caso la Validation no puede estar VALIDATED", async () => {
    const { actividad, requirement } = await crvDeA04();
    await registrarCasos(requirement.id, [
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
    ]);

    const parcial = await abrirValidacion(deps, {
      activityId: actividad.id,
      actorUserId: "user-1",
    });
    expect(parcial.validation!.status).toBe("INSUFFICIENT_EVIDENCE");
    const rechazo = await decidirValidacion(deps, {
      validationId: parcial.validation!.id,
      decision: "VALIDATED",
      reviewedBy: "user-1",
    });
    expect(rechazo.accepted).toBe(false);
    expect(rechazo.rejectionReason).toBe(VALIDATION_NOT_GOVERNED);

    await registrarCasos(requirement.id, [
      { executor: "resp-segundo", correcto: true, asistencia: false },
    ]);
    const validacion = await abrirValidacion(deps, {
      activityId: actividad.id,
      actorUserId: "user-1",
      evidenceIds: [],
    });
    const decidida = await decidirValidacion(deps, {
      validationId: validacion.validation!.id,
      decision: "VALIDATED",
      reason: "CRV A04 satisfecho",
      reviewedBy: "user-1",
    });
    expect(decidida.accepted).toBe(true);
    expect(decidida.validation!.status).toBe("VALIDATED");
    expect((await repository.getActivity(actividad.id))!.state).toBe("VALIDATED");
  });

  it("la Validation conserva evidencia y lineage", async () => {
    const { actividad, requirement } = await crvDeA04();
    await registrarCasos(requirement.id, [
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
    ]);
    const abierta = await abrirValidacion(deps, {
      activityId: actividad.id,
      actorUserId: "user-1",
      evidenceIds: ["ev-1"],
    });
    const validation = abierta.validation!;
    expect(validation.caseId).toBe("case-1");
    expect(validation.assessmentId).toBe("assess-1");
    expect(validation.knowledgeVersionId).toBe(KV_A);
    expect(validation.engineVersion).toBe(deps.engine.engineVersion);
    expect(validation.validationRequirementId).toBe(requirement.id);
    const enlaces = await repository.listValidationEvidenceLinks(validation.id);
    expect(enlaces.map((e) => e.evidenceId)).toEqual(["ev-1"]);
  });

  it("un respondent sin membresía no obtiene permiso de validación", async () => {
    const { actividad, requirement } = await crvDeA04();
    await registrarCasos(requirement.id, [
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
    ]);
    const abierta = await abrirValidacion(deps, { activityId: actividad.id, actorUserId: "user-1" });
    const salida = await decidirValidacion(deps, {
      validationId: abierta.validation!.id,
      decision: "VALIDATED",
      reviewedBy: "user-externo",
    });
    expect(salida.accepted).toBe(false);
    expect(salida.rejectionReason).toBe(VALIDATION_PERMISSION_REQUIRED);
  });

  it("Journey A completo termina en Follow-up con provenance", async () => {
    const { actividad, requirement } = await crvDeA04();
    await registrarCasos(requirement.id, [
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
      { executor: "resp-segundo", correcto: true, asistencia: false },
    ]);
    const abierta = await abrirValidacion(deps, { activityId: actividad.id, actorUserId: "user-1" });
    const validada = await decidirValidacion(deps, {
      validationId: abierta.validation!.id,
      decision: "VALIDATED",
      reviewedBy: "user-1",
    });
    const seguimiento = await iniciarFollowUp(deps, {
      validationId: validada.validation!.id,
      actorUserId: "user-1",
    });
    expect(seguimiento.followUp!.status).toBe("OPEN");
    expect((await repository.getActivity(actividad.id))!.state).toBe("FOLLOW_UP");

    const sinProvenance = await decidirFollowUp(deps, {
      followUpId: seguimiento.followUp!.id,
      outcome: "CONSOLIDATED",
      decidedBy: "user-1",
    });
    expect(sinProvenance.accepted).toBe(false);

    const decidido = await decidirFollowUp(deps, {
      followUpId: seguimiento.followUp!.id,
      outcome: "CONSOLIDATED",
      note: "Tres meses de ejecución estable observada",
      decidedBy: "user-1",
    });
    expect(decidido.followUp!.status).toBe("CONSOLIDATED");
    expect(decidido.followUp!.decidedBy).toBe("user-1");
    expect((await repository.getActivity(actividad.id))!.state).toBe("CONSOLIDATED");
  });

  it("no hay Follow-up sin Validation VALIDATED", async () => {
    const { actividad } = await crvDeA04();
    const abierta = await abrirValidacion(deps, { activityId: actividad.id, actorUserId: "user-1" });
    const salida = await iniciarFollowUp(deps, {
      validationId: abierta.validation!.id,
      actorUserId: "user-1",
    });
    expect(salida.accepted).toBe(false);
  });
});

describe("M1-KL · Journey B · Activity sin CRV explícito", () => {
  it("registra el gap y nunca valida automáticamente", async () => {
    const actividad = await hastaDone("A02");
    const requisito = await registrarRequisitoValidacion(deps, {
      activityId: actividad.id,
      createdBy: "user-1",
    });
    expect(requisito.requirement!.status).toBe(VALIDATION_REQUIREMENT_NOT_EXPLICIT);
    expect(requisito.requirement!.definition).toBe(VALIDATION_REQUIREMENT_NOT_EXPLICIT);
    expect(requisito.requirement!.requiredCaseCount).toBeNull();

    const casos = await registrarCasoValidacion(deps, {
      validationRequirementId: requisito.requirement!.id,
      executorRespondentId: "resp-segundo",
      outcome: "CORRECT",
      criticalAssistance: false,
      registeredBy: "user-1",
    });
    expect(casos.accepted).toBe(false);
    expect(casos.rejectionReason).toBe(VALIDATION_REQUIREMENT_NOT_EXPLICIT);

    const validacion = await abrirValidacion(deps, {
      activityId: actividad.id,
      actorUserId: "user-1",
    });
    expect(validacion.validation!.status).toBe("PENDING");
    expect(validacion.validation!.decisionReason).toBe(VALIDATION_REQUIREMENT_NOT_EXPLICIT);

    const intento = await decidirValidacion(deps, {
      validationId: validacion.validation!.id,
      decision: "VALIDATED",
      reviewedBy: "user-1",
    });
    expect(intento.accepted).toBe(false);
    expect(intento.rejectionReason).toBe(VALIDATION_NOT_GOVERNED);
    expect((await repository.getActivity(actividad.id))!.state).not.toBe("VALIDATED");
  });

  it("evaluar un CRV inexistente devuelve el gap, no una satisfacción", async () => {
    const actividad = await hastaDone("A02");
    const requisito = await registrarRequisitoValidacion(deps, {
      activityId: actividad.id,
      createdBy: "user-1",
    });
    const evaluacion = await evaluarRequisitoValidacion(deps, requisito.requirement!.id);
    expect(evaluacion.satisfied).toBe(false);
    expect(evaluacion.status).toBe(VALIDATION_REQUIREMENT_NOT_EXPLICIT);
  });
});

describe("M1-KL · Journey C y D · Reassessment y version pinning", () => {
  it("el Reassessment crea un Assessment nuevo del mismo Case", async () => {
    await prepararActividad("A04");
    const salida = await iniciarReassessment(deps, {
      baselineAssessmentId: "assess-1",
      actorUserId: "user-1",
    });
    expect(salida.accepted).toBe(true);
    expect(salida.assessment!.id).not.toBe("assess-1");
    expect(salida.assessment!.type).toBe("REASSESSMENT");
    expect(salida.assessment!.caseId).toBe("case-1");
    expect(salida.evaluationRunId).toBeTruthy();

    const assessments = await repository.listAssessments("case-1");
    expect(assessments.map((a) => a.type)).toEqual(["BASELINE", "REASSESSMENT"]);
  });

  it("el Reassessment no sobrescribe observaciones, runs ni findings del Baseline", async () => {
    await prepararActividad("A04");
    const observacionesAntes = await repository.listObservations("assess-1");
    const runsAntes = await repository.listEvaluationRuns("assess-1");
    const findingsAntes = await listFindings(deps, "assess-1");

    const nuevo = await iniciarReassessment(deps, {
      baselineAssessmentId: "assess-1",
      knowledgeVersionId: KV_B,
      actorUserId: "user-1",
    });
    await submitAcquisitionResponse(deps, {
      assessmentId: nuevo.assessment!.id,
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Documentada",
    });

    expect(await repository.listObservations("assess-1")).toEqual(observacionesAntes);
    expect((await repository.listEvaluationRuns("assess-1")).length).toBe(runsAntes.length);
    const findingsDespues = await listFindings(deps, "assess-1");
    expect(findingsDespues.map((f) => f.id)).toEqual(findingsAntes.map((f) => f.id));
  });

  it("el Baseline conserva su KnowledgeVersion y el Reassessment puede pinnear otra", async () => {
    const nuevo = await iniciarReassessment(deps, {
      baselineAssessmentId: "assess-1",
      knowledgeVersionId: KV_B,
      actorUserId: "user-1",
    });
    expect(nuevo.assessment!.knowledgeVersionId).toBe(KV_B);
    expect((await repository.getAssessment("assess-1"))!.knowledgeVersionId).toBe(KV_A);
    const run = (await repository.listEvaluationRuns(nuevo.assessment!.id))[0]!;
    expect(run.knowledgeVersionId).toBe(KV_B);
    expect(run.trigger).toBe("REASSESSMENT_STARTED");
  });

  it("el snapshot preserva el estado histórico del Baseline", async () => {
    await prepararActividad("A04");
    const salida = await iniciarReassessment(deps, {
      baselineAssessmentId: "assess-1",
      actorUserId: "user-1",
    });
    const snapshot = salida.snapshot!;
    expect(snapshot.assessmentId).toBe("assess-1");
    expect(snapshot.knowledgeVersionId).toBe(KV_A);
    expect(Array.isArray(snapshot.payload["observations"])).toBe(true);
    expect((await repository.listAssessmentSnapshots("assess-1")).length).toBe(1);
  });

  it("los findings históricos no se eliminan", async () => {
    await prepararActividad("A04");
    const historicos = await listFindings(deps, "assess-1");
    await iniciarReassessment(deps, { baselineAssessmentId: "assess-1", actorUserId: "user-1" });
    expect((await listFindings(deps, "assess-1")).length).toBe(historicos.length);
  });
});

describe("M1-KL · Comparación Baseline vs Reassessment", () => {
  it("UNKNOWN→KNOWN es más información, nunca mejora automática", () => {
    const [comparacion] = deps.engine.compareVariableStates(
      [{ variableRef: "V1", state: "UNKNOWN" }],
      [{ variableRef: "V1", state: "KNOWN" }],
    );
    expect(comparacion!.transition).toBe("MORE_INFORMATION");
    expect(comparacion!.improvement).toBeNull();
    expect(comparacion!.interpretation).toContain("NO significa mejora");
  });

  it("CONTRADICTORY→KNOWN es contradicción resuelta, nunca mejora automática", () => {
    const [comparacion] = deps.engine.compareVariableStates(
      [{ variableRef: "V1", state: "CONTRADICTORY" }],
      [{ variableRef: "V1", state: "KNOWN" }],
    );
    expect(comparacion!.transition).toBe("CONTRADICTION_RESOLVED");
    expect(comparacion!.improvement).toBeNull();
    expect(comparacion!.interpretation).toContain("NO significa mejora");
  });

  it("la comparación productiva no produce maturity score", async () => {
    await prepararActividad("A04");
    const nuevo = await iniciarReassessment(deps, {
      baselineAssessmentId: "assess-1",
      knowledgeVersionId: KV_B,
      actorUserId: "user-1",
    });
    await submitAcquisitionResponse(deps, {
      assessmentId: nuevo.assessment!.id,
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Documentada",
    });

    const salida = await compararAssessments(deps, {
      baselineAssessmentId: "assess-1",
      reassessmentAssessmentId: nuevo.assessment!.id,
    });
    const comparacion = salida.comparison!;
    expect(comparacion.maturityScore).toBeNull();
    expect(comparacion.improvement).toBeNull();
    expect(comparacion.baseline.knowledgeVersionId).toBe(KV_A);
    expect(comparacion.reassessment.knowledgeVersionId).toBe(KV_B);
    expect(comparacion.variableComparisons.every((c) => c.improvement === null)).toBe(true);
  });
});

describe("M1-KL · LearningCandidate ≠ Master Knowledge", () => {
  it("un candidato de aprendizaje nunca se aplica al Knowledge Master", async () => {
    const candidato = await registrarCandidatoAprendizaje(deps, {
      organizationId: "org-1",
      caseId: "case-1",
      assessmentId: "assess-1",
      sourceTable: "validations",
      statement: "El CRV de A04 podría requerir un cuarto caso en operaciones estacionales",
      createdBy: "user-1",
    });
    expect(candidato.appliedToMaster).toBe(false);
    expect(candidato.status).toBe("CANDIDATE");

    const packAntes = JSON.stringify(packRaw);
    const packAhora = readFileSync(PACK_PATH, "utf8");
    expect(JSON.stringify(JSON.parse(packAhora))).toBe(packAntes);
    expect(deps.engine.listValidationRequirements()).toHaveLength(1);
  });
});

describe("M1-KL · el estado de ejecución no se cambia a validación a mano", () => {
  it("cambiar estado de actividad no puede fabricar una Validation", async () => {
    const actividad = await hastaDone("A04");
    await cambiarEstadoActividad(deps, {
      activityId: actividad.id,
      state: "VALIDATED",
      actorUserId: "user-1",
    });
    // El estado visual puede cambiar, pero no existe Validation registrada.
    expect(await repository.listValidations("assess-1")).toEqual([]);
  });
});
