/**
 * Puertos de persistencia del vertical productivo (M1-D · ampliado en M1-EFG).
 *
 * Define la frontera entre el caso de uso y el almacenamiento. No contiene
 * SQL, ni cliente Supabase, ni conocimiento de ninguna capacidad: el pack
 * gobierna el contenido y el engine la evaluación.
 *
 * Lineage estricto: Response ≠ Evidence ≠ Observation ≠ Evaluation.
 * Identidades separadas: User ≠ Membership ≠ Respondent.
 */
import type { KnowledgeState } from "@pymapa/knowledge-engine";

export interface AssessmentRecord {
  id: string;
  organizationId: string;
  caseId: string;
  /** KnowledgeVersion fijada al Assessment. Nunca se recalcula contra otra. */
  knowledgeVersionId: string;
  type: "BASELINE" | "REASSESSMENT" | "FOLLOW_UP";
  startedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
}

export interface ResponseRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  submittedBy: string | null;
  /** Fuente humana declarada; puede no ser miembro de la organización. */
  respondentId?: string | null;
  /** Referencia de adquisición del pack, p. ej. "OP01-P01". */
  acquisitionRef: string;
  /** Entrada aportada por la persona, preservada tal cual. */
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ObservationRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  /** Trazabilidad opcional hacia la Response de origen. */
  sourceResponseId: string | null;
  /** Fuente humana que la originó, cuando se conoce. */
  respondentId?: string | null;
  variableRef: string;
  value: {
    knowledgeState: KnowledgeState;
    semanticValue: string | null;
    acquisitionRef: string;
    notApplicableReason?: string | null;
    conflictingObservationIds?: string[];
  };
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Diagnóstico colaborativo                                            */
/* ------------------------------------------------------------------ */

export type RespondentStatus = "INVITED" | "ACTIVE" | "REVOKED";

export interface RespondentRecord {
  id: string;
  organizationId: string;
  /** null cuando la persona aún no tiene cuenta: Respondent ≠ User. */
  userId: string | null;
  email: string | null;
  displayName: string | null;
  roleLabel: string | null;
  status: RespondentStatus;
  createdAt: string;
}

export type AssignmentScopeType = "DOMAIN" | "CAPABILITY" | "INFORMATION_NEED" | "SECTION";

export type AssignmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELEGATED"
  | "REVOKED";

export interface AssignmentRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  respondentId: string;
  scopeType: AssignmentScopeType;
  /** Referencia gobernada del alcance: capacidad, necesidad, dominio o sección. */
  scopeRef: string;
  status: AssignmentStatus;
  delegatedFromAssignmentId: string | null;
  delegationReason: string | null;
  createdAt: string;
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface InvitationRecord {
  id: string;
  organizationId: string;
  respondentId: string;
  assignmentId: string | null;
  status: InvitationStatus;
  /** Solo el hash del token: el token en claro nunca se persiste. */
  tokenHash: string;
  expiresAt: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Evidence Store                                                      */
/* ------------------------------------------------------------------ */

export type EvidenceSource =
  | "HUMAN_RESPONDENT"
  | "DOCUMENT"
  | "SYSTEM_RECORD"
  | "OBSERVED_EXECUTION";

export interface EvidenceRecord {
  id: string;
  organizationId: string;
  caseId: string;
  assessmentId: string;
  /** Candidato gobernado del pack (p. ej. OP01-EV01) o null. */
  candidateRef: string | null;
  evidenceType: string;
  source: EvidenceSource;
  /** Referencia a storage; los archivos nunca se guardan en la base de datos. */
  storageBucket: string | null;
  storagePath: string | null;
  externalReference: string | null;
  title: string | null;
  note: string | null;
  submittedBy: string | null;
  respondentId: string | null;
  capturedAt: string | null;
  createdAt: string;
}

/** Vínculo Evidence ↔ Observation. Una evidencia puede soportar varias. */
export interface ObservationEvidenceLink {
  id: string;
  organizationId: string;
  observationId: string;
  evidenceId: string;
  createdAt: string;
}

export type EvaluationRunTrigger =
  | "RESPONSE_ACCEPTED"
  | "EVIDENCE_ADDED"
  | "OBSERVATION_UPDATED"
  | "CONTRADICTION_RESOLVED"
  | "MANUAL_REEVALUATION"
  | "REASSESSMENT_STARTED"
  | "VALIDATION_COMPLETED";

export type EvaluationRunStatus =
  | "PENDING"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"
  | "NEEDS_REVIEW";

export interface EvaluationRunRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  knowledgeVersionId: string;
  engineVersion: string;
  trigger: EvaluationRunTrigger;
  status: EvaluationRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface VariableEvaluationRecord {
  id: string;
  organizationId: string;
  evaluationRunId: string;
  variableRef: string;
  state: string;
  detail: Record<string, unknown> | null;
}

export interface InformationNeedStateRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  evaluationRunId: string | null;
  needRef: string;
  state: string;
  detail: Record<string, unknown> | null;
}


