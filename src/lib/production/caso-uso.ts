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
