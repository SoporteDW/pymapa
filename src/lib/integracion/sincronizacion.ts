/**
 * POC-09 · Sincronización del recorrido general con la cadena integrada.
 * Traduce la ejecución del orquestador (POC-08) al modelo de sesión del
 * recorrido (POC-01/POC-02) para que Inicio, el mapa de etapas, el resumen y el
 * tablero reflejen de inmediato el perfil cargado. Lógica pura y determinista.
 */

import type { EjecucionIntegrada } from "./orquestador";
import type { FichaAccion, PrioridadVista, ResultadoPyme } from "@/lib/resultados/tipos";
import type {
  Accion,
  Diagnostico,
  Esfuerzo,
  Horizonte,
  Impacto,
  Prioridad,
  PrioridadDemostrativa,
  Resultado,
  Respuesta,
} from "@/types";

export interface SesionSincronizada {
  diagnostico: Pick<
    Diagnostico,
    | "estado"
    | "progreso"
    | "respuestasRevisadas"
    | "resultadosGenerados"
    | "respondidasObligatorias"
    | "totalPreguntas"
  >;
  respuestas: Respuesta[];
  resultados: Resultado[];
  prioridades: PrioridadDemostrativa[];
  acciones: Accion[];
}

function prioridadSesion(nivel: PrioridadVista["level"] | FichaAccion["priorityLevel"]): Prioridad {
  if (nivel === "critica" || nivel === "alta") return "alta";
  if (nivel === "media") return "media";
  return "baja";
}

function impactoSesion(nivel: FichaAccion["priorityLevel"]): Impacto {
  if (nivel === "critica" || nivel === "alta") return "alto";
  if (nivel === "media") return "medio";
  return "bajo";
}

function esfuerzoSesion(esfuerzo: FichaAccion["effort"]): Esfuerzo {
  return esfuerzo === "bajo" ? "bajo" : esfuerzo === "alto" ? "alto" : "medio";
}

function horizonteSesion(indice: number): Horizonte {
  if (indice < 2) return "ahora";
  if (indice < 4) return "despues";
  return "mas_adelante";
}

function mapearResultados(resultado: ResultadoPyme): Resultado[] {
  return resultado.dimensions.map((d) => ({
    id: d.dimensionId,
    dimension: d.nombre,
    puntajeDemostrativo: Math.round(d.score),
    nivel: d.maturityLabel,
    mensaje: d.interpretation,
    queObservamos:
      d.brechas[0]?.description ??
      d.fortalezas[0]?.description ??
      "Aún no hay evidencia suficiente para describir esta dimensión en detalle.",
    queSignifica: d.notas[0] ?? d.interpretation,
    fortalezas: d.fortalezas.map((h) => h.title),
    oportunidades: d.oportunidades.concat(d.brechas).map((h) => h.title),
    preguntasRelacionadas: [...new Set(d.brechas.flatMap((h) => h.evidenceRefs))].slice(0, 6),
    accionesRelacionadas: resultado.actions
      .filter((a) => a.dimensionId === d.dimensionId)
      .map((a) => a.id),
    esSimulado: false,
  }));
}

function mapearAcciones(resultado: ResultadoPyme): Accion[] {
  return resultado.actions.map((ficha, indice) => ({
    id: ficha.id,
    titulo: ficha.title,
    proposito: ficha.problem,
    porQueImporta: ficha.whyItMatters,
    prioridad: prioridadSesion(ficha.priorityLevel),
    impacto: impactoSesion(ficha.priorityLevel),
    esfuerzo: esfuerzoSesion(ficha.effort),
    horizonte: horizonteSesion(indice),
    duracionEstimada: ficha.duration,
    responsableSugerido: ficha.ownerRole,
    pasos: ficha.steps,
    dimensionId: ficha.dimensionId,
    estado: "pendiente",
    esSimulada: false,
  }));
}

/**
 * Construye el estado del recorrido a partir de la ejecución integrada.
 * Devuelve null si la cadena no produjo resultados utilizables.
 */
export function sincronizarDesdeEjecucion(
  ejecucion: EjecucionIntegrada
): SesionSincronizada | null {
  const { resultado } = ejecucion;
  if (!resultado) return null;

  const totalPreguntas =
    ejecucion.salidaMotor?.quality.aplicables ?? ejecucion.respuestas.length;
  const respondidas = ejecucion.salidaMotor?.quality.respondidas ?? ejecucion.respuestas.length;
  const progreso = totalPreguntas > 0 ? Math.round((respondidas / totalPreguntas) * 100) : 100;

  return {
    diagnostico: {
      estado: "completado",
      progreso: Math.min(100, Math.max(0, progreso)),
      respuestasRevisadas: true,
      resultadosGenerados: true,
      respondidasObligatorias: respondidas,
      totalPreguntas,
    },
    respuestas: ejecucion.respuestas.map((r) => ({
      preguntaId: r.questionId,
      valor: r.value as Respuesta["valor"],
      fechaGuardado: r.answeredAt ?? new Date().toISOString(),
    })),
    resultados: mapearResultados(resultado),
    prioridades: (resultado.topPriorities.length > 0
      ? resultado.topPriorities
      : resultado.priorities
    ).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      razon: p.rationale,
      dimensionId: p.dimensionId,
    })),
    acciones: mapearAcciones(resultado),
  };
}