/* ------------------------------------------------------------------ */
/* Findings y preparación de ejecución (M1-HIJ)                        */
/* ------------------------------------------------------------------ */

export type FindingPolarity = "ADVERSE" | "STRENGTH";

export type FindingLifecycleState =
  | "CANDIDATE"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "SUPERSEDED"
  | "DISMISSED";

/** Un Finding sin lineage no existe: todas estas referencias son obligatorias. */
export interface FindingRecord {
  id: string;
  organizationId: string;
  caseId: string;
  assessmentId: string;
  evaluationRunId: string;
  knowledgeVersionId: string;
  capabilityId: string;
  findingRef: string;
  polarity: FindingPolarity;
  lifecycleState: FindingLifecycleState;
  /** Cualitativa cuando el material la soporta; nunca numérica. */
  severityQualitative: string | null;
  severityReason: string;
  knowledgePackId: string;
  knowledgePackVersion: string;
  engineVersion: string;
  ruleRefs: string[];
  variableRefs: string[];
  detail: Record<string, unknown> | null;
  supersededByFindingId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface FindingObservationLink {
  id: string;
  organizationId: string;
  findingId: string;
  observationId: string;
}

export interface FindingEvidenceLink {
  id: string;
  organizationId: string;
  findingId: string;
  evidenceId: string;
}

/** Referencia a otra capacidad. NUNCA ejecuta la capacidad destino. */
export interface DerivedDependencyReferenceRecord {
  id: string;
  organizationId: string;
  assessmentId: string;
  findingId: string | null;
  cause: string;
  sourceCapabilityId: string;
  targetCapabilityId: string | null;
  targetDomainId: string | null;
  executable: false;
  note: string | null;
  createdAt: string;
}

export type RecommendationSelectionStatus = "CANDIDATE" | "SELECTED" | "REJECTED";

/** Recommendation Candidate ≠ Finding ≠ Intervention. */
export interface RecommendationCandidateRecord {
  id: string;
  organizationId: string;
  caseId: string;
  assessmentId: string;
  findingId: string | null;
  recommendationRef: string;
  contentStatus: string;
  mappingStatus: string;
  title: string | null;
  status: RecommendationSelectionStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export type InterventionStatus = "PROPOSED" | "ACCEPTED" | "IN_EXECUTION";

/** Decisión de ejecución dentro de un Case. */
export interface InterventionRecord {
  id: string;
  organizationId: string;
  caseId: string;
  assessmentId: string;
  recommendationCandidateId: string | null;
  findingId: string | null;
  title: string;
  status: InterventionStatus;
  selectionNote: string | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

/**
 * Ciclo de ejecución y seguimiento (M1-KL).
 * Deliverable produced ≠ Done ≠ Validated: cada transición es un acto distinto
 * con provenance propio. CONSOLIDATED / NEEDS_ADJUSTMENT solo pueden alcanzarse
 * con una Validation registrada y un Follow-up decidido.
 */
export type ExecutionState =
  | "PENDING"
  | "EXECUTING"
  | "DELIVERABLE_PRODUCED"
  | "VALIDATED"
  | "FOLLOW_UP"
  | "CONSOLIDATED"
  | "NEEDS_ADJUSTMENT";

/** Estados que una persona puede fijar manualmente (sin validación). */
export type ManualExecutionState = "PENDING" | "EXECUTING" | "DELIVERABLE_PRODUCED";

export interface ActivityRecord {
  id: string;
  organizationId: string;
  interventionId: string;
  activityRef: string | null;
  contentStatus: string;
  mappingStatus: string;
  title: string;
  state: ExecutionState;
  /** Done: marca de ejecución terminada. NO implica validación. */
  doneAt: string | null;
  doneBy: string | null;
  createdAt: string;
}

/** Activity ≠ Deliverable ≠ Done. */
export interface DeliverableRecord {
  id: string;
  organizationId: string;
  activityId: string;
  evidenceId: string | null;
  title: string;
  note: string | null;
  registeredBy: string | null;
  registeredAt: string;
  createdAt: string;
}

export type AuditEventType =
  | "FINDING_CREATED"
  | "FINDING_REVIEWED"
  | "FINDING_CONFIRMED"
  | "FINDING_DISMISSED"
  | "FINDING_SUPERSEDED"
  | "RECOMMENDATION_SELECTED"
  | "RECOMMENDATION_REJECTED"
  | "INTERVENTION_CREATED"
  | "ACTIVITY_STATE_CHANGED"
  | "DELIVERABLE_REGISTERED"
  | "ACTIVITY_MARKED_DONE"
  | "VALIDATION_REQUIREMENT_REGISTERED"
  | "VALIDATION_CASE_REGISTERED"
  | "VALIDATION_DECIDED"
  | "FOLLOW_UP_STARTED"
  | "FOLLOW_UP_DECIDED"
  | "REASSESSMENT_STARTED"
  | "SNAPSHOT_CREATED"
  | "LEARNING_CANDIDATE_CREATED";

/* ------------------------------------------------------------------ */
/* CRV / Validation / Follow-up / Learning (M1-KL)                     */
/* ------------------------------------------------------------------ */

export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER";

/**
 * Estado de un ValidationRequirement (CRV).
 * VALIDATION_REQUIREMENT_NOT_EXPLICIT es un gap de conocimiento trazable:
 * jamás se inventa un CRV para una Activity que no lo tiene aprobado.
 */
export type ValidationRequirementStatus =
  | "VALIDATION_REQUIREMENT_NOT_EXPLICIT"
  | "PENDING"
  | "IN_PROGRESS"
  | "SATISFIED"
  | "NOT_SATISFIED";

/** CRV: requisito de validación gobernado. No es un KPI ni un score. */
export interface ValidationRequirementRecord {
  id: string;
  organizationId: string;
  caseId: string;
  assessmentId: string;
  interventionId: string;
  activityId: string | null;
  knowledgeVersionId: string;
  knowledgePackId: string;
  knowledgePackVersion: string;
  engineVersion: string;
  requirementRef: string | null;
  activityRef: string | null;
  /** Enunciado literal aprobado, sin reinterpretación. */
  definition: string;
  definitionSource: string;
  status: ValidationRequirementStatus;
  /** Ejecutor original: el "segundo ejecutor" debe ser distinto de éste. */
  primaryExecutorRespondentId: string | null;
  requiredCaseCount: number | null;
  detail: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
}

export type ValidationCaseOutcome = "CORRECT" | "INCORRECT";

/** Ejecución concreta registrada contra un CRV, con su evidencia. */
export interface ValidationRequirementCaseRecord {
  id: string;
  organizationId: string;
  validationRequirementId: string;
  sequenceIndex: number;
  executorRespondentId: string;
  outcome: ValidationCaseOutcome;
  criticalAssistance: boolean;
  evidenceId: string | null;
  note: string | null;
  occurredAt: string;
  registeredBy: string | null;
  createdAt: string;
}

export type ValidationStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "VALIDATED"
  | "NOT_VALIDATED"
  | "INSUFFICIENT_EVIDENCE";

/** Validation ≠ Done ≠ Deliverable. Siempre con lineage y decisión humana. */
export interface ValidationRecord {
  id: string;
  organizationId: string;
  caseId: string;
  assessmentId: string;
  interventionId: string;
  activityId: string | null;
  validationRequirementId: string | null;
  evaluationRunId: string | null;
  knowledgeVersionId: string;
  engineVersion: string;
  status: ValidationStatus;
  decisionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface ValidationEvidenceLink {
  id: string;
  organizationId: string;
  validationId: string;
  evidenceId: string;
  createdAt: string;
}

export type FollowUpOutcome = "OPEN" | "CONSOLIDATED" | "NEEDS_ADJUSTMENT";

/** Follow-up: solo existe sobre una Validation registrada (provenance). */
export interface FollowUpRecord {
  id: string;
  organizationId: string;
  caseId: string;
  activityId: string;
  validationId: string;
  status: FollowUpOutcome;
  note: string | null;
  evidenceId: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

/** LearningCandidate ≠ Master Knowledge: nunca se aplica automáticamente. */
export interface LearningCandidateRecord {
  id: string;
  organizationId: string;
  caseId: string;
  assessmentId: string | null;
  validationId: string | null;
  knowledgeVersionId: string;
  sourceTable: string;
  sourceId: string | null;
  statement: string;
  status: string;
  appliedToMaster: false;
  detail: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
}

/** Snapshot puntual para reproducibilidad histórica. No es event sourcing. */
export interface AssessmentSnapshotRecord {
  id: string;
  organizationId: string;
  caseId: string;
  assessmentId: string;
  knowledgeVersionId: string;
  engineVersion: string;
  reason: string;
  payload: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
}

/** Registro de acciones relevantes. No es event sourcing. */
export interface AuditEventRecord {
  id: string;
  organizationId: string;
  assessmentId: string | null;
  eventType: AuditEventType;
  subjectTable: string;
  subjectId: string | null;
  actorUserId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

/** Puerto de persistencia. Toda escritura del vertical pasa por aquí. */
export interface ProductionRepository {
  getAssessment(assessmentId: string): Promise<AssessmentRecord | null>;
  insertResponse(input: Omit<ResponseRecord, "id" | "createdAt">): Promise<ResponseRecord>;
  insertObservation(input: Omit<ObservationRecord, "id" | "createdAt">): Promise<ObservationRecord>;
  listObservations(assessmentId: string): Promise<ObservationRecord[]>;
  listResponses(assessmentId: string): Promise<ResponseRecord[]>;
  createEvaluationRun(
    input: Omit<EvaluationRunRecord, "id" | "createdAt" | "completedAt">,
  ): Promise<EvaluationRunRecord>;
  completeEvaluationRun(
    runId: string,
    status: EvaluationRunStatus,
    completedAt: string,
  ): Promise<EvaluationRunRecord>;
  replaceVariableEvaluations(
    runId: string,
    rows: Omit<VariableEvaluationRecord, "id">[],
  ): Promise<VariableEvaluationRecord[]>;
  upsertInformationNeedStates(
    rows: Omit<InformationNeedStateRecord, "id">[],
  ): Promise<InformationNeedStateRecord[]>;
  listInformationNeedStates(assessmentId: string): Promise<InformationNeedStateRecord[]>;

