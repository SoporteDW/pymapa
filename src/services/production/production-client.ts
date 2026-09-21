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
  getOp01AssessmentState,
  getOp01Collaboration,
  getOp01NextAcquisition,
  inviteOp01Respondent,
  registerOp01Evidence,
  submitOp01Response,
} from "@/lib/production/op01.functions";
import type { AssessmentClient } from "./assessment-client";

type CollaborationPayload = Awaited<ReturnType<typeof getOp01Collaboration>>;
type StatePayload = Awaited<ReturnType<typeof getOp01AssessmentState>>["state"];
type InviteInput = Parameters<typeof inviteOp01Respondent>[0] extends { data: infer D } ? D : never;
type EvidenceInput = Parameters<typeof registerOp01Evidence>[0] extends { data: infer D } ? D : never;

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
  };
}
