/**
 * Capa de cliente productivo.
 *
 * Punto único de acceso a AssessmentClient y a la fuente de ejecución.
 * Las 12 capacidades del MVP siguen en MVP_ENGINE; OP-01 usa PRODUCTION_ENGINE.
 *
 * El frontend consume SIEMPRE esta capa: nunca el Knowledge Engine.
 */
export type { AssessmentClient } from "./assessment-client";
export {
  createMvpAssessmentClient,
  sesionMvpAAssessmentState,
  comandoARespuestaMvp,
  type MvpAssessmentClientDeps,
} from "./assessment-adapter";
export {
  ExecutionSource,
  ACTIVE_EXECUTION_SOURCE,
  PRODUCTION_CAPABILITY_IDS,
  resolveExecutionSource,
} from "./execution-source";
export {
  createProductionAssessmentClient,
  type ProductionAssessmentClient,
} from "./production-client";
