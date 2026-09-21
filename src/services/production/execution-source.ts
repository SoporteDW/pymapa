/**
 * Fuente de ejecución del journey diagnóstico (M1-B).
 *
 * MVP_ENGINE: el comportamiento actual del MVP Alfa (src/lib/diagnostico,
 * src/lib/motor, persistencia local). Es la fuente activa.
 *
 * PRODUCTION_ENGINE: futuro core productivo (Application API + Knowledge
 * Engine). NO está activo; existe solo como valor reservado de la frontera.
 *
 * Ninguna regla diagnóstica cambia según este valor en esta etapa.
 */
export const ExecutionSource = {
  MVP_ENGINE: "MVP_ENGINE",
  PRODUCTION_ENGINE: "PRODUCTION_ENGINE",
} as const;

export type ExecutionSource = (typeof ExecutionSource)[keyof typeof ExecutionSource];

/**
 * Fuente activa en esta etapa. El comportamiento actual continúa usando
 * MVP_ENGINE. PRODUCTION_ENGINE no se activa todavía.
 */
export const ACTIVE_EXECUTION_SOURCE: ExecutionSource = ExecutionSource.MVP_ENGINE;
