/**
 * Capa de cliente productivo (M1-B).
 *
 * Punto único de acceso a la interfaz AssessmentClient y a la fuente de
 * ejecución activa. El comportamiento actual usa MVP_ENGINE;
 * PRODUCTION_ENGINE no está activo todavía.
 */
export type { AssessmentClient } from "./assessment-client";
export {
  createMvpAssessmentClient,
  sesionMvpAAssessmentState,
  comandoARespuestaMvp,
  type MvpAssessmentClientDeps,
} from "./assessment-adapter";
export { ExecutionSource, ACTIVE_EXECUTION_SOURCE } from "./execution-source";
