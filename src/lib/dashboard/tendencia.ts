/**
 * Tendencias del dashboard (POC-07, sección 5 · zona Tendencia).
 * Se construyen exclusivamente con datos históricos reales del Roadmap:
 * cuando no hay suficientes puntos se declara "sin_datos" y no se simulan valores.
 */

import { dentroDelPeriodo } from "./filtros";
import { avanceRoadmap } from "./metricas";
import { etiquetaMes, primerDiaDeMes } from "@/lib/roadmap/fechas";
import type { AccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";
import type { RangoPeriodo, SerieTendencia, TrendPoint } from "./tipos";

/** Acciones completadas acumuladas por mes dentro del periodo (KPI-02/KPI-09). */
export function serieAccionesCompletadas(
  roadmap: Roadmap,
  acciones: AccionRoadmap[],
  rango: RangoPeriodo
): SerieTendencia {
  const visibles = new Set(acciones.map((a) => a.id));
  const cierres = roadmap.historial
    .filter(
      (r) =>
        r.tipo === "cambio_estado" &&
        r.estadoNuevo === "COMPLETADA" &&
        visibles.has(r.accionId) &&
        dentroDelPeriodo(r.fecha, rango)
    )
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const porMes = new Map<string, number>();
  for (const cierre of cierres) {
    const mes = primerDiaDeMes(cierre.fecha.slice(0, 10));
    porMes.set(mes, (porMes.get(mes) ?? 0) + 1);
  }

  let acumulado = 0;
  const puntos: TrendPoint[] = [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, cantidad]) => {
      acumulado += cantidad;
      return {
        metricId: "KPI-02" as const,
        date: mes,
        value: acumulado,
        etiqueta: etiquetaMes(mes),
      };
    });

  return {
    metricId: "KPI-02",
    titulo: "Acciones completadas (acumulado)",
    puntos,
    status: puntos.length > 0 ? "disponible" : "sin_datos",
    nota:
      puntos.length > 0
        ? "Cierres registrados en el periodo seleccionado."
        : "Aún no hay acciones completadas registradas en este periodo.",
  };
}

/**
 * Evolución del índice de madurez. El MVP Alfa mantiene un único diagnóstico
 * vigente, por lo que la serie sólo tiene un punto hasta que exista un segundo
 * diagnóstico; no se generan valores intermedios.
 */
export function serieIndiceMadurez(
  score: number,
  fecha: string,
  progresoActual: number | null
): SerieTendencia {
  const puntos: TrendPoint[] = [
    {
      metricId: "KPI-01",
      date: fecha.slice(0, 10),
      value: Math.round(score),
      etiqueta: etiquetaMes(fecha.slice(0, 10)),
    },
  ];
  return {
    metricId: "KPI-01",
    titulo: "Índice general de madurez",
    puntos,
    status: "sin_datos",
    nota:
      progresoActual !== null
        ? `Sólo existe un diagnóstico vigente. La comparación aparecerá al repetir el diagnóstico; el avance del plan es hoy del ${progresoActual}%.`
        : "Sólo existe un diagnóstico vigente: la comparación aparecerá al repetir el diagnóstico.",
  };
}

export function tendencias(
  roadmap: Roadmap | null,
  acciones: AccionRoadmap[],
  rango: RangoPeriodo,
  score: number,
  fechaDiagnostico: string
): SerieTendencia[] {
  const progreso = roadmap ? avanceRoadmap(acciones) : null;
  const series = [serieIndiceMadurez(score, fechaDiagnostico, progreso)];
  if (roadmap) series.push(serieAccionesCompletadas(roadmap, acciones, rango));
  return series;
}
