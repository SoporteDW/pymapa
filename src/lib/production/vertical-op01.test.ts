/**
 * M1-D · Acceptance tests del primer vertical productivo (OP-01 / P01).
 * Cubre: schema del pack, fixtures de P01, runtime genérico, persistencia
 * (Response → Observation → EvaluationRun → VariableEvaluation /
 * InformationNeedState → AssessmentState), preservación de UNKNOWN y pinning
 * de KnowledgeVersion.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { validateKnowledgePack } from "@pymapa/knowledge-schema";
import { createKnowledgeEngine, ENGINE_VERSION } from "@pymapa/knowledge-engine";
import {
  createInMemoryProductionRepository,
  type AssessmentRecord,
  type ProductionRepository,
} from "./puertos";
import {
  getAssessmentState,
  getNextAcquisition,
  submitAcquisitionResponse,
  KNOWLEDGE_VERSION_MISMATCH,
} from "./caso-uso";

const PACK_PATH = join(process.cwd(), "knowledge", "packs", "op-01", "1.0.0", "pack.json");
const packRaw = JSON.parse(readFileSync(PACK_PATH, "utf8")) as Record<string, unknown>;

const KV = "kv-op01-1.0.0";

function assessment(knowledgeVersionId = KV): AssessmentRecord {
  return {
    id: "assess-1",
    organizationId: "org-1",
    caseId: "case-1",
    knowledgeVersionId,
    type: "BASELINE",
    startedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("Knowledge Pack OP-01 · schema", () => {
  it("el pack versionado valida contra el schema ejecutable", () => {
    const resultado = validateKnowledgePack(packRaw);
    expect(resultado.ok, JSON.stringify(resultado.ok ? [] : resultado.issues)).toBe(true);
  });

  it("declara la fuente gobernada y su estado aprobado", () => {
    expect(packRaw["knowledgeMaster"]).toMatchObject({
      identifier: "PYMAPA-KNOWLEDGE-MASTER",
      version: "1.0",
      status: "BASELINE-APPROVED",
    });
  });

  it("implementa P01 y P05–P15; P02–P04 permanecen sin contenido gobernado", () => {
    const engine = createKnowledgeEngine(packRaw);
    const ids = engine.listAcquisitions().map((a) => a.id);
    expect(ids).toEqual([
      "OP01-P01",
      "OP01-P05",
      "OP01-P06",
      "OP01-P07",
      "OP01-P08",
      "OP01-P09",
      "OP01-P10",
      "OP01-P11",
      "OP01-P12",
      "OP01-P13",
      "OP01-P14",
      "OP01-P15",
    ]);
    expect(ids).not.toContain("OP01-P02");
    expect(ids).not.toContain("OP01-P03");
    expect(ids).not.toContain("OP01-P04");
  });

  it("no introduce escalas numéricas para los estados semánticos", () => {
    const serializado = JSON.stringify(packRaw);
    expect(serializado).not.toMatch(/"(score|weight|puntaje|maturityScore)"/i);
    const va01 = (packRaw["variables"] as { id: string; semanticStates: string[] | null }[]).find(
      (v) => v.id === "VA01",
    );
    expect(va01?.semanticStates).toEqual(["No identificable", "Implícita", "Definida", "Formalizada"]);
  });

  it("no resuelve ningún KNOWLEDGE CHANGE CANDIDATE", () => {
    const kcc = packRaw["knowledgeChangeCandidates"] as { id: string }[];
    expect(kcc.map((k) => k.id)).toEqual([
      "KCC-AT04-01",
      "KCC-AT04-02",
      "KCC-AT04-03",
      "KCC-AT04-04",
      "KCC-AT04-05",
      "KCC-AT04-06",
      "KCC-AT04-07",
      "KCC-AT04-08",
    ]);
  });

  it("no declara fórmula de sufficiency ni de confidence", () => {
    expect((packRaw["sufficiency"] as { formula: string }).formula).toBe(
      "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
    );
    expect((packRaw["confidence"] as { formula: string }).formula).toBe(
      "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
    );
  });

  it("rechaza un pack que elimine la preservación de UNKNOWN", () => {
    const mutado = JSON.parse(JSON.stringify(packRaw)) as {
      acquisitions: { responseModel: { knowledgeStates: string[] } }[];
    };
    mutado.acquisitions[0]!.responseModel.knowledgeStates = ["KNOWN"];
    expect(validateKnowledgePack(mutado).ok).toBe(false);
  });
});

describe("Knowledge Engine · runtime genérico", () => {
  const engine = createKnowledgeEngine(packRaw);

  it("sirve la pregunta de P01 desde el pack", () => {
    const evaluacion = engine.evaluate({ observations: [], knowledgeVersionId: KV });
    const siguiente = engine.getNextAcquisition(evaluacion);
    expect(siguiente?.acquisitionId).toBe("OP01-P01");
    expect(siguiente?.question).toBe(
      "Pensando en este proceso, ¿qué tan clara está actualmente la forma en que debe realizarse?",
    );
    expect(siguiente?.allowedKnowledgeStates).toEqual([
      "KNOWN",
      "UNKNOWN",
      "NOT_APPLICABLE",
      "CONTRADICTORY",
    ]);
    expect(siguiente?.optionSetStatus).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
  });

  it("no produce findings, sufficiency ni confidence", () => {
    const evaluacion = engine.evaluate({ observations: [], knowledgeVersionId: KV });
    expect(evaluacion.findings).toEqual([]);
    expect(evaluacion.sufficiency.state).toBeNull();
    expect(evaluacion.confidence.state).toBeNull();
  });

  it("transporta las reglas gobernadas como juicio pendiente sin ejecutarlas", () => {
    const evaluacion = engine.evaluate({ observations: [], knowledgeVersionId: KV });
    expect(evaluacion.pendingJudgments.map((p) => p.ruleRef)).toContain("R-OP01-01");
    expect(evaluacion.pendingJudgments.every((p) => p.classification === "GOVERNED_JUDGMENT")).toBe(true);
  });

  it("registra trazabilidad completa de cada evaluación", () => {
    const { traceability } = engine.evaluate({ observations: [], knowledgeVersionId: KV });
    expect(traceability).toMatchObject({
      knowledgeMasterIdentifier: "PYMAPA-KNOWLEDGE-MASTER",
      knowledgePackId: "op-01",
      knowledgePackVersion: "1.0.0",
      engineVersion: ENGINE_VERSION,
      knowledgeVersionId: KV,
      capabilityId: "OP-01",
    });
    expect(traceability.ruleRefsConsidered.length).toBe(13);
  });

  it("rechaza NOT_APPLICABLE sin razón y CONTRADICTORY sin fuentes", () => {
    const base = {
      id: "o1",
      variableRef: "VA01",
      acquisitionRef: "OP01-P01",
      semanticValue: null,
      sourceResponseId: null,
      recordedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(engine.validateObservation({ ...base, knowledgeState: "NOT_APPLICABLE" }).ok).toBe(false);
    expect(engine.validateObservation({ ...base, knowledgeState: "CONTRADICTORY" }).ok).toBe(false);
    expect(engine.validateObservation({ ...base, knowledgeState: "UNKNOWN" }).ok).toBe(true);
  });

  it("rechaza un valor semántico fuera de los estados aprobados", () => {
    const resultado = engine.validateObservation({
      id: "o1",
      variableRef: "VA01",
      acquisitionRef: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Nivel 3",
      sourceResponseId: null,
      recordedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(resultado.ok).toBe(false);
  });

  it("marca CONTRADICTORY cuando dos estados semánticos entran en conflicto", () => {
    const evaluacion = engine.evaluate({
      knowledgeVersionId: KV,
      observations: [
        {
          id: "o1",
          variableRef: "VA01",
          acquisitionRef: "OP01-P01",
          knowledgeState: "KNOWN",
          semanticValue: "Formalizada",
          sourceResponseId: null,
          recordedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "o2",
          variableRef: "VA01",
          acquisitionRef: "OP01-P01",
          knowledgeState: "KNOWN",
          semanticValue: "Implícita",
          sourceResponseId: null,
          recordedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });
    const va01 = evaluacion.variableEvaluations.find((v) => v.variableRef === "VA01");
    expect(va01?.state).toBe("CONTRADICTORY");
    expect(va01?.semanticValue).toBeNull();
  });

  it("no contiene condicionales por capacidad en el runtime", () => {
    const fuente = readFileSync(
      join(process.cwd(), "packages", "knowledge-engine", "src", "index.ts"),
      "utf8",
    );
    expect(fuente).not.toMatch(/OP-?01/);
    expect(fuente).not.toMatch(/capabilityId\s*===/);
  });
});

describe("Vertical OP01-P01 · persistencia y estado", () => {
  let repository: ProductionRepository;
  let deps: Parameters<typeof submitAcquisitionResponse>[0];

  beforeEach(() => {
    repository = createInMemoryProductionRepository([assessment()]);
    deps = { engine: createKnowledgeEngine(packRaw), repository, knowledgeVersionId: KV };
  });

  const comando = {
    assessmentId: "assess-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    acquisitionId: "OP01-P01",
  };

  it("una respuesta KNOWN produce Response, Observation y EvaluationRun", async () => {
    const salida = await submitAcquisitionResponse(deps, {
      ...comando,
      knowledgeState: "KNOWN",
      semanticValue: "Definida",
    });

    expect(salida.accepted).toBe(true);
    expect(salida.responseId).toBeTruthy();
    expect(salida.observationId).toBeTruthy();
    expect(salida.evaluationRunId).toBeTruthy();

    const responses = await repository.listResponses("assess-1");
    const observations = await repository.listObservations("assess-1");
    expect(responses).toHaveLength(1);
    expect(observations).toHaveLength(1);
    // Response ≠ Observation: entidades distintas con trazabilidad explícita.
    expect(observations[0]!.id).not.toBe(responses[0]!.id);
    expect(observations[0]!.sourceResponseId).toBe(responses[0]!.id);
    expect(responses[0]!.payload["semanticValue"]).toBe("Definida");

    const variables = await repository.listInformationNeedStates("assess-1");
    expect(variables.find((n) => n.needRef === "NI01")?.state).toBe("COLLECTED");
    expect(salida.state?.variableStates.find((v) => v.variableRef === "VA01")).toMatchObject({
      state: "KNOWN",
      semanticValue: "Definida",
    });
  });

  it("el EvaluationRun registra KnowledgeVersion, EngineVersion y trigger", async () => {
    await submitAcquisitionResponse(deps, { ...comando, knowledgeState: "KNOWN", semanticValue: "Definida" });
    const runs = (repository as ReturnType<typeof createInMemoryProductionRepository>).estado[
      "runs"
    ] as { knowledgeVersionId: string; engineVersion: string; trigger: string; status: string }[];
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      knowledgeVersionId: KV,
      engineVersion: ENGINE_VERSION,
      trigger: "RESPONSE_ACCEPTED",
      // Quedan juicios gobernados sin resolver: el run pide revisión, no infiere.
      status: "NEEDS_REVIEW",
    });
  });

  it("UNKNOWN se preserva como UNKNOWN y no genera conclusión adversa", async () => {
    const salida = await submitAcquisitionResponse(deps, { ...comando, knowledgeState: "UNKNOWN" });
    expect(salida.accepted).toBe(true);

    const observations = await repository.listObservations("assess-1");
    expect(observations[0]!.value.knowledgeState).toBe("UNKNOWN");
    expect(observations[0]!.value.semanticValue).toBeNull();

    const va01 = salida.state?.variableStates.find((v) => v.variableRef === "VA01");
    expect(va01?.state).toBe("UNKNOWN");
    expect(va01?.semanticValue).toBeNull();

    // No se fabrica ningún finding ni conclusión negativa a partir de UNKNOWN.
    expect(salida.state?.sufficiency).toBeNull();
    expect(salida.state?.confidence).toBeNull();

    // Y un UNKNOWN explícito no se vuelve a preguntar en bucle.
    expect(await getNextAcquisition(deps, "assess-1")).toBeNull();
  });

  it("una respuesta inadmisible persiste la Response pero no crea Observation", async () => {
    const salida = await submitAcquisitionResponse(deps, {
      ...comando,
      knowledgeState: "NOT_APPLICABLE",
      notApplicableReason: null,
    });
    expect(salida.accepted).toBe(false);
    expect(salida.responseId).toBeTruthy();
    expect(salida.observationId).toBeNull();
    expect(await repository.listObservations("assess-1")).toHaveLength(0);
    expect(await repository.listResponses("assess-1")).toHaveLength(1);
  });

  it("P01 es la siguiente adquisición antes de responder y desaparece después", async () => {
    expect((await getNextAcquisition(deps, "assess-1"))?.acquisitionId).toBe("OP01-P01");
    await submitAcquisitionResponse(deps, { ...comando, knowledgeState: "KNOWN", semanticValue: "Definida" });
    expect(await getNextAcquisition(deps, "assess-1")).toBeNull();
  });

  it("el estado del assessment refleja la adquisición respondida", async () => {
    const inicial = await getAssessmentState(deps, "assess-1");
    expect(inicial?.status).toBe("not_started");
    expect(inicial?.totalAcquisitions).toBe(1);

    await submitAcquisitionResponse(deps, { ...comando, knowledgeState: "KNOWN", semanticValue: "Definida" });
    const despues = await getAssessmentState(deps, "assess-1");
    expect(despues?.status).toBe("in_progress");
    expect(despues?.answeredAcquisitionIds).toEqual(["OP01-P01"]);
    expect(despues?.knowledgeVersionId).toBe(KV);
    expect(despues?.engineVersion).toBe(ENGINE_VERSION);
  });

  it("rechaza evaluar contra una KnowledgeVersion distinta a la fijada", async () => {
    const otroRepo = createInMemoryProductionRepository([assessment("kv-otra")]);
    const otrasDeps = {
      engine: createKnowledgeEngine(packRaw),
      repository: otroRepo,
      knowledgeVersionId: KV,
    };
    const salida = await submitAcquisitionResponse(otrasDeps, {
      ...comando,
      knowledgeState: "KNOWN",
      semanticValue: "Definida",
    });
    expect(salida.accepted).toBe(false);
    expect(salida.rejectionReason).toBe(KNOWLEDGE_VERSION_MISMATCH);
    expect(await otroRepo.listResponses("assess-1")).toHaveLength(0);
    await expect(getAssessmentState(otrasDeps, "assess-1")).rejects.toThrow(KNOWLEDGE_VERSION_MISMATCH);
  });

  it("rechaza una adquisición que no existe en el pack (P02–P15 no implementadas)", async () => {
    const salida = await submitAcquisitionResponse(deps, {
      ...comando,
      acquisitionId: "OP01-P15",
      knowledgeState: "KNOWN",
      semanticValue: "Definida",
    });
    expect(salida.accepted).toBe(false);
    expect(salida.rejectionReason).toBe("ACQUISITION_NOT_IN_PACK");
  });
});