  /* Colaborativo */
  insertRespondent(input: Omit<RespondentRecord, "id" | "createdAt">): Promise<RespondentRecord>;
  findRespondentByUserId(organizationId: string, userId: string): Promise<RespondentRecord | null>;
  findRespondentByEmail(organizationId: string, email: string): Promise<RespondentRecord | null>;
  getRespondent(respondentId: string): Promise<RespondentRecord | null>;
  listRespondents(organizationId: string): Promise<RespondentRecord[]>;
  insertAssignment(input: Omit<AssignmentRecord, "id" | "createdAt">): Promise<AssignmentRecord>;
  getAssignment(assignmentId: string): Promise<AssignmentRecord | null>;
  listAssignments(assessmentId: string): Promise<AssignmentRecord[]>;
  updateAssignmentStatus(assignmentId: string, status: AssignmentStatus): Promise<AssignmentRecord>;
  insertInvitation(input: Omit<InvitationRecord, "id" | "createdAt">): Promise<InvitationRecord>;
  listInvitations(organizationId: string): Promise<InvitationRecord[]>;

  /* Evidence Store */
  insertEvidence(input: Omit<EvidenceRecord, "id" | "createdAt">): Promise<EvidenceRecord>;
  listEvidence(assessmentId: string): Promise<EvidenceRecord[]>;
  linkEvidenceToObservation(
    input: Omit<ObservationEvidenceLink, "id" | "createdAt">,
  ): Promise<ObservationEvidenceLink>;
  listEvidenceLinks(assessmentId: string): Promise<ObservationEvidenceLink[]>;

