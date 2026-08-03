/**
 * Búsqueda, filtros y ordenamiento de la vista Lista (POC-06, sección 10).
 * Lógica pura: la persistencia de filtros durante la sesión vive en el hook.
 */

import { estadoDerivado } from "./estados";
import { calcularAvance, estaVencida, sinResponsable } from "./avance";
import { ordenFase } from "./fases";
import { hoyISO } from "./fechas";
import type { AccionRoadmap, EstadoAccionRoadmap, FaseId, Roadmap } from "./tipos";
import type { NivelPrioridad } from "@/lib/resultados/tipos";

export type OrdenLista =
  | "prioridad"
  | "fecha_inicio"
  | "fecha_fin"
  | "avance"
  | "manual";

export interface FiltrosRoadmap {
  busqueda: string;
  fase: FaseId | "todas";
  estado: EstadoAccionRoadmap | "todos";
  prioridad: NivelPrioridad | "todas";
  responsable: string;
  soloVencidas: boolean;
  soloBloqueadas: boolean;
  incluirDescartadas: boolean;
  orden: OrdenLista;
}

export const filtrosRoadmapIniciales: FiltrosRoadmap = {
  busqueda: "",
  fase: "todas",
  estado: "todos",
  prioridad: "todas",
  responsable: "todos",
  soloVencidas: false,
  soloBloqueadas: false,
  incluirDescartadas: false,
  orden: "prioridad",
};

export function responsablesDe(roadmap: Roadmap): string[] {
  const nombres = roadmap.acciones
    .map((a) => a.responsable.trim())
    .filter((nombre) => nombre.length > 0);
  return [...new Set(nombres)].sort((a, b) => a.localeCompare(b));
}

const rangoPrioridad: Record<string, number> = { critica: 4, alta: 3, media: 2, baja: 1 };

export function filtrarAccionesRoadmap(
  roadmap: Roadmap,
  filtros: FiltrosRoadmap,
  hoy = hoyISO()
): AccionRoadmap[] {
  const termino = filtros.busqueda.trim().toLowerCase();

  const filtradas = roadmap.acciones.filter((accion) => {
    if (!filtros.incluirDescartadas && accion.estado === "DESCARTADA") return false;
    if (filtros.fase !== "todas" && accion.faseId !== filtros.fase) return false;
    if (filtros.estado !== "todos" && estadoDerivado(roadmap, accion) !== filtros.estado) {
      return false;
    }
    if (filtros.prioridad !== "todas" && accion.prioridadOperativa !== filtros.prioridad) {
      return false;
    }
    if (filtros.responsable === "sin_responsable" && !sinResponsable(accion)) return false;
    if (
      filtros.responsable !== "todos" &&
      filtros.responsable !== "sin_responsable" &&
      accion.responsable !== filtros.responsable
    ) {
      return false;
    }
    if (filtros.soloVencidas && !estaVencida(accion, hoy)) return false;
    if (filtros.soloBloqueadas && accion.estado !== "BLOQUEADA") return false;

    if (termino.length > 0) {
      const texto = [
        accion.titulo,
        accion.responsable,
        accion.origen.hallazgoTitulo ?? "",
        accion.origen.dimensionNombre,
      ]
        .join(" ")
        .toLowerCase();
      if (!texto.includes(termino)) return false;
    }
    return true;
  });

  return [...filtradas].sort((a, b) => {
    if (filtros.orden === "fecha_inicio") {
      return (a.fechaInicio ?? "9999").localeCompare(b.fechaInicio ?? "9999");
    }
    if (filtros.orden === "fecha_fin") {
      return (a.fechaObjetivo ?? "9999").localeCompare(b.fechaObjetivo ?? "9999");
    }
    if (filtros.orden === "avance") {
      return calcularAvance(b) - calcularAvance(a);
    }
    if (filtros.orden === "manual") {
      return ordenFase(a.faseId) - ordenFase(b.faseId) || a.orden - b.orden;
    }
    return (
      (rangoPrioridad[b.prioridadOperativa] ?? 0) - (rangoPrioridad[a.prioridadOperativa] ?? 0) ||
      b.prioridadScore - a.prioridadScore ||
      ordenFase(a.faseId) - ordenFase(b.faseId) ||
      a.orden - b.orden
    );
  });
}

export function accionesDeFase(roadmap: Roadmap, fase: FaseId): AccionRoadmap[] {
  return roadmap.acciones
    .filter((accion) => accion.faseId === fase && accion.estado !== "DESCARTADA")
    .sort((a, b) => a.orden - b.orden);
}
