/**
 * AssessmentClient respaldado por el PRODUCTION_ENGINE (M1-D).
 *
 * Solo llama al application boundary (funciones de servidor). No importa el
 * Knowledge Engine, ni el Knowledge Pack, ni Supabase: la evaluación y el
 * conocimiento viven exclusivamente en el servidor.
 */
import type {
  AcquisitionQuestionDTO,
  AssessmentStateDTO,
  NextAcquisitionDTO,
  SubmitResponseCommand,
  SubmitResponseResult,
} from "@pymapa/contracts";
import {
  changeOp01ActivityState,
  createOp01Activity,
  createOp01Intervention,
  createOp01RecommendationCandidate,
  decideOp01Recommendation,
  getOp01AssessmentState,
  getOp01Collaboration,
  getOp01Findings,
  getOp01NextAcquisition,
  inviteOp01Respondent,
  registerOp01Deliverable,
  compareOp01Assessments,
  decideOp01FollowUp,
  decideOp01Validation,
  getOp01Validation,
  markOp01ActivityDone,
  openOp01Validation,
  registerOp01ValidationCase,
  registerOp01ValidationRequirement,
  startOp01FollowUp,
  startOp01Reassessment,
  registerOp01Evidence,
  reviewOp01Finding,
  submitOp01Response,
} from "@/lib/production/op01.functions";
import type { AssessmentClient } from "./assessment-client";

type CollaborationPayload = Awaited<ReturnType<typeof getOp01Collaboration>>;
type StatePayload = Awaited<ReturnType<typeof getOp01AssessmentState>>["state"];
type FindingsPayload = Awaited<ReturnType<typeof getOp01Findings>>;
type ValidationPayload = Awaited<ReturnType<typeof getOp01Validation>>;
type ComparisonPayload = Awaited<ReturnType<typeof compareOp01Assessments>>;

export interface ReviewFindingInput {
  findingId: string;
  decision: "NEEDS_REVIEW" | "CONFIRMED" | "DISMISSED";
  /** Cualitativa. No hay severidad numérica ni prioridad calculada. */
  severityQualitative?: string | null;
  note?: string | null;
}

export interface InterventionInput {
  title: string;
  recommendationCandidateId?: string | null;
  findingId?: string | null;
  selectionNote?: string | null;
}

export interface ActivityInput {
  interventionId: string;
  title: string;
  activityRef?: string | null;
}

export interface DeliverableInput {
  activityId: string;
  title: string;
  note?: string | null;
  evidenceId?: string | null;
}

export type ResultadoAccion = { accepted: boolean; rejectionReason: string | null };

export interface InviteInput {
  email: string;
  displayName?: string | null;
  roleLabel?: string | null;
  scopeType: "DOMAIN" | "CAPABILITY" | "INFORMATION_NEED" | "SECTION";
  scopeRef: string;
  delegatedFromAssignmentId?: string | null;
  delegationReason?: string | null;
}

export interface EvidenceInput {
  candidateRef?: string | null;
  evidenceType: string;
  source: "HUMAN_RESPONDENT" | "DOCUMENT" | "SYSTEM_RECORD" | "OBSERVED_EXECUTION";
  storageBucket?: string | null;
  storagePath?: string | null;
  externalReference?: string | null;
  title?: string | null;
  note?: string | null;
  observationIds?: string[];
}

/**
 * Cliente extendido: adquisición adaptativa, contexto colaborativo y evidencia.
 * Todo llega del servidor; el frontend no interpreta conocimiento.
 */
