/**
 * Orquestador del POC-05: convierte la salida del Motor de Conocimiento en el
 * contrato de resultados, prioridades y Fichas de Acción.
 * Función pura y determinista: no toca almacenamiento ni interfaz.
 */

import type { SalidaMotor } from "@/lib/motor/tipos";
import { bandaMadurezResultado, nivelDeConfianza } from "./niveles";
import { construirPrioridades, prioridadesPrincipales } from "./priorizacion";
import { generarFichas } from "./fichas";
import {
  aHallazgoVista,
  agruparHallazgos,
  calcularPuntajeGlobal,
  completitudDe,
  construirDimensiones,
  construirResumenEjecutivo,
} from "./sintesis";
import {
  ACTION_CATALOG_VERSION,
  RESULTS_VERSION,
  type ResultadoPyme,
} from "./tipos";

export function generarResultados(salida: SalidaMotor): ResultadoPyme {
  const hallazgos = salida.findings
    .map(aHallazgoVista)
    .sort((a, b) => a.dimensionId.localeCompare(b.dimensionId) || a.id.localeCompare(b.id));
  const grupos = agruparHallazgos(hallazgos);
  const puntajeGlobal = calcularPuntajeGlobal(salida);
  const banda = bandaMadurezResultado(puntajeGlobal);
  const completitud = completitudDe(salida);
  const prioridades = construirPrioridades(salida);
  const acciones = generarFichas(salida, prioridades, hallazgos);
  const dimensiones = construirDimensiones(salida, hallazgos);

  return {
    id: `RES-${salida.metadata.executionId}`,
    diagnosticId: salida.metadata.diagnosisId,
    executionId: salida.metadata.executionId,
    generatedAt: salida.metadata.timestamp,
    overallScore: puntajeGlobal,
    maturityLevel: banda.nivel,
    maturityLabel: banda.etiqueta,
    maturityInterpretation: banda.interpretacion,
    summary: construirResumenEjecutivo(puntajeGlobal, hallazgos, completitud),
    completeness: completitud,
    cobertura: salida.quality.coverage,
    confidence: salida.quality.confidence,
    nivelConfianza: nivelDeConfianza(salida.quality.confidence),
    dimensions: dimensiones,
    ...grupos,
    priorities: prioridades,
    topPriorities: prioridadesPrincipales(prioridades),
    actions: acciones,
    advertencias: salida.quality.warnings,
    dimensionesAfectadas: dimensiones.filter((d) => d.parcial).map((d) => d.nombre),
    versions: {
      resultsVersion: RESULTS_VERSION,
      actionCatalogVersion: ACTION_CATALOG_VERSION,
      ruleSetVersion: salida.metadata.ruleSetVersion,
      catalogVersion: salida.metadata.catalogVersion,
      engineVersion: salida.metadata.engineVersion,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Filtros y ordenamiento de Fichas de Acción (POC-05, 9 · CA-05-08)   */
/* ------------------------------------------------------------------ */

export interface FiltrosAcciones {
  nivel: "todos" | "critica" | "alta" | "media" | "baja";
  dimensionId: string;
  esfuerzo: "todos" | "bajo" | "medio" | "alto";
  impacto: "todos" | "alto" | "medio" | "bajo";
  orden: "prioridad" | "esfuerzo" | "impacto" | "dimension";
}

export const filtrosIniciales: FiltrosAcciones = {
  nivel: "todos",
  dimensionId: "todas",
  esfuerzo: "todos",
  impacto: "todos",
  orden: "prioridad",
};

const rangoNivel: Record<string, number> = { critica: 4, alta: 3, media: 2, baja: 1 };
const rangoEsfuerzo: Record<string, number> = { bajo: 1, medio: 2, alto: 3 };

function bandaImpacto(resultado: ResultadoPyme, accion: ResultadoPyme["actions"][number]) {
  const prioridad = resultado.priorities.find((p) => p.id === accion.priorityId);
  const impacto = prioridad?.variables.impact ?? 3;
  if (impacto >= 4) return "alto";
  if (impacto === 3) return "medio";
  return "bajo";
}

export function filtrarAcciones(
  resultado: ResultadoPyme,
  filtros: FiltrosAcciones
): ResultadoPyme["actions"] {
  const filtradas = resultado.actions.filter((accion) => {
    if (filtros.nivel !== "todos" && accion.priorityLevel !== filtros.nivel) return false;
    if (filtros.dimensionId !== "todas" && accion.dimensionId !== filtros.dimensionId) return false;
    if (filtros.esfuerzo !== "todos" && accion.effort !== filtros.esfuerzo) return false;
    if (filtros.impacto !== "todos" && bandaImpacto(resultado, accion) !== filtros.impacto) {
      return false;
    }
    return true;
  });

  return [...filtradas].sort((a, b) => {
    if (filtros.orden === "esfuerzo") {
      return (
        (rangoEsfuerzo[a.effort] ?? 2) - (rangoEsfuerzo[b.effort] ?? 2) ||
        b.priorityScore - a.priorityScore
      );
    }
    if (filtros.orden === "impacto") {
      const impactoA = resultado.priorities.find((p) => p.id === a.priorityId)?.variables.impact ?? 3;
      const impactoB = resultado.priorities.find((p) => p.id === b.priorityId)?.variables.impact ?? 3;
      return impactoB - impactoA || b.priorityScore - a.priorityScore;
    }
    if (filtros.orden === "dimension") {
      return a.dimensionId.localeCompare(b.dimensionId) || b.priorityScore - a.priorityScore;
    }
    return (
      (rangoNivel[b.priorityLevel] ?? 0) - (rangoNivel[a.priorityLevel] ?? 0) ||
      b.priorityScore - a.priorityScore ||
      (rangoEsfuerzo[a.effort] ?? 2) - (rangoEsfuerzo[b.effort] ?? 2)
    );
  });
}
