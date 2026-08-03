/**
 * MC-07 · Persistencia de ejecuciones del motor (POC-04, 16).
 * Capa de servicio desacoplada: las ejecuciones se guardan separadas del
 * diagnóstico original y nunca modifican sus respuestas.
 */

import type { SalidaMotor } from "./tipos";

export const CLAVE_MOTOR = "pyme-digital-motor-v1";
const MAX_EJECUCIONES = 12;

export interface EstadoMotorAlmacenado {
  ejecuciones: SalidaMotor[];
}

export function estadoInicialMotor(): EstadoMotorAlmacenado {
  return { ejecuciones: [] };
}

export function leerEjecuciones(): SalidaMotor[] {
  if (typeof window === "undefined") return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE_MOTOR);
    if (!crudo) return [];
    const estado = JSON.parse(crudo) as Partial<EstadoMotorAlmacenado>;
    return Array.isArray(estado.ejecuciones) ? estado.ejecuciones : [];
  } catch {
    return [];
  }
}

/** Añade la ejecución conservando el historial (nunca sobrescribe versiones previas). */
export function guardarEjecucion(salida: SalidaMotor): SalidaMotor[] {
  const previas = leerEjecuciones().filter(
    (e) => e.metadata.executionId !== salida.metadata.executionId
  );
  const siguiente = [salida, ...previas].slice(0, MAX_EJECUCIONES);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CLAVE_MOTOR, JSON.stringify({ ejecuciones: siguiente }));
  }
  return siguiente;
}

export function obtenerEjecucion(executionId: string): SalidaMotor | undefined {
  return leerEjecuciones().find((e) => e.metadata.executionId === executionId);
}

export function ultimaEjecucionDe(diagnosisId: string): SalidaMotor | undefined {
  return leerEjecuciones().find((e) => e.metadata.diagnosisId === diagnosisId);
}

export function limpiarEjecuciones(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE_MOTOR);
}