export interface ProductionAssessmentClient extends AssessmentClient {
  getNextAcquisitionQuestion(assessmentId: string): Promise<AcquisitionQuestionDTO | null>;
  /** Estado detallado tal como lo devuelve el boundary (sin reinterpretación). */
  getAssessmentDetail(): Promise<StatePayload>;
  getCollaboration(): Promise<CollaborationPayload>;
  inviteRespondent(input: InviteInput): Promise<{ respondentId: string; assignmentId: string }>;
  registerEvidence(input: EvidenceInput): Promise<{ evidenceId: string; linkedObservationIds: string[] }>;
  /** Findings, referencias cruzadas, recomendaciones e intervenciones. */
  getFindings(): Promise<FindingsPayload>;
  reviewFinding(input: ReviewFindingInput): Promise<ResultadoAccion>;
  createRecommendationCandidate(input: {
    recommendationRef: string;
    findingId?: string | null;
  }): Promise<ResultadoAccion>;
  decideRecommendation(input: {
    recommendationCandidateId: string;
    decision: "SELECTED" | "REJECTED";
    note?: string | null;
  }): Promise<ResultadoAccion>;
  createIntervention(input: InterventionInput): Promise<ResultadoAccion>;
  createActivity(input: ActivityInput): Promise<ResultadoAccion>;
  changeActivityState(input: {
    activityId: string;
    state: "PENDING" | "EXECUTING" | "DELIVERABLE_PRODUCED";
  }): Promise<ResultadoAccion>;
  /** Registrar un entregable nunca implica validación. */
  registerDeliverable(input: DeliverableInput): Promise<ResultadoAccion & { validated: false }>;

  /* M1-KL · CRV, Validation, Follow-up y Reassessment. */
  /** Done es explícito y nunca implica validación. */
  markActivityDone(activityId: string): Promise<ResultadoAccion & { validated: false }>;
  /** Registra el CRV gobernado o el gap VALIDATION_REQUIREMENT_NOT_EXPLICIT. */
  registerValidationRequirement(input: {
    activityId: string;
    primaryExecutorRespondentId?: string | null;
  }): Promise<ResultadoAccion>;
  registerValidationCase(input: {
    validationRequirementId: string;
    executorRespondentId: string;
    outcome: "CORRECT" | "INCORRECT";
    criticalAssistance: boolean;
    evidenceId?: string | null;
    note?: string | null;
  }): Promise<ResultadoAccion>;
  openValidation(input: { activityId: string; evidenceIds?: string[] }): Promise<ResultadoAccion>;
  decideValidation(input: {
    validationId: string;
    decision: "PENDING" | "IN_REVIEW" | "VALIDATED" | "NOT_VALIDATED" | "INSUFFICIENT_EVIDENCE";
    reason?: string | null;
    evidenceIds?: string[];
  }): Promise<ResultadoAccion>;
  startFollowUp(input: { validationId: string; note?: string | null }): Promise<ResultadoAccion>;
  decideFollowUp(input: {
    followUpId: string;
    outcome: "CONSOLIDATED" | "NEEDS_ADJUSTMENT";
    note?: string | null;
    evidenceId?: string | null;
  }): Promise<ResultadoAccion>;
  getValidation(): Promise<ValidationPayload>;
  startReassessment(input?: { knowledgeVersionId?: string }): Promise<{
    accepted: boolean;
    rejectionReason: string | null;
    baselineAssessmentId: string;
    reassessmentAssessmentId: string | null;
  }>;
  /** La comparación expone cambios de estado, nunca mejora ni puntaje. */
  compareAssessments(input: {
    baselineAssessmentId: string;
    reassessmentAssessmentId: string;
  }): Promise<ComparisonPayload>;
}

function aAssessmentStateDto(payload: {
  assessmentId: string;
  state: {
    status: "not_started" | "in_progress" | "completed";
    capabilityId: string;
    answeredAcquisitionIds: string[];
    totalAcquisitions: number;
    updatedAt: string;
  } | null;
}): AssessmentStateDTO | null {
  if (!payload.state) return null;
  const s = payload.state;
  return {
    assessmentId: payload.assessmentId,
    companyId: "",
    activeCapabilityId: s.capabilityId,
    answeredItemIds: s.answeredAcquisitionIds,
    totalItems: s.totalAcquisitions,
    status: s.status,
    updatedAt: s.updatedAt,
  };
}

