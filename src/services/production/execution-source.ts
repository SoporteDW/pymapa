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
 * PKG-01 · Las 31 capacidades publicadas (taxonomía oficial; EC-01 excluida).
 * Lista explícita: migrar una capacidad es una decisión de gobierno. Debe
 * coincidir con el registro de packs (verificado por tests). Sin ruta por
 * capacidad: todas resuelven al mismo PRODUCTION_ENGINE.
 */
export const PRODUCTION_CAPABILITY_IDS: readonly string[] = [
  "OP-01", "OP-02", "OP-03", "OP-04", "OP-05",
  "DG-01", "DG-02", "DG-03", "DG-04", "DG-05",
  "PC-01", "PC-02", "PC-03", "PC-04", "PC-05",
  "DT-01", "DT-02", "DT-03", "DT-04", "DT-05", "DT-06",
  "CM-01", "CM-02", "CM-03", "CM-04", "CM-05", "CM-06",
  "EC-02", "EC-03", "EC-04", "EC-05",
];

/** Fuente por defecto para todo lo que no está migrado. */
export const ACTIVE_EXECUTION_SOURCE: ExecutionSource = ExecutionSource.MVP_ENGINE;

/** Resuelve la fuente de ejecución de una capacidad concreta. */
export function resolveExecutionSource(capabilityId: string | null | undefined): ExecutionSource {
  if (capabilityId && PRODUCTION_CAPABILITY_IDS.includes(capabilityId)) {
    return ExecutionSource.PRODUCTION_ENGINE;
  }
  return ExecutionSource.MVP_ENGINE;
}