  /* Findings y preparación de ejecución */
  insertFinding(input: Omit<FindingRecord, "id" | "createdAt">): Promise<FindingRecord>;
  getFinding(findingId: string): Promise<FindingRecord | null>;
  listFindings(assessmentId: string): Promise<FindingRecord[]>;
  updateFinding(
    findingId: string,
    patch: Partial<
      Pick<
        FindingRecord,
        "lifecycleState" | "severityQualitative" | "severityReason" | "supersededByFindingId" | "reviewedBy" | "reviewedAt"
      >
    >,
  ): Promise<FindingRecord>;
  linkFindingObservation(input: Omit<FindingObservationLink, "id">): Promise<FindingObservationLink>;
  linkFindingEvidence(input: Omit<FindingEvidenceLink, "id">): Promise<FindingEvidenceLink>;
  listFindingObservationLinks(findingId: string): Promise<FindingObservationLink[]>;
  listFindingEvidenceLinks(findingId: string): Promise<FindingEvidenceLink[]>;
  insertDerivedDependencyReference(
    input: Omit<DerivedDependencyReferenceRecord, "id" | "createdAt">,
  ): Promise<DerivedDependencyReferenceRecord>;
  listDerivedDependencyReferences(assessmentId: string): Promise<DerivedDependencyReferenceRecord[]>;
  insertRecommendationCandidate(
    input: Omit<RecommendationCandidateRecord, "id" | "createdAt">,
  ): Promise<RecommendationCandidateRecord>;
  getRecommendationCandidate(id: string): Promise<RecommendationCandidateRecord | null>;
  listRecommendationCandidates(assessmentId: string): Promise<RecommendationCandidateRecord[]>;
  updateRecommendationCandidate(
    id: string,
    patch: Partial<Pick<RecommendationCandidateRecord, "status" | "decidedBy" | "decidedAt" | "decisionNote">>,
  ): Promise<RecommendationCandidateRecord>;
  insertIntervention(input: Omit<InterventionRecord, "id" | "createdAt">): Promise<InterventionRecord>;
  getIntervention(id: string): Promise<InterventionRecord | null>;
  listInterventions(assessmentId: string): Promise<InterventionRecord[]>;
  insertActivity(input: Omit<ActivityRecord, "id" | "createdAt">): Promise<ActivityRecord>;
  getActivity(id: string): Promise<ActivityRecord | null>;
  listActivities(interventionId: string): Promise<ActivityRecord[]>;
  updateActivityState(id: string, state: ExecutionState): Promise<ActivityRecord>;
  insertDeliverable(input: Omit<DeliverableRecord, "id" | "createdAt">): Promise<DeliverableRecord>;
  listDeliverables(activityId: string): Promise<DeliverableRecord[]>;
  insertAuditEvent(input: Omit<AuditEventRecord, "id" | "createdAt">): Promise<AuditEventRecord>;
  listAuditEvents(organizationId: string): Promise<AuditEventRecord[]>;
}

/* ------------------------------------------------------------------ */
/* Implementación en memoria (pruebas / verificación del caso de uso)  */
/* ------------------------------------------------------------------ */

let contador = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${String(++contador).padStart(6, "0")}`;

export function createInMemoryProductionRepository(
  assessments: AssessmentRecord[],
): ProductionRepository & { readonly estado: Readonly<Record<string, unknown[]>> } {
  const mapaAssessments = new Map(assessments.map((a) => [a.id, a]));
  const responses: ResponseRecord[] = [];
  const observations: ObservationRecord[] = [];
  const runs: EvaluationRunRecord[] = [];
  const variableEvaluations: VariableEvaluationRecord[] = [];
  const needStates: InformationNeedStateRecord[] = [];
  const respondents: RespondentRecord[] = [];
  const assignments: AssignmentRecord[] = [];
  const invitations: InvitationRecord[] = [];
  const evidence: EvidenceRecord[] = [];
  const evidenceLinks: ObservationEvidenceLink[] = [];
  const findings: FindingRecord[] = [];
  const findingObservations: FindingObservationLink[] = [];
  const findingEvidence: FindingEvidenceLink[] = [];
  const dependencyReferences: DerivedDependencyReferenceRecord[] = [];
  const recommendations: RecommendationCandidateRecord[] = [];
  const interventions: InterventionRecord[] = [];
  const activities: ActivityRecord[] = [];
  const deliverables: DeliverableRecord[] = [];
  const auditEvents: AuditEventRecord[] = [];

  const assessmentIdsDe = (organizationOrAssessment: string) => organizationOrAssessment;

  return {
    estado: {
      responses,
      observations,
      runs,
      variableEvaluations,
      needStates,
      respondents,
      assignments,
      invitations,
      evidence,
      evidenceLinks,
      findings,
      findingObservations,
      findingEvidence,
      dependencyReferences,
      recommendations,
      interventions,
      activities,
      deliverables,
      auditEvents,
    },

    async getAssessment(assessmentId) {
      return mapaAssessments.get(assessmentId) ?? null;
    },
    async insertResponse(input) {
      const row: ResponseRecord = { ...input, id: nuevoId("res"), createdAt: new Date().toISOString() };
      responses.push(row);
      return row;
    },
    async insertObservation(input) {
      const row: ObservationRecord = { ...input, id: nuevoId("obs"), createdAt: new Date().toISOString() };
      observations.push(row);
      return row;
    },
    async listObservations(assessmentId) {
      return observations.filter((o) => o.assessmentId === assessmentId);
    },
    async listResponses(assessmentId) {
      return responses.filter((r) => r.assessmentId === assessmentId);
    },
    async createEvaluationRun(input) {
      const row: EvaluationRunRecord = {
        ...input,
        id: nuevoId("run"),
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      runs.push(row);
      return row;
    },
    async completeEvaluationRun(runId, status, completedAt) {
      const row = runs.find((r) => r.id === runId);
      if (!row) throw new Error(`evaluation_run inexistente: ${runId}`);
      row.status = status;
      row.completedAt = completedAt;
      return row;
    },
    async replaceVariableEvaluations(runId, rows) {
      for (let i = variableEvaluations.length - 1; i >= 0; i -= 1) {
        if (variableEvaluations[i]!.evaluationRunId === runId) variableEvaluations.splice(i, 1);
      }
      const insertadas = rows.map((r) => ({ ...r, id: nuevoId("var") }));
      variableEvaluations.push(...insertadas);
      return insertadas;
    },
    async upsertInformationNeedStates(rows) {
      const resultado: InformationNeedStateRecord[] = [];
      for (const fila of rows) {
        const existente = needStates.find(
          (n) => n.assessmentId === fila.assessmentId && n.needRef === fila.needRef,
        );
        if (existente) {
          Object.assign(existente, fila);
          resultado.push(existente);
        } else {
          const nueva = { ...fila, id: nuevoId("nis") };
          needStates.push(nueva);
          resultado.push(nueva);
        }
      }
      return resultado;
    },
    async listInformationNeedStates(assessmentId) {
      return needStates.filter((n) => n.assessmentId === assessmentId);
    },

    /* Colaborativo */
    async insertRespondent(input) {
      const row: RespondentRecord = { ...input, id: nuevoId("rsp"), createdAt: new Date().toISOString() };
      respondents.push(row);
      return row;
    },
    async findRespondentByUserId(organizationId, userId) {
      return (
        respondents.find((r) => r.organizationId === organizationId && r.userId === userId) ?? null
      );
    },
    async findRespondentByEmail(organizationId, email) {
      return (
        respondents.find(
          (r) =>
            r.organizationId === organizationId &&
            (r.email ?? "").toLowerCase() === email.toLowerCase(),
        ) ?? null
      );
    },
    async getRespondent(respondentId) {
      return respondents.find((r) => r.id === respondentId) ?? null;
    },
    async listRespondents(organizationId) {
      return respondents.filter((r) => r.organizationId === organizationId);
    },
    async insertAssignment(input) {
      const row: AssignmentRecord = { ...input, id: nuevoId("asg"), createdAt: new Date().toISOString() };
      assignments.push(row);
      return row;
    },
    async getAssignment(assignmentId) {
      return assignments.find((a) => a.id === assignmentId) ?? null;
    },
    async listAssignments(assessmentId) {
      return assignments.filter((a) => a.assessmentId === assessmentIdsDe(assessmentId));
    },
    async updateAssignmentStatus(assignmentId, status) {
      const row = assignments.find((a) => a.id === assignmentId);
      if (!row) throw new Error(`assignment inexistente: ${assignmentId}`);
      row.status = status;
      return row;
    },
    async insertInvitation(input) {
      const row: InvitationRecord = { ...input, id: nuevoId("inv"), createdAt: new Date().toISOString() };
      invitations.push(row);
      return row;
    },
    async listInvitations(organizationId) {
      return invitations.filter((i) => i.organizationId === organizationId);
    },

    /* Evidence Store */
    async insertEvidence(input) {
      const row: EvidenceRecord = { ...input, id: nuevoId("evi"), createdAt: new Date().toISOString() };
      evidence.push(row);
      return row;
    },
    async listEvidence(assessmentId) {
      return evidence.filter((e) => e.assessmentId === assessmentId);
    },
    async linkEvidenceToObservation(input) {
      const existente = evidenceLinks.find(
        (l) => l.observationId === input.observationId && l.evidenceId === input.evidenceId,
      );
      if (existente) return existente;
      const row: ObservationEvidenceLink = {
        ...input,
        id: nuevoId("oev"),
        createdAt: new Date().toISOString(),
      };
      evidenceLinks.push(row);
      return row;
    },
    async listEvidenceLinks(assessmentId) {
      const ids = new Set(observations.filter((o) => o.assessmentId === assessmentId).map((o) => o.id));
      return evidenceLinks.filter((l) => ids.has(l.observationId));
    },

    /* Findings y preparación de ejecución */
    async insertFinding(input) {
      const row: FindingRecord = { ...input, id: nuevoId("fnd"), createdAt: new Date().toISOString() };
      findings.push(row);
      return row;
    },
    async getFinding(findingId) {
      return findings.find((f) => f.id === findingId) ?? null;
    },
    async listFindings(assessmentId) {
      return findings.filter((f) => f.assessmentId === assessmentId);
    },
    async updateFinding(findingId, patch) {
      const row = findings.find((f) => f.id === findingId);
      if (!row) throw new Error(`finding inexistente: ${findingId}`);
      Object.assign(row, patch);
      return row;
    },
    async linkFindingObservation(input) {
      const existente = findingObservations.find(
        (l) => l.findingId === input.findingId && l.observationId === input.observationId,
      );
      if (existente) return existente;
      const row: FindingObservationLink = { ...input, id: nuevoId("fob") };
      findingObservations.push(row);
      return row;
    },
    async linkFindingEvidence(input) {
      const existente = findingEvidence.find(
        (l) => l.findingId === input.findingId && l.evidenceId === input.evidenceId,
      );
      if (existente) return existente;
      const row: FindingEvidenceLink = { ...input, id: nuevoId("fev") };
      findingEvidence.push(row);
      return row;
    },
    async listFindingObservationLinks(findingId) {
      return findingObservations.filter((l) => l.findingId === findingId);
    },
    async listFindingEvidenceLinks(findingId) {
      return findingEvidence.filter((l) => l.findingId === findingId);
    },
    async insertDerivedDependencyReference(input) {
      const row: DerivedDependencyReferenceRecord = {
        ...input,
        id: nuevoId("ddr"),
        createdAt: new Date().toISOString(),
      };
      dependencyReferences.push(row);
      return row;
    },
    async listDerivedDependencyReferences(assessmentId) {
      return dependencyReferences.filter((d) => d.assessmentId === assessmentId);
    },
    async insertRecommendationCandidate(input) {
      const row: RecommendationCandidateRecord = {
        ...input,
        id: nuevoId("rec"),
        createdAt: new Date().toISOString(),
      };
      recommendations.push(row);
      return row;
    },
    async getRecommendationCandidate(id) {
      return recommendations.find((r) => r.id === id) ?? null;
    },
    async listRecommendationCandidates(assessmentId) {
      return recommendations.filter((r) => r.assessmentId === assessmentId);
    },
    async updateRecommendationCandidate(id, patch) {
      const row = recommendations.find((r) => r.id === id);
      if (!row) throw new Error(`recommendation_candidate inexistente: ${id}`);
      Object.assign(row, patch);
      return row;
    },
    async insertIntervention(input) {
      const row: InterventionRecord = { ...input, id: nuevoId("itv"), createdAt: new Date().toISOString() };
      interventions.push(row);
      return row;
    },
    async getIntervention(id) {
      return interventions.find((i) => i.id === id) ?? null;
    },
    async listInterventions(assessmentId) {
      return interventions.filter((i) => i.assessmentId === assessmentId);
    },
    async insertActivity(input) {
      const row: ActivityRecord = { ...input, id: nuevoId("act"), createdAt: new Date().toISOString() };
      activities.push(row);
      return row;
    },
    async getActivity(id) {
      return activities.find((a) => a.id === id) ?? null;
    },
    async listActivities(interventionId) {
      return activities.filter((a) => a.interventionId === interventionId);
    },
    async updateActivityState(id, state) {
      const row = activities.find((a) => a.id === id);
      if (!row) throw new Error(`activity inexistente: ${id}`);
      row.state = state;
      return row;
    },
    async insertDeliverable(input) {
      const row: DeliverableRecord = { ...input, id: nuevoId("dlv"), createdAt: new Date().toISOString() };
      deliverables.push(row);
      return row;
    },
    async listDeliverables(activityId) {
      return deliverables.filter((d) => d.activityId === activityId);
    },
    async insertAuditEvent(input) {
      const row: AuditEventRecord = { ...input, id: nuevoId("aud"), createdAt: new Date().toISOString() };
      auditEvents.push(row);
      return row;
    },
    async listAuditEvents(organizationId) {
      return auditEvents.filter((a) => a.organizationId === organizationId);
    },
  };
}
