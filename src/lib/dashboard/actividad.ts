/**
 * Actividad reciente del dashboard (KPI-09, POC-07 sección 6).
 * Se deriva del historial real del Roadmap y de la fecha del diagnóstico.
 */

import { etiquetaEstado } from "@/lib/roadmap/estados";
import { dentroDelPeriodo } from "./filtros";
import type { AccionRoadmap, RegistroAvance, Roadmap } from "@/lib/roadmap/tipos";
import type { ActivityEvent, RangoPeriodo, TipoEventoActividad } from "./tipos";

const TIPO: Record<RegistroAvance["tipo"], TipoEventoActividad> = {
  creacion: "otro",
  cambio_estado: "cambio_estado",
  avance: "avance",
  reprogramacion: "reprogramacion",
  responsable: "otro",
  nota: "nota",
  evidencia: "evidencia",
  bloqueo: "bloqueo",
  fase: "otro",
  descarte: "cambio_estado",
};

function titulo(registro: RegistroAvance, accionTitulo: string): string {
  switch (registro.tipo) {
    case "cambio_estado":
      return `${accionTitulo}: ${
        registro.estadoNuevo ? etiquetaEstado[registro.estadoNuevo] : "cambio de estado"
      }`;
    case "avance":
      return `${accionTitulo}: avance ${registro.porcentaje ?? 0}%`;
    case "evidencia":
      return `${accionTitulo}: nueva evidencia`;
    case "bloqueo":
      return `${accionTitulo}: bloqueo registrado`;
    case "reprogramacion":
      return `${accionTitulo}: fechas actualizadas`;
    case "nota":
      return `${accionTitulo}: nota de seguimiento`;
    case "descarte":
      return `${accionTitulo}: acción descartada`;
    default:
      return `${accionTitulo}: actualización`;
  }
}

export function construirActividad(
  roadmap: Roadmap,
  acciones: AccionRoadmap[],
  rango: RangoPeriodo,
  diagnosticoFecha?: string
): ActivityEvent[] {
  const visibles = new Map(acciones.map((a) => [a.id, a]));

  const eventos: ActivityEvent[] = roadmap.historial
    .filter((registro) => visibles.has(registro.accionId))
    .filter((registro) => dentroDelPeriodo(registro.fecha, rango))
    .map((registro) => ({
      id: registro.id,
      eventType: TIPO[registro.tipo],
      title: titulo(registro, visibles.get(registro.accionId)!.titulo),
      timestamp: registro.fecha,
      actor: registro.usuario,
      relatedEntityType: "accion" as const,
      relatedEntityId: registro.accionId,
      detalle: registro.comentario,
    }));

  if (diagnosticoFecha && dentroDelPeriodo(diagnosticoFecha, rango)) {
    eventos.push({
      id: `diagnostico-${diagnosticoFecha}`,
      eventType: "diagnostico",
      title: "Resultados del diagnóstico generados",
      timestamp: diagnosticoFecha,
      actor: "Sistema",
      relatedEntityType: "diagnostico",
      relatedEntityId: roadmap.executionId,
      detalle: "Cálculo del índice de madurez y de las prioridades vigentes.",
    });
  }

  return eventos.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
