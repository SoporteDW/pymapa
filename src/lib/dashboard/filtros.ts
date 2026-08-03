/**
 * Filtros del dashboard (POC-07, sección 9). Lógica pura.
 * El periodo afecta tendencias y actividad, nunca el diagnóstico vigente.
 */

import { hoyISO, sumarDias } from "@/lib/roadmap/fechas";
import { estadoDerivado } from "@/lib/roadmap/estados";
import type { AccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";
import type { DashboardFilters, PeriodoDashboard, RangoPeriodo } from "./tipos";

export const filtrosDashboardIniciales: DashboardFilters = {
  period: "90",
  dimensionId: "todas",
  priority: "todas",
  actionStatus: "todos",
  ownerId: "todos",
};

export const etiquetaPeriodo: Record<PeriodoDashboard, string> = {
  "30": "Últimos 30 días",
  "90": "Últimos 90 días",
  "180": "Últimos 180 días",
  historico: "Todo el histórico",
};

export const diasPeriodo: Record<PeriodoDashboard, number | null> = {
  "30": 30,
  "90": 90,
  "180": 180,
  historico: null,
};

export function rangoDePeriodo(period: PeriodoDashboard, hoy = hoyISO()): RangoPeriodo {
  const dias = diasPeriodo[period];
  return {
    inicio: dias === null ? "1970-01-01" : sumarDias(hoy, -dias),
    fin: hoy,
    etiqueta: etiquetaPeriodo[period],
    dias,
  };
}

export function dentroDelPeriodo(fechaISO: string, rango: RangoPeriodo): boolean {
  const fecha = fechaISO.slice(0, 10);
  return fecha >= rango.inicio && fecha <= rango.fin;
}

export function filtrosActivos(filtros: DashboardFilters): number {
  let total = 0;
  if (filtros.dimensionId !== "todas") total += 1;
  if (filtros.priority !== "todas") total += 1;
  if (filtros.actionStatus !== "todos") total += 1;
  if (filtros.ownerId !== "todos") total += 1;
  if (filtros.period !== filtrosDashboardIniciales.period) total += 1;
  return total;
}

/** Acciones que entran en los indicadores de ejecución según los filtros. */
export function accionesSegunFiltros(
  roadmap: Roadmap,
  filtros: DashboardFilters
): AccionRoadmap[] {
  return roadmap.acciones.filter((accion) => {
    if (filtros.dimensionId !== "todas" && accion.origen.dimensionId !== filtros.dimensionId) {
      return false;
    }
    if (filtros.priority !== "todas" && accion.prioridadOperativa !== filtros.priority) {
      return false;
    }
    if (
      filtros.actionStatus !== "todos" &&
      estadoDerivado(roadmap, accion) !== filtros.actionStatus
    ) {
      return false;
    }
    if (filtros.ownerId !== "todos") {
      if (filtros.ownerId === "sin_responsable") {
        if (accion.responsable.trim().length > 0) return false;
      } else if (accion.responsable !== filtros.ownerId) {
        return false;
      }
    }
    return true;
  });
}

export function responsablesDelDashboard(roadmap: Roadmap): string[] {
  const nombres = roadmap.acciones
    .map((a) => a.responsable.trim())
    .filter((nombre) => nombre.length > 0);
  return [...new Set(nombres)].sort((a, b) => a.localeCompare(b));
}
