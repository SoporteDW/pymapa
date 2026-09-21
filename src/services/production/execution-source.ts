/**
 * Fuente de ejecución del journey diagnóstico (M1-B, ampliado en M1-D).
 *
 * MVP_ENGINE: comportamiento actual del MVP Alfa (src/lib/diagnostico,
 * src/lib/motor, persistencia local). Sigue gobernando las 12 capacidades
 * actuales sin cambio alguno.
 *
 * PRODUCTION_ENGINE: core productivo (Application boundary + Knowledge Engine
 * + PostgreSQL). En M1-D lo usa EXCLUSIVAMENTE OP-01.
 */
export const ExecutionSource = {
  MVP_ENGINE: "MVP_ENGINE",
  PRODUCTION_ENGINE: "PRODUCTION_ENGINE",
} as const;

export type ExecutionSource = (typeof ExecutionSource)[keyof typeof ExecutionSource];

/**
 * Capacidades migradas al core productivo. Lista explícita y mínima:
 * migrar una capacidad es una decisión de gobierno, no un efecto lateral.
 */
export const PRODUCTION_CAPABILITY_IDS: readonly string[] = ["OP-01"];

/** Fuente por defecto para todo lo que no está migrado. */
export const ACTIVE_EXECUTION_SOURCE: ExecutionSource = ExecutionSource.MVP_ENGINE;

/** Resuelve la fuente de ejecución de una capacidad concreta. */
export function resolveExecutionSource(capabilityId: string | null | undefined): ExecutionSource {
  if (capabilityId && PRODUCTION_CAPABILITY_IDS.includes(capabilityId)) {
    return ExecutionSource.PRODUCTION_ENGINE;
  }
  return ExecutionSource.MVP_ENGINE;
}
