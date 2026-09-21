/**
 * Adaptador temporal MVP → contratos productivos (M1-B).
 *
 * Capa de adaptación ESTRUCTURAL: traduce las estructuras actuales del MVP
 * (DiagnosticSession, DiagnosticAnswer) a los DTOs de @pymapa/contracts.
 *
 * Restricciones respetadas:
 * - No reinterpreta reglas: la validación de respuestas se delega al
 *   `responder` existente del hook de diagnóstico, inyectado como dependencia.
 * - No crea nuevos estados diagnósticos: solo AGRUPA los estados en curso
 *   del MVP (in_progress/review/processing) en el "in_progress" del DTO.
 * - No calcula scoring, sufficiency ni confidence.
 * - No produce findings nuevos (findingIds siempre vacío).
 * - No introduce semántica OP-01 (capabilityId se transporta opaco).
 */
import type {
  AssessmentStateDTO,
  NextAcquisitionDTO,
  SubmitResponseCommand,
  SubmitResponseResult,
} from "@pymapa/contracts";
import type {
  DiagnosticAnswer,
  DiagnosticSession,
  EstadoSesionDiagnostico,
  ValorRespuesta,
} from "@/lib/diagnostico/tipos";
import type { AssessmentClient } from "./assessment-client";

/**
 * Mapeo estructural de estado de sesión MVP → estado del DTO.
 * Los estados "en curso" del MVP se agrupan; no se inventa semántica nueva.
 */
function estadoSesionADto(status: EstadoSesionDiagnostico): AssessmentStateDTO["status"] {
  switch (status) {
    case "not_started":
      return "not_started";
    case "completed":
      return "completed";
    case "error":
      return "abandoned";
    case "in_progress":
    case "review":
    case "processing":
      return "in_progress";
  }
}

/** Construye la vista DTO del estado actual, sin calcular nada nuevo. */
export function sesionMvpAAssessmentState(params: {
  sesion: DiagnosticSession;
  respuestas: DiagnosticAnswer[];
  totalItems: number;
}): AssessmentStateDTO {
  const { sesion, respuestas, totalItems } = params;
  return {
    assessmentId: sesion.id,
    companyId: sesion.companyProfileId ?? "",
    activeCapabilityId: null,
    answeredItemIds: respuestas.map((r) => r.questionId),
    totalItems,
    status: estadoSesionADto(sesion.status),
    updatedAt: sesion.updatedAt ?? new Date().toISOString(),
  };
}

/** Traduce un comando productivo a la respuesta MVP, sin validar ni decidir. */
export function comandoARespuestaMvp(command: SubmitResponseCommand): {
  questionId: string;
  valor: ValorRespuesta;
} {
  const value = command.value;
  return {
    questionId: command.itemId,
    valor: typeof value === "boolean" ? String(value) : value,
  };
}

/** Dependencias que el MVP ya posee; el adaptador NO las reimplementa. */
export interface MvpAssessmentClientDeps {
  /** Lectura del estado almacenado actual (repositorio existente). */
  leerEstado: () => {
    sesion: DiagnosticSession;
    respuestas: DiagnosticAnswer[];
  } | null;
  /** Total de ítems del instrumento vigente (definición existente). */
  totalItems: number;
  /**
   * Registro de respuesta EXISTENTE (con su validación actual). Devuelve
   * true si la respuesta fue aceptada por la lógica vigente.
   */
  responderExistente: (questionId: string, valor: ValorRespuesta) => boolean;
}

/**
 * Crea un AssessmentClient respaldado por el motor MVP vigente.
 * Toda decisión la sigue tomando el código existente; aquí solo se traduce.
 */
export function createMvpAssessmentClient(deps: MvpAssessmentClientDeps): AssessmentClient {
  const leerSeguro = () => {
    try {
      return deps.leerEstado();
    } catch {
      return null;
    }
  };

  return {
    async getAssessmentState(assessmentId) {
      const estado = leerSeguro();
      if (!estado || estado.sesion.id !== assessmentId) return null;
      return sesionMvpAAssessmentState({
        sesion: estado.sesion,
        respuestas: estado.respuestas,
        totalItems: deps.totalItems,
      });
    },

    async getNextAcquisition(): Promise<NextAcquisitionDTO | null> {
      // El MVP Alfa no tiene el concepto de adquisición: no se inventa nada.
      return null;
    },

    async submitResponse(command): Promise<SubmitResponseResult> {
      const { questionId, valor } = comandoARespuestaMvp(command);
      const accepted = deps.responderExistente(questionId, valor);
      const estado = leerSeguro();
      const assessment: AssessmentStateDTO = estado
        ? sesionMvpAAssessmentState({
            sesion: estado.sesion,
            respuestas: estado.respuestas,
            totalItems: deps.totalItems,
          })
        : {
            assessmentId: command.assessmentId,
            companyId: "",
            activeCapabilityId: null,
            answeredItemIds: [],
            totalItems: deps.totalItems,
            status: "not_started",
            updatedAt: new Date().toISOString(),
          };
      return {
        accepted,
        assessment,
        findingIds: [],
        ...(accepted ? {} : { rejectionReason: "rechazado_por_validacion_vigente" }),
      };
    },
  };
}
