/**
 * Casos de uso del vertical productivo (M1-D) · Application boundary.
 *
 * Orquesta: Response → Observation → EvaluationRun →
 * VariableEvaluation / InformationNeedState → AssessmentState.
 *
 * REGLAS:
 * - No contiene conocimiento de ninguna capacidad: todo proviene del pack
 *   interpretado por el engine (inyectado como dependencia).
 * - No calcula scoring, sufficiency, confidence, severidad ni priority.
 * - UNKNOWN se persiste como UNKNOWN y nunca deriva conclusión adversa.
 * - Toda evaluación se ejecuta contra la KnowledgeVersion fijada al Assessment.
 */
import type {
  EngineObservation,
  EvaluationResult,
  KnowledgeEngine,
  KnowledgeState,
  NextAcquisition,
} from "@pymapa/knowledge-engine";
import type { EvaluationRunTrigger, ProductionRepository } from "./puertos";

export const KNOWLEDGE_VERSION_MISMATCH = "KNOWLEDGE_VERSION_MISMATCH" as const;

export interface ProductionDeps {
  engine: KnowledgeEngine;
  repository: ProductionRepository;
  /** ID del registro knowledge_versions que respalda el pack cargado. */
  knowledgeVersionId: string;
  now?: () => string;
}

export interface ProductionAssessmentState {
  assessmentId: string;
  capabilityId: string;
  knowledgeVersionId: string;
  engineVersion: string;
  status: "not_started" | "in_progress" | "completed";
  answeredAcquisitionIds: string[];
  totalAcquisitions: number;
  variableStates: { variableRef: string; state: KnowledgeState; semanticValue: string | null }[];
  informationNeedStates: { needRef: string; state: string }[];
  pendingJudgmentRuleRefs: string[];
  sufficiency: null;
  confidence: null;
  updatedAt: string;
}

export interface SubmitAcquisitionResponseInput {
  assessmentId: string;
  organizationId: string;
  submittedBy: string | null;
  acquisitionId: string;
  knowledgeState: KnowledgeState;
  semanticValue?: string | null;
  notApplicableReason?: string | null;
  conflictingObservationIds?: string[];
  /** Entrada literal de la persona, preservada en la Response. */
  rawInput?: Record<string, unknown>;
}

export interface SubmitAcquisitionResponseOutput {
  accepted: boolean;
  rejectionReason?: string;
  responseId: string | null;
  observationId: string | null;
  evaluationRunId: string | null;
  state: ProductionAssessmentState | null;
}

const ahoraPorDefecto = () => new Date().toISOString();

function aEngineObservations(
  filas: Awaited<ReturnType<ProductionRepository["listObservations"]>>,
): EngineObservation[] {
  return filas.map((o) => ({
    id: o.id,
    variableRef: o.variableRef,
    acquisitionRef: o.value.acquisitionRef,
    knowledgeState: o.value.knowledgeState,
    semanticValue: o.value.semanticValue,
    sourceResponseId: o.sourceResponseId,
    notApplicableReason: o.value.notApplicableReason ?? null,
    ...(o.value.conflictingObservationIds
      ? { conflictingObservationIds: o.value.conflictingObservationIds }
      : {}),
    recordedAt: o.createdAt,
  }));
}

function construirEstado(params: {
  assessmentId: string;
  capabilityId: string;
  knowledgeVersionId: string;
  engineVersion: string;
  evaluation: EvaluationResult;
  answeredAcquisitionIds: string[];
  totalAcquisitions: number;
  closedAt: string | null;
  updatedAt: string;
}): ProductionAssessmentState {
  const { evaluation } = params;
  return {
    assessmentId: params.assessmentId,
    capabilityId: params.capabilityId,
    knowledgeVersionId: params.knowledgeVersionId,
    engineVersion: params.engineVersion,
    status: params.closedAt
      ? "completed"
      : params.answeredAcquisitionIds.length > 0
        ? "in_progress"
        : "not_started",
    answeredAcquisitionIds: params.answeredAcquisitionIds,
    totalAcquisitions: params.totalAcquisitions,
    variableStates: evaluation.variableEvaluations.map((v) => ({
      variableRef: v.variableRef,
      state: v.state,
      semanticValue: v.semanticValue,
    })),
    informationNeedStates: evaluation.informationNeedStates.map((n) => ({
      needRef: n.needRef,
      state: n.state,
    })),
    pendingJudgmentRuleRefs: evaluation.pendingJudgments.map((p) => p.ruleRef),
    sufficiency: null,
    confidence: null,
    updatedAt: params.updatedAt,
  };
}

