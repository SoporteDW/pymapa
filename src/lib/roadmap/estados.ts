/**
 * Máquina de estados del Roadmap (POC-06, sección 5) y validaciones asociadas
 * (POC-06, sección 19). Lógica pura y reutilizable por interfaz y pruebas.
 */

import type { AccionRoadmap, EstadoAccionRoadmap, Roadmap } from "./tipos";

export const estadosAccion: EstadoAccionRoadmap[] = [
  "PENDIENTE",
  "LISTA",
  "EN_CURSO",
  "PAUSADA",
  "BLOQUEADA",
  "COMPLETADA",
  "DESCARTADA",
];

export const etiquetaEstado: Record<EstadoAccionRoadmap, string> = {
  PENDIENTE: "Pendiente",
  LISTA: "Lista para iniciar",
  EN_CURSO: "En curso",
  PAUSADA: "Pausada",
  BLOQUEADA: "Bloqueada",
  COMPLETADA: "Completada",
  DESCARTADA: "Descartada",
};

export const descripcionEstado: Record<EstadoAccionRoadmap, string> = {
  PENDIENTE: "Creada y todavía no iniciada.",
  LISTA: "Cumple sus dependencias y puede comenzar.",
  EN_CURSO: "Hay trabajo activo y seguimiento.",
  PAUSADA: "La ejecución se detuvo temporalmente.",
  BLOQUEADA: "Existe un impedimento explícito.",
  COMPLETADA: "Se alcanzó el criterio de finalización.",
  DESCARTADA: "Se decidió no ejecutarla.",
};

export const estadosFinales: EstadoAccionRoadmap[] = ["COMPLETADA", "DESCARTADA"];

export function esFinal(estado: EstadoAccionRoadmap): boolean {
  return estadosFinales.includes(estado);
}

/** Transiciones permitidas (POC-06, 5 · segunda tabla). */
const transiciones: Record<EstadoAccionRoadmap, EstadoAccionRoadmap[]> = {
  PENDIENTE: ["LISTA", "EN_CURSO", "DESCARTADA"],
  LISTA: ["EN_CURSO", "PENDIENTE", "DESCARTADA"],
  EN_CURSO: ["PAUSADA", "BLOQUEADA", "COMPLETADA", "DESCARTADA"],
  PAUSADA: ["EN_CURSO", "BLOQUEADA", "DESCARTADA"],
  BLOQUEADA: ["EN_CURSO", "PAUSADA", "DESCARTADA"],
  COMPLETADA: ["EN_CURSO"],
  DESCARTADA: ["PENDIENTE"],
};

export function transicionesDe(estado: EstadoAccionRoadmap): EstadoAccionRoadmap[] {
  return transiciones[estado] ?? [];
}

export function transicionValida(
  desde: EstadoAccionRoadmap,
  hacia: EstadoAccionRoadmap
): boolean {
  if (desde === hacia) return true;
  return transicionesDe(desde).includes(hacia);
}

/* ------------------------------------------------------------------ */
/* Dependencias (POC-06, 6.6, 15 y 19)                                 */
/* ------------------------------------------------------------------ */

export interface EstadoDependencia {
  accionId: string;
  titulo: string;
  estado: EstadoAccionRoadmap;
  cumplida: boolean;
}

export function dependenciasDe(roadmap: Roadmap, accion: AccionRoadmap): EstadoDependencia[] {
  return accion.dependencias
    .map((id) => roadmap.acciones.find((a) => a.id === id))
    .filter((a): a is AccionRoadmap => Boolean(a))
    .map((a) => ({
      accionId: a.id,
      titulo: a.titulo,
      estado: a.estado,
      cumplida: a.estado === "COMPLETADA" || a.estado === "DESCARTADA",
    }));
}

export function dependenciasPendientes(
  roadmap: Roadmap,
  accion: AccionRoadmap
): EstadoDependencia[] {
  return dependenciasDe(roadmap, accion).filter((d) => !d.cumplida);
}

export function puedeIniciar(roadmap: Roadmap, accion: AccionRoadmap): boolean {
  return dependenciasPendientes(roadmap, accion).length === 0;
}

/** Estado derivado: PENDIENTE pasa a LISTA cuando ya no tiene dependencias abiertas. */
export function estadoDerivado(
  roadmap: Roadmap,
  accion: AccionRoadmap
): EstadoAccionRoadmap {
  if (accion.estado !== "PENDIENTE") return accion.estado;
  return puedeIniciar(roadmap, accion) ? "LISTA" : "PENDIENTE";
}

/* ------------------------------------------------------------------ */
/* Validaciones de guardado (POC-06, 19)                               */
/* ------------------------------------------------------------------ */

export interface ResultadoValidacion {
  valido: boolean;
  mensaje?: string;
}

export function validarFechas(
  fechaInicio: string | null,
  fechaObjetivo: string | null
): ResultadoValidacion {
  if (!fechaInicio || !fechaObjetivo) return { valido: true };
  if (fechaObjetivo < fechaInicio) {
    return {
      valido: false,
      mensaje: "La fecha objetivo no puede ser anterior a la fecha de inicio.",
    };
  }
  return { valido: true };
}

export function validarMotivo(motivo: string): ResultadoValidacion {
  if (motivo.trim().length < 5) {
    return { valido: false, mensaje: "Explica en pocas palabras el motivo (mínimo 5 caracteres)." };
  }
  return { valido: true };
}

/** Completar exige al menos una nota final o una evidencia (POC-06, 14). */
export function validarCierre(accion: AccionRoadmap): ResultadoValidacion {
  if (accion.evidencias.length === 0 && accion.notas.length === 0) {
    return {
      valido: false,
      mensaje: "Antes de completar, registra una nota de cierre o una evidencia.",
    };
  }
  return { valido: true };
}
