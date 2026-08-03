/**
 * Repositorio de persistencia del diagnóstico (POC-03, 12.3).
 * Encapsula localStorage detrás de un servicio con clave versionada, de modo que
 * la interfaz y el hook no conozcan el detalle del almacenamiento.
 */

import { DEFINITION_VERSION } from "./definicion";
import { respuestasVigentes } from "./validacion";
import type { DiagnosticSession, EstadoDiagnosticoAlmacenado } from "./tipos";

export const CLAVE_DIAGNOSTICO = "pyme-digital-diagnostico-v1";

export function crearSesionDiagnostico(companyProfileId: string | null = null): DiagnosticSession {
  return {
    id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    definitionVersion: DEFINITION_VERSION,
    companyProfileId,
    status: "not_started",
    currentQuestionId: null,
    currentDimensionId: null,
    startedAt: null,
    updatedAt: null,
    completedAt: null,
    errorCode: null,
  };
}

export function estadoInicial(): EstadoDiagnosticoAlmacenado {
  return { sesion: crearSesionDiagnostico(), respuestas: [], resultado: null };
}

/** Integra lo guardado con el modelo vigente y descarta respuestas residuales. */
export function fusionarEstado(
  guardado: unknown,
  inicial: EstadoDiagnosticoAlmacenado
): EstadoDiagnosticoAlmacenado {
  if (!guardado || typeof guardado !== "object") return inicial;
  const parcial = guardado as Partial<EstadoDiagnosticoAlmacenado>;
  const respuestas = Array.isArray(parcial.respuestas) ? respuestasVigentes(parcial.respuestas) : [];
  const sesion: DiagnosticSession = { ...inicial.sesion, ...(parcial.sesion ?? {}) };

  // Si la definición cambió de versión, se conserva el avance pero se invalida el resultado.
  const resultadoVigente =
    parcial.resultado && parcial.resultado.definitionVersion === DEFINITION_VERSION
      ? parcial.resultado
      : null;

  return { sesion, respuestas, resultado: resultadoVigente };
}

export function leerEstado(): EstadoDiagnosticoAlmacenado {
  if (typeof window === "undefined") return estadoInicial();
  const crudo = window.localStorage.getItem(CLAVE_DIAGNOSTICO);
  if (!crudo) return estadoInicial();
  return fusionarEstado(JSON.parse(crudo) as unknown, estadoInicial());
}

export function guardarEstado(estado: EstadoDiagnosticoAlmacenado): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAVE_DIAGNOSTICO, JSON.stringify(estado));
}

/** Limpieza para reiniciar el escenario de demostración. */
export function limpiarEstado(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE_DIAGNOSTICO);
}