/** Verifica el pinning de KnowledgeVersion. Nunca evalúa contra otra versión. */
async function assessmentFijado(deps: ProductionDeps, assessmentId: string) {
  const assessment = await deps.repository.getAssessment(assessmentId);
  if (!assessment) return { ok: false as const, reason: "ASSESSMENT_NOT_FOUND" };
  if (assessment.knowledgeVersionId !== deps.knowledgeVersionId) {
    return { ok: false as const, reason: KNOWLEDGE_VERSION_MISMATCH };
  }
  return { ok: true as const, assessment };
}

export async function getAssessmentState(
  deps: ProductionDeps,
  assessmentId: string,
): Promise<ProductionAssessmentState | null> {
  const fijado = await assessmentFijado(deps, assessmentId);
  if (!fijado.ok) {
    if (fijado.reason === KNOWLEDGE_VERSION_MISMATCH) throw new Error(KNOWLEDGE_VERSION_MISMATCH);
    return null;
  }
  const observations = await deps.repository.listObservations(assessmentId);
  const responses = await deps.repository.listResponses(assessmentId);
  const evaluation = deps.engine.evaluate({
    observations: aEngineObservations(observations),
    knowledgeVersionId: deps.knowledgeVersionId,
  });
  return construirEstado({
    assessmentId,
    capabilityId: deps.engine.pack.capability.id,
    knowledgeVersionId: deps.knowledgeVersionId,
    engineVersion: deps.engine.engineVersion,
    evaluation,
    answeredAcquisitionIds: [...new Set(responses.map((r) => r.acquisitionRef))],
    totalAcquisitions: deps.engine.listAcquisitions().length,
    closedAt: fijado.assessment.closedAt,
    updatedAt: fijado.assessment.updatedAt,
  });
}

export async function getNextAcquisition(
  deps: ProductionDeps,
  assessmentId: string,
): Promise<NextAcquisition | null> {
  const fijado = await assessmentFijado(deps, assessmentId);
  if (!fijado.ok) {
    if (fijado.reason === KNOWLEDGE_VERSION_MISMATCH) throw new Error(KNOWLEDGE_VERSION_MISMATCH);
    return null;
  }
  const observations = await deps.repository.listObservations(assessmentId);
  const evaluation = deps.engine.evaluate({
    observations: aEngineObservations(observations),
    knowledgeVersionId: deps.knowledgeVersionId,
  });
  return deps.engine.getNextAcquisition(evaluation);
}