export function createProductionAssessmentClient(): ProductionAssessmentClient {
  return {
    async getAssessmentState() {
      const payload = await getOp01AssessmentState();
      return aAssessmentStateDto(payload);
    },

    async getNextAcquisition(): Promise<NextAcquisitionDTO | null> {
      // El vertical M1-D expone la adquisición-pregunta, no una recomendación
      // de vía de adquisición: esa semántica no está aprobada todavía.
      return null;
    },

    async getNextAcquisitionQuestion(): Promise<AcquisitionQuestionDTO | null> {
      const payload = await getOp01NextAcquisition();
      return payload.acquisition ?? null;
    },

    async submitResponse(command: SubmitResponseCommand): Promise<SubmitResponseResult> {
      const resultado = await submitOp01Response({
        data: {
          acquisitionId: command.itemId,
          knowledgeState: command.knowledgeState ?? "KNOWN",
          semanticValue: typeof command.value === "string" ? command.value : null,
          notApplicableReason: command.notApplicableReason ?? null,
          ...(command.conflictingObservationIds
            ? { conflictingObservationIds: command.conflictingObservationIds }
            : {}),
        },
      });

      const assessment =
        aAssessmentStateDto({ assessmentId: command.assessmentId, state: resultado.state }) ?? {
          assessmentId: command.assessmentId,
          companyId: "",
          activeCapabilityId: command.capabilityId,
          answeredItemIds: [],
          totalItems: 0,
          status: "not_started" as const,
          updatedAt: new Date().toISOString(),
        };

      return {
        accepted: resultado.accepted,
        assessment,
        // M1-D no produce findings: no se fabrican para demostrar el vertical.
        findingIds: [],
        ...(resultado.rejectionReason ? { rejectionReason: resultado.rejectionReason } : {}),
      };
    },

    async getAssessmentDetail() {
      const payload = await getOp01AssessmentState();
      return payload.state;
    },

    async getCollaboration() {
      return getOp01Collaboration();
    },

    async inviteRespondent(input) {
      const salida = await inviteOp01Respondent({ data: input });
      return { respondentId: salida.respondentId, assignmentId: salida.assignmentId };
    },

    async registerEvidence(input) {
      const salida = await registerOp01Evidence({ data: input });
      return { evidenceId: salida.evidenceId, linkedObservationIds: salida.linkedObservationIds };
    },

    async getFindings() {
      return getOp01Findings();
    },

    async reviewFinding(input) {
      const salida = await reviewOp01Finding({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async createRecommendationCandidate(input) {
      const salida = await createOp01RecommendationCandidate({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async decideRecommendation(input) {
      const salida = await decideOp01Recommendation({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async createIntervention(input) {
      const salida = await createOp01Intervention({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async createActivity(input) {
      const salida = await createOp01Activity({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async changeActivityState(input) {
      const salida = await changeOp01ActivityState({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async registerDeliverable(input) {
      const salida = await registerOp01Deliverable({ data: input });
      return {
        accepted: salida.accepted,
        rejectionReason: salida.rejectionReason,
        // El entregado no valida: la validación pertenece a otra etapa.
        validated: false as const,
      };
    },

    async markActivityDone(activityId) {
      const salida = await markOp01ActivityDone({ data: { activityId } });
      return {
        accepted: salida.accepted,
        rejectionReason: salida.rejectionReason,
        // Done no valida: la validación exige CRV y decisión humana.
        validated: false as const,
      };
    },

    async registerValidationRequirement(input) {
      const salida = await registerOp01ValidationRequirement({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async registerValidationCase(input) {
      const salida = await registerOp01ValidationCase({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async openValidation(input) {
      const salida = await openOp01Validation({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async decideValidation(input) {
      const salida = await decideOp01Validation({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async startFollowUp(input) {
      const salida = await startOp01FollowUp({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async decideFollowUp(input) {
      const salida = await decideOp01FollowUp({ data: input });
      return { accepted: salida.accepted, rejectionReason: salida.rejectionReason };
    },

    async getValidation() {
      return getOp01Validation();
    },

    async startReassessment(input) {
      const salida = await startOp01Reassessment({ data: input ?? {} });
      return {
        accepted: salida.accepted,
        rejectionReason: salida.rejectionReason,
        baselineAssessmentId: salida.baselineAssessmentId,
        reassessmentAssessmentId: salida.reassessmentAssessmentId,
      };
    },

    async compareAssessments(input) {
      return compareOp01Assessments({ data: input });
    },
  };
}
