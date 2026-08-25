/**
 * Proyector Workspace → Roadmap.
 *
 * Workspace es la ÚNICA fuente de verdad de la ejecución. Este módulo no
 * sincroniza ni persiste nada: proyecta el estado del Workspace sobre los
 * estados operativos del Roadmap en el momento de leerlo, de modo que no puedan
 * existir combinaciones contradictorias (Workspace = Validado y Roadmap =
 * Pendiente) ni un estado del Roadmap guardado que compita con la ejecución.
 */

import { avanceCiclo } from "@/lib/workspace/estados";
import type { ActividadWorkspace, EstadoEjecucion } from "@/lib/workspace/tipos";
import type { AccionRoadmap, EstadoAccionRoadmap } from "@/lib/roadmap/tipos";

export const VERSION_SINCRONIZACION = "sincronizacion-1.0.0";

/** Proyección oficial Workspace → Roadmap. */
export const estadoRoadmapDesdeEjecucion: Record<EstadoEjecucion, EstadoAccionRoadmap> = {
  pendiente: "PENDIENTE",
  en_ejecucion: "EN_CURSO",
  entregado: "EN_CURSO",
  requiere_ajustes: "EN_CURSO",
  validado: "COMPLETADA",
};

/** Estados del Roadmap que el usuario decidió y la ejecución no debe pisar. */
const ESTADOS_NO_SOBRESCRIBIBLES: EstadoAccionRoadmap[] = ["DESCARTADA", "BLOQUEADA", "PAUSADA"];

export function avanceDesdeEjecucion(estado: EstadoEjecucion): number {
  return Math.round(avanceCiclo(estado) * 100);
}

/** Une una acción del Roadmap con la actividad del Workspace equivalente. */
export function actividadDeAccion(
  actividades: ActividadWorkspace[],
  accion: Pick<AccionRoadmap, "id" | "fichaAccionId">
): ActividadWorkspace | undefined {
  return actividades.find((a) => a.id === accion.fichaAccionId || a.id === accion.id);
}

/**
 * Estado que debe mostrarse en Plan de Acción y Roadmap: si la actividad tiene
 * workspace abierto, manda el Workspace.
 */
export function estadoUnificado(
  estadoRoadmap: EstadoAccionRoadmap,
  actividad?: ActividadWorkspace | null
): EstadoAccionRoadmap {
  if (!actividad) return estadoRoadmap;
  if (ESTADOS_NO_SOBRESCRIBIBLES.includes(estadoRoadmap)) return estadoRoadmap;
  return estadoRoadmapDesdeEjecucion[actividad.estado];
}