export async function submitAcquisitionResponse(
  deps: ProductionDeps,
  input: SubmitAcquisitionResponseInput,
): Promise<SubmitAcquisitionResponseOutput> {
  const now = deps.now ?? ahoraPorDefecto;
  const vacio: SubmitAcquisitionResponseOutput = {
    accepted: false,
    responseId: null,
    observationId: null,
    evaluationRunId: null,
    state: null,
  };

  const fijado = await assessmentFijado(deps, input.assessmentId);
  if (!fijado.ok) return { ...vacio, rejectionReason: fijado.reason };

  const acquisition = deps.engine.getAcquisition(input.acquisitionId);
  if (!acquisition) return { ...vacio, rejectionReason: "ACQUISITION_NOT_IN_PACK" };

  // Una adquisición puede alimentar varias variables; el pack decide, no el código.
  const variableRef = acquisition.variableRefs[0]!;

  // 1. Response: preserva la entrada de la persona tal como fue aportada.
  const response = await deps.repository.insertResponse({
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    submittedBy: input.submittedBy,
    acquisitionRef: acquisition.id,
    payload: {
      knowledgeState: input.knowledgeState,
      semanticValue: input.semanticValue ?? null,
      notApplicableReason: input.notApplicableReason ?? null,
      conflictingObservationIds: input.conflictingObservationIds ?? [],
      raw: input.rawInput ?? null,
      capturedAt: now(),
    },
  });

  // 2. Observation: solo si la entrada es admisible según el pack.
  const candidata: EngineObservation = {
    id: "pendiente",
    variableRef,
    acquisitionRef: acquisition.id,
    knowledgeState: input.knowledgeState,
    semanticValue: input.semanticValue ?? null,
    sourceResponseId: response.id,
    notApplicableReason: input.notApplicableReason ?? null,
    ...(input.conflictingObservationIds
      ? { conflictingObservationIds: input.conflictingObservationIds }
      : {}),
    recordedAt: now(),
  };
  const admisible = deps.engine.validateObservation(candidata);
  if (!admisible.ok) {
    // La Response queda persistida aunque no produzca Observation:
    // no toda Response genera automáticamente una Observation.
    return {
      ...vacio,
      responseId: response.id,
      rejectionReason: `OBSERVATION_REJECTED: ${admisible.reason}`,
    };
  }

  const observation = await deps.repository.insertObservation({
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    sourceResponseId: response.id,
    variableRef,
    value: {
      knowledgeState: input.knowledgeState,
      semanticValue: input.semanticValue ?? null,
      acquisitionRef: acquisition.id,
      notApplicableReason: input.notApplicableReason ?? null,
      ...(input.conflictingObservationIds
        ? { conflictingObservationIds: input.conflictingObservationIds }
        : {}),
    },
  });

  // 3. EvaluationRun con lineage completo.
  const trigger: EvaluationRunTrigger = "RESPONSE_ACCEPTED";
  const run = await deps.repository.createEvaluationRun({
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    knowledgeVersionId: fijado.assessment.knowledgeVersionId,
    engineVersion: deps.engine.engineVersion,
    trigger,
    status: "PROCESSING",
    startedAt: now(),
  });

  // 4. Evaluación trazable + estados semánticos.
  const observations = await deps.repository.listObservations(input.assessmentId);
  const evaluation = deps.engine.evaluate({
    observations: aEngineObservations(observations),
    knowledgeVersionId: fijado.assessment.knowledgeVersionId,
  });

  await deps.repository.replaceVariableEvaluations(
    run.id,
    evaluation.variableEvaluations.map((v) => ({
      organizationId: input.organizationId,
      evaluationRunId: run.id,
      variableRef: v.variableRef,
      state: v.state,
      detail: { ...v.detail, semanticValue: v.semanticValue, traceability: evaluation.traceability },
    })),
  );

  await deps.repository.upsertInformationNeedStates(
    evaluation.informationNeedStates.map((n) => ({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      evaluationRunId: run.id,
      needRef: n.needRef,
      state: n.state,
      detail: { ...n.detail, traceability: evaluation.traceability },
    })),
  );

  // Juicios gobernados pendientes → el run queda para revisión, no se infiere.
  const estadoFinal = evaluation.pendingJudgments.length > 0 ? "NEEDS_REVIEW" : "PROCESSED";
  const runCerrado = await deps.repository.completeEvaluationRun(run.id, estadoFinal, now());

  const responses = await deps.repository.listResponses(input.assessmentId);
  const state = construirEstado({
    assessmentId: input.assessmentId,
    capabilityId: deps.engine.pack.capability.id,
    knowledgeVersionId: fijado.assessment.knowledgeVersionId,
    engineVersion: deps.engine.engineVersion,
    evaluation,
    answeredAcquisitionIds: [...new Set(responses.map((r) => r.acquisitionRef))],
    totalAcquisitions: deps.engine.listAcquisitions().length,
    closedAt: fijado.assessment.closedAt,
    updatedAt: runCerrado.completedAt ?? now(),
  });

  return {
    accepted: true,
    responseId: response.id,
    observationId: observation.id,
    evaluationRunId: run.id,
    state,
  };
}
