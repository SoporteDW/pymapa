/**
 * Casos de uso del vertical productivo (M1-D · ampliado en M1-EFG).
 *
 * Orquesta: Response → Observation → EvaluationRun →
 * VariableEvaluation / InformationNeedState → AssessmentState, más
 * diagnóstico colaborativo (Respondent / Assignment / Invitation) y
 * Evidence Store (Evidence ↔ Observation).
 *
 * REGLAS:
 * - No contiene conocimiento de ninguna capacidad: todo proviene del pack
 *   interpretado por el engine (inyectado como dependencia).
 * - No calcula scoring, sufficiency, confidence, severidad ni priority.
 * - UNKNOWN se persiste como UNKNOWN y nunca deriva conclusión adversa.
 * - Las contradicciones se conservan con sus fuentes: no se promedian, ni se
 *   resuelven por jerarquía, ni se delegan a un LLM.
 * - Un respondent solo puede aportar dentro del alcance de su assignment.
 * - Toda evaluación se ejecuta contra la KnowledgeVersion fijada al Assessment.
 */
import type {
  EngineObservation,
  EvaluationResult,
  KnowledgeEngine,
  KnowledgeState,
  NextAcquisition,
} from "@pymapa/knowledge-engine";
import type {
  ActivityRecord,
  AssignmentRecord,
  AssignmentScopeType,
  EvaluationRunTrigger,
  EvidenceRecord,
  EvidenceSource,
  InvitationRecord,
  ObservationEvidenceLink,
  ObservationRecord,
  ProductionRepository,
  RespondentRecord,
  DeliverableRecord,
  DerivedDependencyReferenceRecord,
  ExecutionState,
  FindingRecord,
  InterventionRecord,
  RecommendationCandidateRecord,
  AssessmentRecord,
  AssessmentSnapshotRecord,
  FollowUpRecord,
  LearningCandidateRecord,
  ValidationCaseOutcome,
  ValidationRecord,
  ValidationRequirementCaseRecord,
  ValidationRequirementRecord,
  ValidationRequirementStatus,
  ValidationStatus,
} from "./puertos";

export const KNOWLEDGE_VERSION_MISMATCH = "KNOWLEDGE_VERSION_MISMATCH" as const;
export const OUT_OF_ASSIGNMENT_SCOPE = "OUT_OF_ASSIGNMENT_SCOPE" as const;
export const RESPONDENT_WITHOUT_ASSIGNMENT = "RESPONDENT_WITHOUT_ASSIGNMENT" as const;
export const FINDING_NOT_REVIEWED = "FINDING_NOT_REVIEWED" as const;
export const RECOMMENDATION_NOT_SELECTED = "RECOMMENDATION_NOT_SELECTED" as const;
export const SELECTION_REQUIRED = "SELECTION_REQUIRED" as const;
/** Razón única de severidad: no existe algoritmo aprobado. */
export const SEVERITY_NOT_EXPLICIT =
  "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER: no existe algoritmo de severidad ni de priority.";

export interface ProductionDeps {
  engine: KnowledgeEngine;
  repository: ProductionRepository;
  /** ID del registro knowledge_versions que respalda el pack cargado. */
  knowledgeVersionId: string;
  now?: () => string;
  /** Hash del token de invitación. El token en claro nunca se persiste. */
  hashToken?: (token: string) => string;
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
  /** Conflictos entre fuentes, con referencias y candidatos de aclaración. */
  contradictions: EvaluationResult["contradictions"];
  /** Requisitos de evidencia (E0–E3 como estados, nunca puntajes). */
  evidenceRequirements: EvaluationResult["evidenceRequirements"];
  needsReview: boolean;
  sufficiency: null;
  confidence: null;
  updatedAt: string;
}

