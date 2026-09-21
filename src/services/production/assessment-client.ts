/**
 * AssessmentClient — interfaz del cliente productivo (M1-B).
 *
 * Usa exclusivamente los contratos de @pymapa/contracts. No contiene
 * lógica diagnóstica, reglas, scoring, sufficiency, confidence ni findings:
 * solo define cómo el frontend conversa con una fuente de evaluación.
 *
 * En esta etapa la única implementación es la del MVP (ver
 * assessment-adapter.ts), respaldada por el motor y repositorio actuales.
 */
import type {
  AssessmentStateDTO,
  NextAcquisitionDTO,
  SubmitResponseCommand,
  SubmitResponseResult,
} from "@pymapa/contracts";

export interface AssessmentClient {
  /** Estado actual de una evaluación, ya calculado por la fuente. */
  getAssessmentState(assessmentId: string): Promise<AssessmentStateDTO | null>;
  /**
   * Próxima adquisición recomendada, ya decidida por la fuente.
   * El MVP Alfa no tiene este concepto: su implementación devuelve null.
   */
  getNextAcquisition(assessmentId: string): Promise<NextAcquisitionDTO | null>;
  /** Envía una respuesta individual para ser procesada por la fuente. */
  submitResponse(command: SubmitResponseCommand): Promise<SubmitResponseResult>;
}
