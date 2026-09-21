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
  getOp01NextAcquisition,
  submitOp01Response,
} from "@/lib/production/op01.functions";
import type { AssessmentClient } from "./assessment-client";

/** Cliente extendido: añade la adquisición-pregunta servida por el pack. */
export interface ProductionAssessmentClient extends AssessmentClient {
  getNextAcquisitionQuestion(assessmentId: string): Promise<AcquisitionQuestionDTO | null>;
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
  };
}