export interface SubmitAcquisitionResponseInput {
  assessmentId: string;
  organizationId: string;
  submittedBy: string | null;
  /** Fuente humana. Cuando existe, se valida contra su Assignment Scope. */
  respondentId?: string | null;
  acquisitionId: string;
  knowledgeState: KnowledgeState;
  semanticValue?: string | null;
  notApplicableReason?: string | null;
  conflictingObservationIds?: string[];
  /** Entrada literal de la persona, preservada en la Response. */
  rawInput?: Record<string, unknown>;
  /** Evidencias que soportan la observación resultante. */
  evidenceIds?: string[];
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
  filas: ObservationRecord[],
  enlaces: ObservationEvidenceLink[] = [],
): EngineObservation[] {
  return filas.map((o) => {
    const evidenceIds = enlaces.filter((l) => l.observationId === o.id).map((l) => l.evidenceId);
    return {
      id: o.id,
      variableRef: o.variableRef,
      acquisitionRef: o.value.acquisitionRef,
      knowledgeState: o.value.knowledgeState,
      semanticValue: o.value.semanticValue,
      sourceResponseId: o.sourceResponseId,
      respondentId: o.respondentId ?? null,
      evidenceIds,
      notApplicableReason: o.value.notApplicableReason ?? null,
      ...(o.value.conflictingObservationIds
        ? { conflictingObservationIds: o.value.conflictingObservationIds }
        : {}),
      recordedAt: o.createdAt,
    };
  });
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
    contradictions: evaluation.contradictions,
    evidenceRequirements: evaluation.evidenceRequirements,
    needsReview: evaluation.needsReview,
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

async function observacionesDelEngine(deps: ProductionDeps, assessmentId: string) {
  const [filas, enlaces] = await Promise.all([
    deps.repository.listObservations(assessmentId),
    deps.repository.listEvidenceLinks(assessmentId),
  ]);
  return aEngineObservations(filas, enlaces);
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
  const observations = await observacionesDelEngine(deps, assessmentId);
  const responses = await deps.repository.listResponses(assessmentId);
  const evaluation = deps.engine.evaluate({
    observations,
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
  const observations = await observacionesDelEngine(deps, assessmentId);
  const evaluation = deps.engine.evaluate({
    observations,
    knowledgeVersionId: deps.knowledgeVersionId,
  });
  return deps.engine.getNextAcquisition(evaluation);
}

/** Adquisiciones de aclaración habilitadas por una contradicción (p. ej. P15). */
export async function getClarificationCandidates(
  deps: ProductionDeps,
  assessmentId: string,
): Promise<NextAcquisition[]> {
  const fijado = await assessmentFijado(deps, assessmentId);
  if (!fijado.ok) return [];
  const observations = await observacionesDelEngine(deps, assessmentId);
  const evaluation = deps.engine.evaluate({
    observations,
    knowledgeVersionId: deps.knowledgeVersionId,
  });
  return deps.engine.getClarificationCandidates(evaluation);
}

/* ------------------------------------------------------------------ */
/* Assignment Scope                                                    */
/* ------------------------------------------------------------------ */

/**
 * ¿El alcance de la asignación cubre esta adquisición?
 * Genérico: el alcance se compara contra referencias declaradas por el pack.
 */
export function assignmentCubreAdquisicion(
  assignment: Pick<AssignmentRecord, "scopeType" | "scopeRef">,
  acquisition: { id: string; informationNeedRef?: string; variableRefs: string[] },
  capability: { id: string; domainId: string },
): boolean {
  switch (assignment.scopeType) {
    case "DOMAIN":
      return assignment.scopeRef === capability.domainId;
    case "CAPABILITY":
      return assignment.scopeRef === capability.id;
    case "INFORMATION_NEED":
      return assignment.scopeRef === acquisition.informationNeedRef;
    case "SECTION":
      return (
        assignment.scopeRef === acquisition.id || acquisition.variableRefs.includes(assignment.scopeRef)
      );
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Evaluación (compartida por respuesta y evidencia)                   */
/* ------------------------------------------------------------------ */

async function ejecutarEvaluacion(
  deps: ProductionDeps,
  params: {
    assessmentId: string;
    organizationId: string;
    knowledgeVersionId: string;
    closedAt: string | null;
    trigger: EvaluationRunTrigger;
  },
) {
  const now = deps.now ?? ahoraPorDefecto;
  const run = await deps.repository.createEvaluationRun({
    organizationId: params.organizationId,
    assessmentId: params.assessmentId,
    knowledgeVersionId: params.knowledgeVersionId,
    engineVersion: deps.engine.engineVersion,
    trigger: params.trigger,
    status: "PROCESSING",
    startedAt: now(),
  });

  const observations = await observacionesDelEngine(deps, params.assessmentId);
  const evaluation = deps.engine.evaluate({
    observations,
    knowledgeVersionId: params.knowledgeVersionId,
  });

  await deps.repository.replaceVariableEvaluations(
    run.id,
    evaluation.variableEvaluations.map((v) => ({
      organizationId: params.organizationId,
      evaluationRunId: run.id,
      variableRef: v.variableRef,
      state: v.state,
      detail: { ...v.detail, semanticValue: v.semanticValue, traceability: evaluation.traceability },
    })),
  );

  await deps.repository.upsertInformationNeedStates(
    evaluation.informationNeedStates.map((n) => ({
      organizationId: params.organizationId,
      assessmentId: params.assessmentId,
      evaluationRunId: run.id,
      needRef: n.needRef,
      state: n.state,
      detail: { ...n.detail, traceability: evaluation.traceability },
    })),
  );

  // Juicios gobernados pendientes, contradicciones o requisitos de evidencia
  // condicionales sin fórmula → el run queda para revisión, no se infiere.
  const runCerrado = await deps.repository.completeEvaluationRun(
    run.id,
    evaluation.needsReview ? "NEEDS_REVIEW" : "PROCESSED",
    now(),
  );

  await materializarFindings(deps, {
    assessmentId: params.assessmentId,
    organizationId: params.organizationId,
    knowledgeVersionId: params.knowledgeVersionId,
    evaluationRunId: run.id,
    evaluation,
  });

  const responses = await deps.repository.listResponses(params.assessmentId);
  const state = construirEstado({
    assessmentId: params.assessmentId,
    capabilityId: deps.engine.pack.capability.id,
    knowledgeVersionId: params.knowledgeVersionId,
    engineVersion: deps.engine.engineVersion,
    evaluation,
    answeredAcquisitionIds: [...new Set(responses.map((r) => r.acquisitionRef))],
    totalAcquisitions: deps.engine.listAcquisitions().length,
    closedAt: params.closedAt,
    updatedAt: runCerrado.completedAt ?? now(),
  });

  return { run, evaluation, state };
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

  // Un respondent solo aporta dentro del alcance de su assignment.
  if (input.respondentId) {
    const asignaciones = (await deps.repository.listAssignments(input.assessmentId)).filter(
      (a) => a.respondentId === input.respondentId && a.status !== "REVOKED",
    );
    if (asignaciones.length === 0) {
      return { ...vacio, rejectionReason: RESPONDENT_WITHOUT_ASSIGNMENT };
    }
    const capability = deps.engine.pack.capability;
    const cubierta = asignaciones.some((a) =>
      assignmentCubreAdquisicion(
        a,
        {
          id: acquisition.id,
          ...(acquisition.informationNeedRef
            ? { informationNeedRef: acquisition.informationNeedRef }
            : {}),
          variableRefs: acquisition.variableRefs,
        },
        capability,
      ),
    );
    if (!cubierta) return { ...vacio, rejectionReason: OUT_OF_ASSIGNMENT_SCOPE };
  }

  // Una adquisición puede alimentar varias variables; el pack decide, no el código.
  const variableRef = acquisition.variableRefs[0]!;

  // 1. Response: preserva la entrada de la persona tal como fue aportada.
  const response = await deps.repository.insertResponse({
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    submittedBy: input.submittedBy,
    respondentId: input.respondentId ?? null,
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
    respondentId: input.respondentId ?? null,
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
    respondentId: input.respondentId ?? null,
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

  // 3. Evidencias que soportan la observación (lineage explícito).
  for (const evidenceId of input.evidenceIds ?? []) {
    await deps.repository.linkEvidenceToObservation({
      organizationId: input.organizationId,
      observationId: observation.id,
      evidenceId,
    });
  }

  // 4. EvaluationRun con lineage completo.
  const { run, state } = await ejecutarEvaluacion(deps, {
    assessmentId: input.assessmentId,
    organizationId: input.organizationId,
    knowledgeVersionId: fijado.assessment.knowledgeVersionId,
    closedAt: fijado.assessment.closedAt,
    trigger: "RESPONSE_ACCEPTED",
  });

  return {
    accepted: true,
    responseId: response.id,
    observationId: observation.id,
    evaluationRunId: run.id,
    state,
  };
}

/* ------------------------------------------------------------------ */
/* Diagnóstico colaborativo                                            */
/* ------------------------------------------------------------------ */

/** Respondent del propio usuario autenticado (no crea membership alguna). */
export async function asegurarRespondentDeUsuario(
  deps: ProductionDeps,
  params: { organizationId: string; userId: string; email?: string | null; displayName?: string | null },
): Promise<RespondentRecord> {
  const existente = await deps.repository.findRespondentByUserId(
    params.organizationId,
    params.userId,
  );
  if (existente) return existente;
  return deps.repository.insertRespondent({
    organizationId: params.organizationId,
    userId: params.userId,
    email: params.email ?? null,
    displayName: params.displayName ?? null,
    roleLabel: null,
    status: "ACTIVE",
  });
}

export interface InvitarRespondentInput {
  organizationId: string;
  assessmentId: string;
  email: string;
  displayName?: string | null;
  roleLabel?: string | null;
  scopeType: AssignmentScopeType;
  scopeRef: string;
  createdBy: string | null;
  /** Token en claro; solo se persiste su hash. */
  token: string;
  expiresAt?: string | null;
  /** Asignación de origen cuando esto es una delegación. */
  delegatedFromAssignmentId?: string | null;
  delegationReason?: string | null;
}

export interface InvitarRespondentOutput {
  respondent: RespondentRecord;
  assignment: AssignmentRecord;
  invitation: InvitationRecord;
}

/**
 * Invita/delegada a otra persona dentro de un alcance concreto.
 * El respondent invitado NO se convierte en miembro de la organización.
 */
export async function invitarRespondent(
  deps: ProductionDeps,
  input: InvitarRespondentInput,
): Promise<InvitarRespondentOutput> {
  if (!deps.hashToken) throw new Error("HASH_TOKEN_REQUIRED");
  const assessment = await deps.repository.getAssessment(input.assessmentId);
  if (!assessment) throw new Error("ASSESSMENT_NOT_FOUND");

  const existente = await deps.repository.findRespondentByEmail(input.organizationId, input.email);
  const respondent =
    existente ??
    (await deps.repository.insertRespondent({
      organizationId: input.organizationId,
      userId: null,
      email: input.email,
      displayName: input.displayName ?? null,
      roleLabel: input.roleLabel ?? null,
      status: "INVITED",
    }));

  const assignment = await deps.repository.insertAssignment({
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    respondentId: respondent.id,
    scopeType: input.scopeType,
    scopeRef: input.scopeRef,
    status: "PENDING",
    delegatedFromAssignmentId: input.delegatedFromAssignmentId ?? null,
    delegationReason: input.delegationReason ?? null,
  });

  // La asignación de origen queda marcada como delegada: la necesidad de
  // información sigue abierta, no se cierra por delegar.
  if (input.delegatedFromAssignmentId) {
    await deps.repository.updateAssignmentStatus(input.delegatedFromAssignmentId, "DELEGATED");
  }

  const invitation = await deps.repository.insertInvitation({
    organizationId: input.organizationId,
    respondentId: respondent.id,
    assignmentId: assignment.id,
    status: "PENDING",
    tokenHash: deps.hashToken(input.token),
    expiresAt: input.expiresAt ?? null,
  });

  return { respondent, assignment, invitation };
}

/* ------------------------------------------------------------------ */
/* Evidence Store                                                      */
/* ------------------------------------------------------------------ */

export interface RegistrarEvidenciaInput {
  organizationId: string;
  caseId: string;
  assessmentId: string;
  candidateRef?: string | null;
  evidenceType: string;
  source: EvidenceSource;
  storageBucket?: string | null;
  storagePath?: string | null;
  externalReference?: string | null;
  title?: string | null;
  note?: string | null;
  submittedBy: string | null;
  respondentId?: string | null;
  capturedAt?: string | null;
  /** Observaciones que esta evidencia soporta (puede ser más de una). */
  observationIds?: string[];
}

export interface RegistrarEvidenciaOutput {
  evidence: EvidenceRecord;
  links: ObservationEvidenceLink[];
  evaluationRunId: string | null;
  state: ProductionAssessmentState | null;
}

/**
 * Registra una evidencia y la vincula a las observaciones que soporta.
 * La nueva evaluación conserva el lineage: Response ≠ Evidence ≠ Observation.
 */
export async function registrarEvidencia(
  deps: ProductionDeps,
  input: RegistrarEvidenciaInput,
): Promise<RegistrarEvidenciaOutput> {
  const fijado = await assessmentFijado(deps, input.assessmentId);
  if (!fijado.ok) throw new Error(fijado.reason);

  const evidence = await deps.repository.insertEvidence({
    organizationId: input.organizationId,
    caseId: input.caseId,
    assessmentId: input.assessmentId,
    candidateRef: input.candidateRef ?? null,
    evidenceType: input.evidenceType,
    source: input.source,
    storageBucket: input.storageBucket ?? null,
    storagePath: input.storagePath ?? null,
    externalReference: input.externalReference ?? null,
    title: input.title ?? null,
    note: input.note ?? null,
    submittedBy: input.submittedBy,
    respondentId: input.respondentId ?? null,
    capturedAt: input.capturedAt ?? null,
  });

  const links: ObservationEvidenceLink[] = [];
  for (const observationId of input.observationIds ?? []) {
    links.push(
      await deps.repository.linkEvidenceToObservation({
        organizationId: input.organizationId,
        observationId,
        evidenceId: evidence.id,
      }),
    );
  }

  const { run, state } = await ejecutarEvaluacion(deps, {
    assessmentId: input.assessmentId,
    organizationId: input.organizationId,
    knowledgeVersionId: fijado.assessment.knowledgeVersionId,
    closedAt: fijado.assessment.closedAt,
    trigger: "EVIDENCE_ADDED",
  });

  return { evidence, links, evaluationRunId: run.id, state };
}

/* ------------------------------------------------------------------ */
/* Findings (M1-HIJ)                                                   */
/* ------------------------------------------------------------------ */

/**
 * Materializa los candidatos de finding producidos por el engine.
 *
 * INVARIANTES:
 * - Ningún finding se confirma automáticamente: un candidato derivado de una
 *   regla GOVERNED_JUDGMENT nace en NEEDS_REVIEW.
 * - Ningún finding se crea sin lineage completo (assessment, capability,
 *   KnowledgeVersion, pack+versión, engine, EvaluationRun, reglas, variables,
 *   observaciones y evidencias).
 * - Una reevaluación no borra el finding anterior: lo marca SUPERSEDED
 *   apuntando al nuevo, conservando el histórico.
 * - No se calcula severidad ni prioridad.
 */
async function materializarFindings(
  deps: ProductionDeps,
  params: {
    assessmentId: string;
    organizationId: string;
    knowledgeVersionId: string;
    evaluationRunId: string;
    evaluation: EvaluationResult;
  },
): Promise<FindingRecord[]> {
  const now = deps.now ?? ahoraPorDefecto;
  const assessment = await deps.repository.getAssessment(params.assessmentId);
  if (!assessment) return [];

  const previos = await deps.repository.listFindings(params.assessmentId);
  const links = await deps.repository.listEvidenceLinks(params.assessmentId);
  const creados: FindingRecord[] = [];

  for (const candidato of params.evaluation.findingCandidates) {
    const anterior = previos.find(
      (f) =>
        f.findingRef === candidato.findingRef &&
        f.supersededByFindingId === null &&
        f.lifecycleState !== "DISMISSED" &&
        f.lifecycleState !== "SUPERSEDED",
    );
    // Sin cambio de run no hay nada que rehacer: se conserva la revisión humana.
    if (anterior && anterior.evaluationRunId === params.evaluationRunId) continue;

    const finding = await deps.repository.insertFinding({
      organizationId: params.organizationId,
      caseId: assessment.caseId,
      assessmentId: params.assessmentId,
      evaluationRunId: params.evaluationRunId,
      knowledgeVersionId: params.knowledgeVersionId,
      capabilityId: params.evaluation.traceability.capabilityId,
      findingRef: candidato.findingRef,
      polarity: candidato.polarity,
      // El engine nunca entrega CONFIRMED: la confirmación es humana y gobernada.
      lifecycleState: candidato.lifecycleState,
      severityQualitative: candidato.severity.state,
      severityReason: candidato.severity.reason,
      knowledgePackId: params.evaluation.traceability.knowledgePackId,
      knowledgePackVersion: params.evaluation.traceability.knowledgePackVersion,
      engineVersion: params.evaluation.traceability.engineVersion,
      ruleRefs: candidato.ruleRefs,
      variableRefs: candidato.variableRefs,
      detail: {
        name: candidato.name,
        reason: candidato.reason,
        deterministicallyConfirmable: candidato.deterministicallyConfirmable,
        traceability: params.evaluation.traceability,
      },
      supersededByFindingId: null,
      reviewedBy: null,
      reviewedAt: null,
    });

    for (const observationId of candidato.supportingObservationIds) {
      await deps.repository.linkFindingObservation({
        organizationId: params.organizationId,
        findingId: finding.id,
        observationId,
      });
    }
    const evidencias = new Set([
      ...candidato.supportingEvidenceIds,
      ...links
        .filter((l) => candidato.supportingObservationIds.includes(l.observationId))
        .map((l) => l.evidenceId),
    ]);
    for (const evidenceId of evidencias) {
      await deps.repository.linkFindingEvidence({
        organizationId: params.organizationId,
        findingId: finding.id,
        evidenceId,
      });
    }

    if (anterior) {
      await deps.repository.updateFinding(anterior.id, {
        lifecycleState: "SUPERSEDED",
        supersededByFindingId: finding.id,
      });
      await deps.repository.insertAuditEvent({
        organizationId: params.organizationId,
        assessmentId: params.assessmentId,
        eventType: "FINDING_SUPERSEDED",
        subjectTable: "findings",
        subjectId: anterior.id,
        actorUserId: null,
        detail: { supersededByFindingId: finding.id },
      });
    }

    await deps.repository.insertAuditEvent({
      organizationId: params.organizationId,
      assessmentId: params.assessmentId,
      eventType: "FINDING_CREATED",
      subjectTable: "findings",
      subjectId: finding.id,
      actorUserId: null,
      detail: {
        findingRef: finding.findingRef,
        lifecycleState: finding.lifecycleState,
        evaluationRunId: params.evaluationRunId,
        createdAt: now(),
      },
    });

    creados.push(finding);
  }

  // Referencias cruzadas declarativas: nunca ejecutan la capacidad destino.
  const existentes = await deps.repository.listDerivedDependencyReferences(params.assessmentId);
  for (const ref of params.evaluation.derivedDependencyReferences) {
    const yaEsta = existentes.some(
      (d) =>
        d.cause === ref.cause &&
        d.targetCapabilityId === ref.targetCapabilityId &&
        d.targetDomainId === ref.targetDomainId,
    );
    if (yaEsta) continue;
    await deps.repository.insertDerivedDependencyReference({
      organizationId: params.organizationId,
      assessmentId: params.assessmentId,
      findingId: null,
      cause: ref.cause,
      sourceCapabilityId: ref.sourceCapabilityId,
      targetCapabilityId: ref.targetCapabilityId,
      targetDomainId: ref.targetDomainId,
      executable: false,
      note: ref.note,
    });
  }

  return creados;
}

export async function listFindings(
  deps: ProductionDeps,
  assessmentId: string,
): Promise<FindingRecord[]> {
  return deps.repository.listFindings(assessmentId);
}

export async function listDerivedDependencyReferences(
  deps: ProductionDeps,
  assessmentId: string,
): Promise<DerivedDependencyReferenceRecord[]> {
  return deps.repository.listDerivedDependencyReferences(assessmentId);
}

export type FindingReviewDecision = "NEEDS_REVIEW" | "CONFIRMED" | "DISMISSED";

export interface RevisarFindingInput {
  findingId: string;
  decision: FindingReviewDecision;
  reviewedBy: string | null;
  /** Severidad cualitativa cuando la persona la establece. Jamás numérica. */
  severityQualitative?: string | null;
  note?: string | null;
}

/**
 * Transición de lifecycle decidida por una persona con membresía.
 * La confirmación de un finding que depende de juicio gobernado solo puede
 * provenir de esta acción humana registrada, nunca del engine.
 */
export async function revisarFinding(
  deps: ProductionDeps,
  input: RevisarFindingInput,
): Promise<{ accepted: boolean; rejectionReason?: string; finding: FindingRecord | null }> {
  const now = deps.now ?? ahoraPorDefecto;
  const actual = await deps.repository.getFinding(input.findingId);
  if (!actual) return { accepted: false, rejectionReason: "FINDING_NOT_FOUND", finding: null };
  if (actual.lifecycleState === "SUPERSEDED") {
    return { accepted: false, rejectionReason: "FINDING_SUPERSEDED", finding: actual };
  }

  const finding = await deps.repository.updateFinding(input.findingId, {
    lifecycleState: input.decision,
    reviewedBy: input.reviewedBy,
    reviewedAt: now(),
    // La severidad sigue cualitativa: si no se aporta, permanece sin resolver.
    ...(input.severityQualitative !== undefined
      ? { severityQualitative: input.severityQualitative, severityReason: SEVERITY_NOT_EXPLICIT }
      : {}),
  });

  await deps.repository.insertAuditEvent({
    organizationId: finding.organizationId,
    assessmentId: finding.assessmentId,
    eventType:
      input.decision === "CONFIRMED"
        ? "FINDING_CONFIRMED"
        : input.decision === "DISMISSED"
          ? "FINDING_DISMISSED"
          : "FINDING_REVIEWED",
    subjectTable: "findings",
    subjectId: finding.id,
    actorUserId: input.reviewedBy,
    detail: { decision: input.decision, note: input.note ?? null },
  });

  return { accepted: true, finding };
}

/* ------------------------------------------------------------------ */
/* Recommendation Candidates (≠ Finding, ≠ Intervention)               */
/* ------------------------------------------------------------------ */

export interface RegistrarRecommendationCandidateInput {
  assessmentId: string;
  organizationId: string;
  recommendationRef: string;
  /** Opcional: un finding revisado o confirmado como origen del candidato. */
  findingId?: string | null;
  createdBy: string | null;
}

/**
 * Registra un RecommendationCandidate. No se genera automáticamente desde un
 * finding: el mapeo Finding→Recommendation no está gobernado (KCC-AT04-11).
 */
export async function registrarRecommendationCandidate(
  deps: ProductionDeps,
  input: RegistrarRecommendationCandidateInput,
): Promise<{ accepted: boolean; rejectionReason?: string; candidate: RecommendationCandidateRecord | null }> {
  const assessment = await deps.repository.getAssessment(input.assessmentId);
  if (!assessment) return { accepted: false, rejectionReason: "ASSESSMENT_NOT_FOUND", candidate: null };

  const identidades = deps.engine.getRecommendationCandidates();
  const identidad = identidades.find((r) => r.recommendationRef === input.recommendationRef);
  if (!identidad) {
    return { accepted: false, rejectionReason: "RECOMMENDATION_NOT_IN_KNOWLEDGE", candidate: null };
  }

  if (input.findingId) {
    const finding = await deps.repository.getFinding(input.findingId);
    if (!finding) return { accepted: false, rejectionReason: "FINDING_NOT_FOUND", candidate: null };
    // Un candidato solo se asocia a un finding ya revisado por una persona.
    if (finding.lifecycleState !== "CONFIRMED" && finding.reviewedAt === null) {
      return { accepted: false, rejectionReason: FINDING_NOT_REVIEWED, candidate: null };
    }
  }

  const candidate = await deps.repository.insertRecommendationCandidate({
    organizationId: input.organizationId,
    caseId: assessment.caseId,
    assessmentId: input.assessmentId,
    findingId: input.findingId ?? null,
    recommendationRef: identidad.recommendationRef,
    contentStatus: identidad.contentStatus,
    mappingStatus: identidad.mappingStatus,
    title: identidad.title,
    status: "CANDIDATE",
    decidedBy: null,
    decidedAt: null,
    decisionNote: null,
    detail: { reason: identidad.reason, automatable: identidad.automatable },
  });

  return { accepted: true, candidate };
}

export async function listRecommendationCandidates(
  deps: ProductionDeps,
  assessmentId: string,
): Promise<RecommendationCandidateRecord[]> {
  return deps.repository.listRecommendationCandidates(assessmentId);
}

export async function decidirRecommendationCandidate(
  deps: ProductionDeps,
  input: {
    recommendationCandidateId: string;
    decision: "SELECTED" | "REJECTED";
    decidedBy: string | null;
    note?: string | null;
  },
): Promise<{ accepted: boolean; rejectionReason?: string; candidate: RecommendationCandidateRecord | null }> {
  const now = deps.now ?? ahoraPorDefecto;
  const actual = await deps.repository.getRecommendationCandidate(input.recommendationCandidateId);
  if (!actual) return { accepted: false, rejectionReason: "RECOMMENDATION_NOT_FOUND", candidate: null };

  const candidate = await deps.repository.updateRecommendationCandidate(actual.id, {
    status: input.decision,
    decidedBy: input.decidedBy,
    decidedAt: now(),
    decisionNote: input.note ?? null,
  });

  await deps.repository.insertAuditEvent({
    organizationId: candidate.organizationId,
    assessmentId: candidate.assessmentId,
    eventType: input.decision === "SELECTED" ? "RECOMMENDATION_SELECTED" : "RECOMMENDATION_REJECTED",
    subjectTable: "recommendation_candidates",
    subjectId: candidate.id,
    actorUserId: input.decidedBy,
    detail: { note: input.note ?? null },
  });

  return { accepted: true, candidate };
}

/* ------------------------------------------------------------------ */
/* Intervention / Activity / Deliverable                               */
/* ------------------------------------------------------------------ */

export interface CrearIntervencionInput {
  assessmentId: string;
  organizationId: string;
  title: string;
  recommendationCandidateId?: string | null;
  findingId?: string | null;
  selectionNote?: string | null;
  createdBy: string | null;
}

/**
 * Una Intervention es una decisión de ejecución dentro del Case y es un objeto
 * distinto del RecommendationCandidate. Sin automatismo gobernado (el principio
 * Minimum Sufficient Intervention no es fórmula), exige selección explícita.
 */
export async function crearIntervencion(
  deps: ProductionDeps,
  input: CrearIntervencionInput,
): Promise<{ accepted: boolean; rejectionReason?: string; intervention: InterventionRecord | null }> {
  const now = deps.now ?? ahoraPorDefecto;
  const assessment = await deps.repository.getAssessment(input.assessmentId);
  if (!assessment) return { accepted: false, rejectionReason: "ASSESSMENT_NOT_FOUND", intervention: null };

  const principio = deps.engine.getInterventionPrinciple();
  const automatizable = principio?.automatable === true;

  if (input.recommendationCandidateId) {
    const candidato = await deps.repository.getRecommendationCandidate(input.recommendationCandidateId);
    if (!candidato) {
      return { accepted: false, rejectionReason: "RECOMMENDATION_NOT_FOUND", intervention: null };
    }
    // Sin automatismo gobernado, la recomendación debe haberse seleccionado.
    if (!automatizable && candidato.status !== "SELECTED") {
      return { accepted: false, rejectionReason: RECOMMENDATION_NOT_SELECTED, intervention: null };
    }
  } else if (!automatizable && !input.selectionNote) {
    // Selección humana registrada obligatoria cuando no hay recomendación.
    return { accepted: false, rejectionReason: SELECTION_REQUIRED, intervention: null };
  }

  const intervention = await deps.repository.insertIntervention({
    organizationId: input.organizationId,
    caseId: assessment.caseId,
    assessmentId: input.assessmentId,
    recommendationCandidateId: input.recommendationCandidateId ?? null,
    findingId: input.findingId ?? null,
    title: input.title,
    status: "PROPOSED",
    selectionNote: input.selectionNote ?? null,
    acceptedBy: input.createdBy,
    acceptedAt: now(),
  });

  await deps.repository.insertAuditEvent({
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    eventType: "INTERVENTION_CREATED",
    subjectTable: "interventions",
    subjectId: intervention.id,
    actorUserId: input.createdBy,
    detail: {
      recommendationCandidateId: intervention.recommendationCandidateId,
      findingId: intervention.findingId,
      principle: principio?.id ?? null,
      principleFormula: principio?.formula ?? null,
    },
  });

  return { accepted: true, intervention };
}

export async function listInterventions(
  deps: ProductionDeps,
  assessmentId: string,
): Promise<InterventionRecord[]> {
  return deps.repository.listInterventions(assessmentId);
}

export interface CrearActividadInput {
  interventionId: string;
  organizationId: string;
  title: string;
  /** Identidad A01–A09 cuando la persona la elige; el mapeo no es automático. */
  activityRef?: string | null;
  createdBy: string | null;
}

/** Una Activity siempre pertenece a una Intervention. */
export async function crearActividad(
  deps: ProductionDeps,
  input: CrearActividadInput,
): Promise<{ accepted: boolean; rejectionReason?: string; activity: ActivityRecord | null }> {
  const intervention = await deps.repository.getIntervention(input.interventionId);
  if (!intervention) {
    return { accepted: false, rejectionReason: "INTERVENTION_NOT_FOUND", activity: null };
  }

  const identidades = deps.engine.listActivityIdentities();
  const identidad = input.activityRef
    ? identidades.find((a) => a.activityRef === input.activityRef)
    : null;
  if (input.activityRef && !identidad) {
    return { accepted: false, rejectionReason: "ACTIVITY_NOT_IN_KNOWLEDGE", activity: null };
  }

  const activity = await deps.repository.insertActivity({
    organizationId: input.organizationId,
    interventionId: intervention.id,
    activityRef: identidad?.activityRef ?? null,
    contentStatus: identidad?.contentStatus ?? "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
    mappingStatus: identidad?.mappingStatus ?? "NOT_GOVERNED",
    title: input.title,
    state: "PENDING",
    // Done es un hecho posterior y explícito: nunca se presume al crear.
    doneAt: null,
    doneBy: null,
  });

  await deps.repository.insertAuditEvent({
    organizationId: input.organizationId,
    assessmentId: intervention.assessmentId,
    eventType: "ACTIVITY_STATE_CHANGED",
    subjectTable: "activities",
    subjectId: activity.id,
    actorUserId: input.createdBy,
    detail: { from: null, to: activity.state },
  });

  return { accepted: true, activity };
}

export async function listActivities(
  deps: ProductionDeps,
  interventionId: string,
): Promise<ActivityRecord[]> {
  return deps.repository.listActivities(interventionId);
}

/**
 * Estado mínimo de ejecución: PENDING, EXECUTING, DELIVERABLE_PRODUCED.
 * VALIDATED / FOLLOW_UP / CONSOLIDATED pertenecen a M1-KL y no existen aquí.
 */
export async function cambiarEstadoActividad(
  deps: ProductionDeps,
  input: { activityId: string; state: ExecutionState; actorUserId: string | null },
): Promise<{ accepted: boolean; rejectionReason?: string; activity: ActivityRecord | null }> {
  const actual = await deps.repository.getActivity(input.activityId);
  if (!actual) return { accepted: false, rejectionReason: "ACTIVITY_NOT_FOUND", activity: null };
  const intervention = await deps.repository.getIntervention(actual.interventionId);

  const activity = await deps.repository.updateActivityState(actual.id, input.state);
  await deps.repository.insertAuditEvent({
    organizationId: activity.organizationId,
    assessmentId: intervention?.assessmentId ?? null,
    eventType: "ACTIVITY_STATE_CHANGED",
    subjectTable: "activities",
    subjectId: activity.id,
    actorUserId: input.actorUserId,
    detail: { from: actual.state, to: activity.state },
  });
  return { accepted: true, activity };
}

export interface RegistrarEntregableInput {
  activityId: string;
  organizationId: string;
  title: string;
  note?: string | null;
  evidenceId?: string | null;
  registeredBy: string | null;
}

/**
 * Activity ≠ Deliverable ≠ Done: registrar un entregable mueve la actividad a
 * DELIVERABLE_PRODUCED y NUNCA a un estado de validación (CRV es M1-KL).
 */
export async function registrarEntregable(
  deps: ProductionDeps,
  input: RegistrarEntregableInput,
): Promise<{
  accepted: boolean;
  rejectionReason?: string;
  deliverable: DeliverableRecord | null;
  activity: ActivityRecord | null;
}> {
  const now = deps.now ?? ahoraPorDefecto;
  const actividad = await deps.repository.getActivity(input.activityId);
  if (!actividad) {
    return { accepted: false, rejectionReason: "ACTIVITY_NOT_FOUND", deliverable: null, activity: null };
  }
  const intervention = await deps.repository.getIntervention(actividad.interventionId);

  const deliverable = await deps.repository.insertDeliverable({
    organizationId: input.organizationId,
    activityId: actividad.id,
    evidenceId: input.evidenceId ?? null,
    title: input.title,
    note: input.note ?? null,
    registeredBy: input.registeredBy,
    registeredAt: now(),
  });

  const activity = await deps.repository.updateActivityState(actividad.id, "DELIVERABLE_PRODUCED");

  await deps.repository.insertAuditEvent({
    organizationId: input.organizationId,
    assessmentId: intervention?.assessmentId ?? null,
    eventType: "DELIVERABLE_REGISTERED",
    subjectTable: "deliverables",
    subjectId: deliverable.id,
    actorUserId: input.registeredBy,
    detail: {
      activityId: activity.id,
      activityState: activity.state,
      // Invariante explícita: producir un entregable no valida nada.
      validated: false,
      validationNote: "La validación (CRV) no pertenece a esta etapa.",
    },
  });

  return { accepted: true, deliverable, activity };
}

export async function listDeliverables(
  deps: ProductionDeps,
  activityId: string,
): Promise<DeliverableRecord[]> {
  return deps.repository.listDeliverables(activityId);
}

/* ================================================================== */
/* M1-KL · CRV · Validation · Follow-up · Reassessment                 */
/* ================================================================== */

/** Una Activity sin CRV explícito queda como gap trazable, nunca validada. */
export const VALIDATION_REQUIREMENT_NOT_EXPLICIT = "VALIDATION_REQUIREMENT_NOT_EXPLICIT" as const;
export const DELIVERABLE_REQUIRED_BEFORE_DONE = "DELIVERABLE_REQUIRED_BEFORE_DONE" as const;
export const ACTIVITY_NOT_DONE = "ACTIVITY_NOT_DONE" as const;
export const VALIDATION_NOT_GOVERNED = "VALIDATION_NOT_GOVERNED" as const;
/** Aportar Evidence ≠ validar: validar exige membresía en la organización. */
export const VALIDATION_PERMISSION_REQUIRED = "VALIDATION_PERMISSION_REQUIRED" as const;
export const VALIDATION_NOT_VALIDATED = "VALIDATION_NOT_VALIDATED" as const;

/**
 * Done es un hecho explícito y posterior al Deliverable.
 * Deliverable ≠ Done, y Done ≠ Validation: no dispara ninguna validación.
 */
export async function marcarActividadDone(
  deps: ProductionDeps,
  input: { activityId: string; actorUserId: string | null },
): Promise<{ accepted: boolean; rejectionReason?: string; activity: ActivityRecord | null }> {
  const now = deps.now ?? ahoraPorDefecto;
  const actividad = await deps.repository.getActivity(input.activityId);
  if (!actividad) return { accepted: false, rejectionReason: "ACTIVITY_NOT_FOUND", activity: null };
  if (actividad.state === "PENDING" || actividad.state === "EXECUTING") {
    return { accepted: false, rejectionReason: DELIVERABLE_REQUIRED_BEFORE_DONE, activity: actividad };
  }
  const intervention = await deps.repository.getIntervention(actividad.interventionId);
  const activity = await deps.repository.markActivityDone(actividad.id, now(), input.actorUserId);

  await deps.repository.insertAuditEvent({
    organizationId: activity.organizationId,
    assessmentId: intervention?.assessmentId ?? null,
    eventType: "ACTIVITY_MARKED_DONE",
    subjectTable: "activities",
    subjectId: activity.id,
    actorUserId: input.actorUserId,
    // Invariante explícita: Done no implica validación.
    detail: { doneAt: activity.doneAt, validated: false },
  });

  return { accepted: true, activity };
}

/**
 * Registra el CRV de una Activity tal como lo enuncia el Knowledge Master.
 * Cuando no existe CRV explícito, se registra el gap y NO se inventa uno.
 */
export async function registrarRequisitoValidacion(
  deps: ProductionDeps,
  input: {
    activityId: string;
    primaryExecutorRespondentId?: string | null;
    createdBy: string | null;
  },
): Promise<{
  accepted: boolean;
  rejectionReason?: string;
  requirement: ValidationRequirementRecord | null;
}> {
  const actividad = await deps.repository.getActivity(input.activityId);
  if (!actividad) return { accepted: false, rejectionReason: "ACTIVITY_NOT_FOUND", requirement: null };
  const intervention = await deps.repository.getIntervention(actividad.interventionId);
  if (!intervention) {
    return { accepted: false, rejectionReason: "INTERVENTION_NOT_FOUND", requirement: null };
  }
  const assessment = await deps.repository.getAssessment(intervention.assessmentId);
  if (!assessment) return { accepted: false, rejectionReason: "ASSESSMENT_NOT_FOUND", requirement: null };

  const existentes = await deps.repository.listValidationRequirements(intervention.id);
  const yaRegistrado = existentes.find((r) => r.activityId === actividad.id);
  if (yaRegistrado) return { accepted: true, requirement: yaRegistrado };

  const gobernado = deps.engine.getValidationRequirementForActivity(actividad.activityRef);

  const requirement = await deps.repository.insertValidationRequirement({
    organizationId: actividad.organizationId,
    caseId: assessment.caseId,
    assessmentId: assessment.id,
    interventionId: intervention.id,
    activityId: actividad.id,
    knowledgeVersionId: assessment.knowledgeVersionId,
    knowledgePackId: deps.engine.pack.packId,
    knowledgePackVersion: deps.engine.pack.packVersion,
    engineVersion: deps.engine.engineVersion,
    requirementRef: gobernado?.requirementRef ?? null,
    activityRef: actividad.activityRef,
    definition: gobernado?.definition ?? VALIDATION_REQUIREMENT_NOT_EXPLICIT,
    definitionSource: gobernado?.definitionSource ?? VALIDATION_REQUIREMENT_NOT_EXPLICIT,
    status: gobernado ? "PENDING" : VALIDATION_REQUIREMENT_NOT_EXPLICIT,
    primaryExecutorRespondentId: input.primaryExecutorRespondentId ?? null,
    requiredCaseCount: gobernado?.requiredCaseCount ?? null,
    detail: gobernado
      ? { conditions: gobernado.conditions, isScore: false }
      : { gap: VALIDATION_REQUIREMENT_NOT_EXPLICIT },
    createdBy: input.createdBy,
  });

  await deps.repository.insertAuditEvent({
    organizationId: requirement.organizationId,
    assessmentId: assessment.id,
    eventType: "VALIDATION_REQUIREMENT_REGISTERED",
    subjectTable: "validation_requirements",
    subjectId: requirement.id,
    actorUserId: input.createdBy,
    detail: { status: requirement.status, activityRef: requirement.activityRef },
  });

  return { accepted: true, requirement };
}

export interface EvaluacionCrv {
  satisfied: boolean;
  status: ValidationRequirementStatus;
  metConditionIds: string[];
  unmetConditionIds: string[];
  reason: string;
  consecutiveCorrectCount: number;
  requiredCaseCount: number | null;
  /** Invariante: un CRV no es un KPI ni un maturity score. */
  score: null;
}

function evaluacionNoExplicita(): EvaluacionCrv {
  return {
    satisfied: false,
    status: VALIDATION_REQUIREMENT_NOT_EXPLICIT,
    metConditionIds: [],
    unmetConditionIds: [],
    reason: VALIDATION_REQUIREMENT_NOT_EXPLICIT,
    consecutiveCorrectCount: 0,
    requiredCaseCount: null,
    score: null,
  };
}

/** Evalúa el CRV con las condiciones conjuntas declaradas por el pack. */
export async function evaluarRequisitoValidacion(
  deps: ProductionDeps,
  validationRequirementId: string,
): Promise<EvaluacionCrv> {
  const requirement = await deps.repository.getValidationRequirement(validationRequirementId);
  if (!requirement || !requirement.requirementRef) return evaluacionNoExplicita();

  const casos = await deps.repository.listValidationRequirementCases(requirement.id);
  const evaluacion = deps.engine.evaluateValidationRequirement(requirement.requirementRef, {
    primaryExecutorRespondentId: requirement.primaryExecutorRespondentId,
    cases: casos.map((c) => ({
      sequenceIndex: c.sequenceIndex,
      executorRespondentId: c.executorRespondentId,
      outcome: c.outcome,
      criticalAssistance: c.criticalAssistance,
    })),
  });

  return {
    satisfied: evaluacion.satisfied,
    status:
      evaluacion.status === "SATISFIED"
        ? "SATISFIED"
        : evaluacion.status === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : "NOT_SATISFIED",
    metConditionIds: evaluacion.metConditionIds,
    unmetConditionIds: evaluacion.unmetConditionIds,
    reason: evaluacion.reason,
    consecutiveCorrectCount: evaluacion.consecutiveCorrectCount,
    requiredCaseCount: evaluacion.requiredCaseCount,
    score: null,
  };
}

/** Registra una ejecución concreta contra el CRV, con su evidencia. */
export async function registrarCasoValidacion(
  deps: ProductionDeps,
  input: {
    validationRequirementId: string;
    executorRespondentId: string;
    outcome: ValidationCaseOutcome;
    criticalAssistance: boolean;
    evidenceId?: string | null;
    note?: string | null;
    occurredAt?: string;
    registeredBy: string | null;
  },
): Promise<{
  accepted: boolean;
  rejectionReason?: string;
  case: ValidationRequirementCaseRecord | null;
  evaluation: EvaluacionCrv;
}> {
  const now = deps.now ?? ahoraPorDefecto;
  const requirement = await deps.repository.getValidationRequirement(input.validationRequirementId);
  if (!requirement) {
    return {
      accepted: false,
      rejectionReason: "VALIDATION_REQUIREMENT_NOT_FOUND",
      case: null,
      evaluation: evaluacionNoExplicita(),
    };
  }
  if (requirement.status === VALIDATION_REQUIREMENT_NOT_EXPLICIT) {
    return {
      accepted: false,
      rejectionReason: VALIDATION_REQUIREMENT_NOT_EXPLICIT,
      case: null,
      evaluation: evaluacionNoExplicita(),
    };
  }

  const previos = await deps.repository.listValidationRequirementCases(requirement.id);
  const registrado = await deps.repository.insertValidationRequirementCase({
    organizationId: requirement.organizationId,
    validationRequirementId: requirement.id,
    sequenceIndex: previos.length + 1,
    executorRespondentId: input.executorRespondentId,
    outcome: input.outcome,
    criticalAssistance: input.criticalAssistance,
    evidenceId: input.evidenceId ?? null,
    note: input.note ?? null,
    occurredAt: input.occurredAt ?? now(),
    registeredBy: input.registeredBy,
  });

  const evaluation = await evaluarRequisitoValidacion(deps, requirement.id);
  await deps.repository.updateValidationRequirementStatus(requirement.id, evaluation.status);

  await deps.repository.insertAuditEvent({
    organizationId: requirement.organizationId,
    assessmentId: requirement.assessmentId,
    eventType: "VALIDATION_CASE_REGISTERED",
    subjectTable: "validation_requirement_cases",
    subjectId: registrado.id,
    actorUserId: input.registeredBy,
    detail: {
      sequenceIndex: registrado.sequenceIndex,
      outcome: registrado.outcome,
      criticalAssistance: registrado.criticalAssistance,
      crvStatus: evaluation.status,
    },
  });

  return { accepted: true, case: registrado, evaluation };
}

/**
 * Abre o actualiza la Validation de una Activity.
 * Nunca valida automáticamente cuando el requisito no está gobernado, y exige
 * que la actividad esté Done: Deliverable ≠ Done ≠ Validation.
 */
export async function abrirValidacion(
  deps: ProductionDeps,
  input: { activityId: string; actorUserId: string | null; evidenceIds?: string[] },
): Promise<{
  accepted: boolean;
  rejectionReason?: string;
  validation: ValidationRecord | null;
  evaluation: EvaluacionCrv;
}> {
  const actividad = await deps.repository.getActivity(input.activityId);
  if (!actividad) {
    return { accepted: false, rejectionReason: "ACTIVITY_NOT_FOUND", validation: null, evaluation: evaluacionNoExplicita() };
  }
  if (!actividad.doneAt) {
    return { accepted: false, rejectionReason: ACTIVITY_NOT_DONE, validation: null, evaluation: evaluacionNoExplicita() };
  }
  const intervention = await deps.repository.getIntervention(actividad.interventionId);
  if (!intervention) {
    return { accepted: false, rejectionReason: "INTERVENTION_NOT_FOUND", validation: null, evaluation: evaluacionNoExplicita() };
  }
  const assessment = await deps.repository.getAssessment(intervention.assessmentId);
  if (!assessment) {
    return { accepted: false, rejectionReason: "ASSESSMENT_NOT_FOUND", validation: null, evaluation: evaluacionNoExplicita() };
  }

  const requisitos = await deps.repository.listValidationRequirements(intervention.id);
  const requirement = requisitos.find((r) => r.activityId === actividad.id) ?? null;
  const evaluation = requirement
    ? await evaluarRequisitoValidacion(deps, requirement.id)
    : evaluacionNoExplicita();

  const estado: ValidationStatus =
    evaluation.status === VALIDATION_REQUIREMENT_NOT_EXPLICIT
      ? "PENDING"
      : evaluation.satisfied
        ? "IN_REVIEW"
        : "INSUFFICIENT_EVIDENCE";

  const validation = await deps.repository.insertValidation({
    organizationId: actividad.organizationId,
    caseId: assessment.caseId,
    assessmentId: assessment.id,
    interventionId: intervention.id,
    activityId: actividad.id,
    validationRequirementId: requirement?.id ?? null,
    evaluationRunId: null,
    knowledgeVersionId: assessment.knowledgeVersionId,
    engineVersion: deps.engine.engineVersion,
    status: estado,
    decisionReason: evaluation.reason,
    reviewedBy: null,
    reviewedAt: null,
    detail: {
      crvStatus: evaluation.status,
      metConditionIds: evaluation.metConditionIds,
      unmetConditionIds: evaluation.unmetConditionIds,
      // Nunca derivado de scoring ni del MVP.
      score: null,
    },
  });

  for (const evidenceId of input.evidenceIds ?? []) {
    await deps.repository.linkValidationEvidence({
      organizationId: actividad.organizationId,
      validationId: validation.id,
      evidenceId,
    });
  }

  return { accepted: true, validation, evaluation };
}

/**
 * Decisión humana de Validation. VALIDATED exige CRV explícito y satisfecho:
 * sin requisito gobernado no hay validación automática ni manual encubierta.
 */
export async function decidirValidacion(
  deps: ProductionDeps,
  input: {
    validationId: string;
    decision: ValidationStatus;
    reason?: string | null;
    reviewedBy: string;
    evidenceIds?: string[];
  },
): Promise<{ accepted: boolean; rejectionReason?: string; validation: ValidationRecord | null }> {
  const now = deps.now ?? ahoraPorDefecto;
  const actual = await deps.repository.getValidation(input.validationId);
  if (!actual) return { accepted: false, rejectionReason: "VALIDATION_NOT_FOUND", validation: null };

  // Aportar evidencia ≠ validar: validar exige membresía en la organización.
  const rol = await deps.repository.getMembershipRole(actual.organizationId, input.reviewedBy);
  if (!rol) {
    return { accepted: false, rejectionReason: VALIDATION_PERMISSION_REQUIRED, validation: actual };
  }

  const evaluation = actual.validationRequirementId
    ? await evaluarRequisitoValidacion(deps, actual.validationRequirementId)
    : evaluacionNoExplicita();

  if (input.decision === "VALIDATED" && !evaluation.satisfied) {
    return { accepted: false, rejectionReason: VALIDATION_NOT_GOVERNED, validation: actual };
  }

  for (const evidenceId of input.evidenceIds ?? []) {
    await deps.repository.linkValidationEvidence({
      organizationId: actual.organizationId,
      validationId: actual.id,
      evidenceId,
    });
  }

  const validation = await deps.repository.updateValidation(actual.id, {
    status: input.decision,
    decisionReason: input.reason ?? evaluation.reason,
    reviewedBy: input.reviewedBy,
    reviewedAt: now(),
  });

  if (input.decision === "VALIDATED" && validation.activityId) {
    await deps.repository.updateActivityState(validation.activityId, "VALIDATED");
  }

  await deps.repository.insertAuditEvent({
    organizationId: validation.organizationId,
    assessmentId: validation.assessmentId,
    eventType: "VALIDATION_DECIDED",
    subjectTable: "validations",
    subjectId: validation.id,
    actorUserId: input.reviewedBy,
    detail: { status: validation.status, crvStatus: evaluation.status, reviewerRole: rol },
  });

  return { accepted: true, validation };
}

export async function listValidations(
  deps: ProductionDeps,
  assessmentId: string,
): Promise<ValidationRecord[]> {
  return deps.repository.listValidations(assessmentId);
}

/** Follow-up solo existe sobre una Validation VALIDATED (provenance). */
export async function iniciarFollowUp(
  deps: ProductionDeps,
  input: { validationId: string; actorUserId: string | null; note?: string | null },
): Promise<{ accepted: boolean; rejectionReason?: string; followUp: FollowUpRecord | null }> {
  const validation = await deps.repository.getValidation(input.validationId);
  if (!validation) return { accepted: false, rejectionReason: "VALIDATION_NOT_FOUND", followUp: null };
  if (validation.status !== "VALIDATED" || !validation.activityId) {
    return { accepted: false, rejectionReason: VALIDATION_NOT_VALIDATED, followUp: null };
  }

  const followUp = await deps.repository.insertFollowUp({
    organizationId: validation.organizationId,
    caseId: validation.caseId,
    activityId: validation.activityId,
    validationId: validation.id,
    status: "OPEN",
    note: input.note ?? null,
    evidenceId: null,
    decidedBy: null,
    decidedAt: null,
  });

  await deps.repository.updateActivityState(validation.activityId, "FOLLOW_UP");
  await deps.repository.insertAuditEvent({
    organizationId: validation.organizationId,
    assessmentId: validation.assessmentId,
    eventType: "FOLLOW_UP_STARTED",
    subjectTable: "follow_ups",
    subjectId: followUp.id,
    actorUserId: input.actorUserId,
    detail: { validationId: validation.id },
  });

  return { accepted: true, followUp };
}

/**
 * Consolidated / Needs adjustment dependen del seguimiento con provenance:
 * exigen decisor registrado y evidencia o nota explicativa.
 */
export async function decidirFollowUp(
  deps: ProductionDeps,
  input: {
    followUpId: string;
    outcome: "CONSOLIDATED" | "NEEDS_ADJUSTMENT";
    note?: string | null;
    evidenceId?: string | null;
    decidedBy: string;
  },
): Promise<{ accepted: boolean; rejectionReason?: string; followUp: FollowUpRecord | null }> {
  const now = deps.now ?? ahoraPorDefecto;
  const actual = await deps.repository.getFollowUp(input.followUpId);
  if (!actual) return { accepted: false, rejectionReason: "FOLLOW_UP_NOT_FOUND", followUp: null };

  const rol = await deps.repository.getMembershipRole(actual.organizationId, input.decidedBy);
  if (!rol) return { accepted: false, rejectionReason: VALIDATION_PERMISSION_REQUIRED, followUp: actual };
  if (!input.evidenceId && !input.note) {
    return { accepted: false, rejectionReason: "FOLLOW_UP_PROVENANCE_REQUIRED", followUp: actual };
  }

  const followUp = await deps.repository.updateFollowUp(actual.id, {
    status: input.outcome,
    note: input.note ?? actual.note,
    evidenceId: input.evidenceId ?? actual.evidenceId,
    decidedBy: input.decidedBy,
    decidedAt: now(),
  });

  await deps.repository.updateActivityState(followUp.activityId, input.outcome);
  await deps.repository.insertAuditEvent({
    organizationId: followUp.organizationId,
    assessmentId: null,
    eventType: "FOLLOW_UP_DECIDED",
    subjectTable: "follow_ups",
    subjectId: followUp.id,
    actorUserId: input.decidedBy,
    detail: { outcome: followUp.status, evidenceId: followUp.evidenceId },
  });

  return { accepted: true, followUp };
}

/**
 * Reassessment: nuevo Assessment del mismo Case, pinneado a una
 * KnowledgeVersion explícita. No sobrescribe nada del Baseline.
 */
export async function iniciarReassessment(
  deps: ProductionDeps,
  input: {
    baselineAssessmentId: string;
    knowledgeVersionId?: string;
    actorUserId: string | null;
    snapshotReason?: string;
  },
): Promise<{
  accepted: boolean;
  rejectionReason?: string;
  assessment: AssessmentRecord | null;
  evaluationRunId: string | null;
  snapshot: AssessmentSnapshotRecord | null;
}> {
  const now = deps.now ?? ahoraPorDefecto;
  const baseline = await deps.repository.getAssessment(input.baselineAssessmentId);
  if (!baseline) {
    return { accepted: false, rejectionReason: "ASSESSMENT_NOT_FOUND", assessment: null, evaluationRunId: null, snapshot: null };
  }

  // Reproducibilidad histórica: se preserva el estado del Baseline tal cual.
  const runsBaseline = await deps.repository.listEvaluationRuns(baseline.id);
  const observacionesBaseline = await deps.repository.listObservations(baseline.id);
  const findingsBaseline = await deps.repository.listFindings(baseline.id);
  const snapshot = await deps.repository.insertAssessmentSnapshot({
    organizationId: baseline.organizationId,
    caseId: baseline.caseId,
    assessmentId: baseline.id,
    knowledgeVersionId: baseline.knowledgeVersionId,
    engineVersion: deps.engine.engineVersion,
    reason: input.snapshotReason ?? "REASSESSMENT_STARTED",
    payload: {
      observations: observacionesBaseline.map((o) => ({
        variableRef: o.variableRef,
        value: o.value,
        respondentId: o.respondentId,
      })),
      evaluationRunIds: runsBaseline.map((r) => r.id),
      findingRefs: findingsBaseline.map((f) => f.findingRef),
    },
    createdBy: input.actorUserId,
  });

  const assessment = await deps.repository.insertAssessment({
    organizationId: baseline.organizationId,
    caseId: baseline.caseId,
    // Pinning explícito: nunca se recalcula un histórico con otra versión.
    knowledgeVersionId: input.knowledgeVersionId ?? deps.knowledgeVersionId,
    type: "REASSESSMENT",
    startedAt: now(),
    closedAt: null,
  });

  const run = await deps.repository.createEvaluationRun({
    organizationId: assessment.organizationId,
    assessmentId: assessment.id,
    knowledgeVersionId: assessment.knowledgeVersionId,
    engineVersion: deps.engine.engineVersion,
    trigger: "REASSESSMENT_STARTED",
    status: "PENDING",
    startedAt: now(),
  });

  await deps.repository.insertAuditEvent({
    organizationId: assessment.organizationId,
    assessmentId: assessment.id,
    eventType: "REASSESSMENT_STARTED",
    subjectTable: "assessments",
    subjectId: assessment.id,
    actorUserId: input.actorUserId,
    detail: {
      baselineAssessmentId: baseline.id,
      baselineKnowledgeVersionId: baseline.knowledgeVersionId,
      reassessmentKnowledgeVersionId: assessment.knowledgeVersionId,
      snapshotId: snapshot.id,
    },
  });

  return { accepted: true, assessment, evaluationRunId: run.id, snapshot };
}

export interface ComparacionAssessments {
  baseline: { assessmentId: string; knowledgeVersionId: string; type: AssessmentRecord["type"] };
  reassessment: { assessmentId: string; knowledgeVersionId: string; type: AssessmentRecord["type"] };
  variableComparisons: {
    variableRef: string;
    baselineState: string | null;
    currentState: string | null;
    transition: string;
    improvement: null;
    interpretation: string;
  }[];
  findings: { baselineCount: number; reassessmentCount: number; supersededCount: number };
  validations: { baselineCount: number; reassessmentCount: number };
  /** Invariantes: la comparación no produce puntaje ni juicio de mejora. */
  maturityScore: null;
  improvement: null;
}

async function estadosDeVariables(
  deps: ProductionDeps,
  assessmentId: string,
): Promise<{ variableRef: string; state: string }[]> {
  const runs = await deps.repository.listEvaluationRuns(assessmentId);
  const ultimo = runs.at(-1);
  if (!ultimo) return [];
  const filas = await deps.repository.listVariableEvaluations(ultimo.id);
  return filas.map((f) => ({ variableRef: f.variableRef, state: f.state }));
}

/**
 * Comparación Baseline vs Reassessment: expone cambios de estados gobernados.
 * UNKNOWN→KNOWN es más información; CONTRADICTORY→KNOWN es contradicción
 * resuelta. Ninguna transición se etiqueta como mejora empresarial.
 */
export async function compararAssessments(
  deps: ProductionDeps,
  input: { baselineAssessmentId: string; reassessmentAssessmentId: string },
): Promise<{ accepted: boolean; rejectionReason?: string; comparison: ComparacionAssessments | null }> {
  const baseline = await deps.repository.getAssessment(input.baselineAssessmentId);
  const actual = await deps.repository.getAssessment(input.reassessmentAssessmentId);
  if (!baseline || !actual) {
    return { accepted: false, rejectionReason: "ASSESSMENT_NOT_FOUND", comparison: null };
  }
  if (baseline.caseId !== actual.caseId) {
    return { accepted: false, rejectionReason: "CASE_MISMATCH", comparison: null };
  }

  const comparaciones = deps.engine.compareVariableStates(
    await estadosDeVariables(deps, baseline.id),
    await estadosDeVariables(deps, actual.id),
  );

  const findingsBaseline = await deps.repository.listFindings(baseline.id);
  const findingsActuales = await deps.repository.listFindings(actual.id);
  const validacionesBaseline = await deps.repository.listValidations(baseline.id);
  const validacionesActuales = await deps.repository.listValidations(actual.id);

  return {
    accepted: true,
    comparison: {
      baseline: {
        assessmentId: baseline.id,
        knowledgeVersionId: baseline.knowledgeVersionId,
        type: baseline.type,
      },
      reassessment: {
        assessmentId: actual.id,
        knowledgeVersionId: actual.knowledgeVersionId,
        type: actual.type,
      },
      variableComparisons: comparaciones.map((c) => ({
        variableRef: c.variableRef,
        baselineState: c.baselineState,
        currentState: c.currentState,
        transition: c.transition,
        improvement: null,
        interpretation: c.interpretation,
      })),
      findings: {
        baselineCount: findingsBaseline.length,
        reassessmentCount: findingsActuales.length,
        supersededCount: findingsBaseline.filter((f) => f.supersededByFindingId !== null).length,
      },
      validations: {
        baselineCount: validacionesBaseline.length,
        reassessmentCount: validacionesActuales.length,
      },
      maturityScore: null,
      improvement: null,
    },
  };
}

/**
 * LearningCandidate ≠ Master Knowledge: se registra como candidato y NUNCA
 * modifica el Knowledge Pack publicado (no hay auto-learning).
 */
export async function registrarCandidatoAprendizaje(
  deps: ProductionDeps,
  input: {
    organizationId: string;
    caseId: string;
    assessmentId?: string | null;
    validationId?: string | null;
    sourceTable: string;
    sourceId?: string | null;
    statement: string;
    createdBy: string | null;
  },
): Promise<LearningCandidateRecord> {
  const candidato = await deps.repository.insertLearningCandidate({
    organizationId: input.organizationId,
    caseId: input.caseId,
    assessmentId: input.assessmentId ?? null,
    validationId: input.validationId ?? null,
    knowledgeVersionId: deps.knowledgeVersionId,
    sourceTable: input.sourceTable,
    sourceId: input.sourceId ?? null,
    statement: input.statement,
    status: "CANDIDATE",
    appliedToMaster: false,
    detail: { packId: deps.engine.pack.packId, packVersion: deps.engine.pack.packVersion },
    createdBy: input.createdBy,
  });

  await deps.repository.insertAuditEvent({
    organizationId: input.organizationId,
    assessmentId: input.assessmentId ?? null,
    eventType: "LEARNING_CANDIDATE_CREATED",
    subjectTable: "learning_candidates",
    subjectId: candidato.id,
    actorUserId: input.createdBy,
    detail: { appliedToMaster: false },
  });

  return candidato;
}
