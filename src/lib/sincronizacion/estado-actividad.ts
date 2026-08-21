/**
 * Deuda 0.2 · Fuente coherente de estado entre Workspace, Plan de Acción y
 * Roadmap.
 *
 * No se crea otra máquina de estados: la máquina válida es la del Workspace
 * (B5). Este módulo la PROYECTA sobre los estados operativos del Roadmap para
 * que no puedan existir combinaciones contradictorias (Workspace = Validado y
 * Roadmap = Pendiente).
 */

import { avanceCiclo } from "@/lib/workspace/estados";
import type { ActividadWorkspace, EstadoEjecucion } from "@/lib/workspace/tipos";
import type { AccionRoadmap, EstadoAccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";

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

export interface CambioSincronizacion {
  accionId: string;
  actividadId: string;
  estadoAnterior: EstadoAccionRoadmap;
  estadoNuevo: EstadoAccionRoadmap;
  avanceAnterior: number;
  avanceNuevo: number;
}

/**
 * Proyecta el estado de ejecución sobre el Roadmap. Función pura: devuelve un
 * plan nuevo y la lista de cambios aplicados (para el historial del Roadmap).
 */
export function sincronizarRoadmapConWorkspace(
  roadmap: Roadmap,
  actividades: ActividadWorkspace[]
): { roadmap: Roadmap; cambios: CambioSincronizacion[] } {
  const cambios: CambioSincronizacion[] = [];

  const acciones = roadmap.acciones.map((accion) => {
    const actividad = actividadDeAccion(actividades, accion);
    if (!actividad) return accion;
    if (ESTADOS_NO_SOBRESCRIBIBLES.includes(accion.estado)) return accion;

    const estadoNuevo = estadoRoadmapDesdeEjecucion[actividad.estado];
    const avanceNuevo = Math.max(accion.avance, avanceDesdeEjecucion(actividad.estado));
    if (estadoNuevo === accion.estado && avanceNuevo === accion.avance) return accion;

    cambios.push({
      accionId: accion.id,
      actividadId: actividad.id,
      estadoAnterior: accion.estado,
      estadoNuevo,
      avanceAnterior: accion.avance,
      avanceNuevo,
    });

    return {
      ...accion,
      estado: estadoNuevo,
      avance: avanceNuevo,
      actualizadaEn: new Date().toISOString(),
    };
  });

  if (cambios.length === 0) return { roadmap, cambios };

  const historial = [
    ...roadmap.historial,
    ...cambios.map((c) => ({
      id: `sync-${c.accionId}-${Date.now().toString(36)}`,
      accionId: c.accionId,
      fecha: new Date().toISOString(),
      usuario: "sistema",
      tipo: "cambio_estado" as const,
      estadoAnterior: c.estadoAnterior,
      estadoNuevo: c.estadoNuevo,
      porcentaje: c.avanceNuevo,
      comentario:
        "Estado sincronizado con la ejecución de la actividad en el Workspace (fuente única de estado).",
      evidenciaId: null,
    })),
  ];

  return {
    roadmap: { ...roadmap, acciones, historial, fechaActualizacion: new Date().toISOString() },
    cambios,
  };
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
