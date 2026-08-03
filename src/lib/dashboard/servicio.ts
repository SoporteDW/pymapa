/**
 * dashboardService (POC-07, secciones 5, 6, 7 y 13).
 * Orquesta los indicadores del dashboard a partir del resultado vigente
 * (POC-05) y del Roadmap (POC-06). Función pura: recibe datos y filtros y
 * devuelve un DashboardSnapshot; nunca lee almacenamiento ni el DOM.
 */

import { hoyISO } from "@/lib/roadmap/fechas";
import { construirActividad } from "./actividad";
import { construirAlertas } from "./alertas";
import { accionesSegunFiltros, rangoDePeriodo } from "./filtros";
import {
  accionesActivas,
  avancePromedio,
  avanceRoadmap,
  bloqueosActivos,
  cumplimientoFechas,
  distribucionEstados,
  esVencida,
  impactoAtendido,
  prioridadesCriticas,
  proximaAccionRecomendada,
} from "./metricas";
import { tendencias } from "./tendencia";
import type { ResultadoPyme } from "@/lib/resultados/tipos";
import type { AccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";
import type {
  DashboardFilters,
  DashboardSnapshot,
  ItemDimensionDashboard,
  MetricId,
  MetricValue,
  RangoPeriodo,
} from "./tipos";
import { DASHBOARD_VERSION } from "./tipos";

export interface EntradaDashboard {
  resultado: ResultadoPyme;
  roadmap: Roadmap | null;
  filtros: DashboardFilters;
  empresaId?: string;
  hoy?: string;
  /** Módulos que fallaron aguas arriba: habilitan el error parcial. */
  modulosConError?: string[];
}

function metrica(
  metricId: MetricId,
  titulo: string,
  value: number | null,
  unit: MetricValue["unit"],
  rango: RangoPeriodo,
  sourceIds: string[],
  contexto: string,
  detalle: MetricValue["detalle"] = null,
  texto: string | null = null
): MetricValue {
  return {
    metricId,
    titulo,
    value,
    texto,
    unit,
    status: value === null && texto === null ? "sin_datos" : "disponible",
    periodStart: rango.inicio,
    periodEnd: rango.fin,
    sourceIds,
    contexto,
    detalle,
  };
}

function dimensionesDashboard(
  resultado: ResultadoPyme,
  roadmap: Roadmap | null,
  acciones: AccionRoadmap[],
  hoy: string
): ItemDimensionDashboard[] {
  return resultado.dimensions.map((dimension) => {
    const suyas = acciones.filter((a) => a.origen.dimensionId === dimension.dimensionId);
    return {
      dimensionId: dimension.dimensionId,
      nombre: dimension.nombre,
      madurez: Math.round(dimension.score),
      nivel: dimension.maturityLevel,
      nivelLabel: dimension.maturityLabel,
      interpretacion: dimension.interpretation,
      avanceAcciones: roadmap && suyas.length > 0 ? avancePromedio(suyas) : null,
      totalAcciones: suyas.length,
      completadas: suyas.filter((a) => a.estado === "COMPLETADA").length,
      bloqueadas: suyas.filter((a) => a.estado === "BLOQUEADA").length,
      vencidas: suyas.filter((a) => esVencida(a, hoy)).length,
      hallazgos:
        dimension.fortalezas.length +
        dimension.brechas.length +
        dimension.riesgos.length +
        dimension.oportunidades.length,
      prioridades: resultado.priorities.filter((p) => p.dimensionId === dimension.dimensionId)
        .length,
      parcial: dimension.parcial,
    };
  });
}

export function construirDashboard(entrada: EntradaDashboard): DashboardSnapshot {
  const { resultado, roadmap, filtros } = entrada;
  const hoy = entrada.hoy ?? hoyISO();
  const rango = rangoDePeriodo(filtros.period, hoy);

  const acciones = roadmap ? accionesSegunFiltros(roadmap, filtros) : [];
  const activas = accionesActivas(acciones);
  const progreso = roadmap ? avanceRoadmap(acciones) : null;
  const impacto = roadmap ? impactoAtendido(acciones) : null;
  const distribucion = roadmap ? distribucionEstados(roadmap, acciones) : [];
  const cumplimiento = cumplimientoFechas(acciones, hoy);
  const criticas = roadmap ? prioridadesCriticas(acciones) : [];
  const bloqueos = roadmap ? bloqueosActivos(roadmap, acciones, hoy) : [];
  const recomendacion = roadmap ? proximaAccionRecomendada(roadmap, acciones, hoy) : null;
  const alertas = roadmap ? construirAlertas(roadmap, acciones, hoy) : [];
  const actividad = roadmap
    ? construirActividad(roadmap, acciones, rango, resultado.generatedAt)
    : [];
  const dimensiones = dimensionesDashboard(resultado, roadmap, acciones, hoy);

  const dimensionFiltro =
    filtros.dimensionId === "todas"
      ? null
      : (dimensiones.find((d) => d.dimensionId === filtros.dimensionId) ?? null);

  const scoreVisible = dimensionFiltro ? dimensionFiltro.madurez : Math.round(resultado.overallScore);
  const etiquetaVisible = dimensionFiltro ? dimensionFiltro.nivelLabel : resultado.maturityLabel;

  const metricas: Record<MetricId, MetricValue> = {
    "KPI-01": metrica(
      "KPI-01",
      "Índice general de madurez",
      scoreVisible,
      "puntos",
      rango,
      [resultado.executionId, resultado.diagnosticId],
      `${etiquetaVisible} · calculado el ${new Date(resultado.generatedAt).toLocaleDateString("es")}`,
      dimensionFiltro
        ? { tipo: "dimension", dimensionId: dimensionFiltro.dimensionId }
        : { tipo: "resultados" }
    ),
    "KPI-02": metrica(
      "KPI-02",
      "Avance del Roadmap",
      progreso,
      "porcentaje",
      rango,
      acciones.map((a) => a.id),
      roadmap
        ? `${activas.filter((a) => a.estado === "COMPLETADA").length} de ${activas.length} acciones activas completadas`
        : "Todavía no existe un plan de acción priorizado.",
      { tipo: "roadmap" }
    ),
    "KPI-03": metrica(
      "KPI-03",
      "Acciones por estado",
      roadmap ? acciones.length : null,
      "acciones",
      rango,
      acciones.map((a) => a.id),
      roadmap
        ? "Distribución operativa del plan según el estado vigente."
        : "Sin plan de acción no hay estados que distribuir.",
      { tipo: "roadmap" }
    ),
    "KPI-04": metrica(
      "KPI-04",
      "Prioridades críticas",
      roadmap ? criticas.length : null,
      "acciones",
      rango,
      criticas.map((a) => a.id),
      roadmap
        ? "Acciones críticas pendientes, en curso o bloqueadas."
        : "Se calculará cuando exista un plan de acción.",
      { tipo: "alertas" }
    ),
    "KPI-05": metrica(
      "KPI-05",
      "Cumplimiento de fechas",
      cumplimiento.porcentajeATiempo,
      "porcentaje",
      rango,
      activas.filter((a) => a.fechaObjetivo).map((a) => a.id),
      cumplimiento.totalConFecha > 0
        ? `${cumplimiento.aTiempo} a tiempo · ${cumplimiento.vencidas} vencidas · ${cumplimiento.proximas} próximas`
        : "Ninguna acción activa tiene fecha objetivo definida.",
      { tipo: "roadmap", soloVencidas: true }
    ),
    "KPI-06": metrica(
      "KPI-06",
      "Progreso por dimensión",
      dimensiones.length > 0 ? dimensiones.length : null,
      "acciones",
      rango,
      dimensiones.map((d) => d.dimensionId),
      "Madurez y avance comparables por dimensión del modelo.",
      { tipo: "resultados" }
    ),
    "KPI-07": metrica(
      "KPI-07",
      "Impacto potencial atendido",
      impacto,
      "porcentaje",
      rango,
      activas.map((a) => a.id),
      roadmap
        ? "Impacto completado más la mitad del impacto en curso, sobre el impacto activo."
        : "Requiere acciones priorizadas para calcularse.",
      { tipo: "roadmap" }
    ),
    "KPI-08": metrica(
      "KPI-08",
      "Bloqueos activos",
      roadmap ? bloqueos.length : null,
      "acciones",
      rango,
      bloqueos.map((b) => b.accionId),
      bloqueos.length > 0
        ? `El bloqueo más antiguo lleva ${bloqueos[0]!.antiguedadDias} día(s) abierto.`
        : roadmap
          ? "No hay impedimentos abiertos registrados."
          : "Requiere plan de acción.",
      { tipo: "roadmap", soloBloqueadas: true }
    ),
    "KPI-09": metrica(
      "KPI-09",
      "Actividad reciente",
      roadmap ? actividad.length : null,
      "eventos",
      rango,
      actividad.map((e) => e.id),
      `Eventos registrados en el periodo: ${rango.etiqueta.toLowerCase()}.`,
      { tipo: "roadmap" }
    ),
    "KPI-10": metrica(
      "KPI-10",
      "Próxima acción recomendada",
      null,
      "texto",
      rango,
      recomendacion ? [recomendacion.id, recomendacion.origen.fichaAccionId] : [],
      recomendacion
        ? `${recomendacion.origen.dimensionNombre} · prioridad ${recomendacion.prioridadOperativa}`
        : "No hay acciones disponibles para recomendar con los filtros actuales.",
      recomendacion ? { tipo: "accion", accionId: recomendacion.id } : null,
      recomendacion ? recomendacion.titulo : null
    ),
  };

  return {
    id: `dashboard-${resultado.executionId}`,
    companyId: entrada.empresaId ?? roadmap?.empresaId ?? "empresa-local",
    diagnosticId: resultado.diagnosticId,
    executionId: resultado.executionId,
    generatedAt: new Date().toISOString(),
    diagnosticGeneratedAt: resultado.generatedAt,
    roadmapUpdatedAt: roadmap?.fechaActualizacion ?? null,
    maturityScore: scoreVisible,
    maturityLabel: etiquetaVisible,
    roadmapProgress: progreso,
    impactCoverage: impacto,
    version: DASHBOARD_VERSION,
    esDemo: roadmap?.esDemo ?? false,
    filtros,
    periodo: rango,
    metricas,
    distribucionEstados: distribucion,
    cumplimiento,
    dimensiones,
    prioridadesCriticas: criticas,
    bloqueos,
    actividad,
    tendencias: tendencias(roadmap, acciones, rango, resultado.overallScore, resultado.generatedAt),
    recomendacion,
    alertas,
    accionesFiltradas: acciones,
    modulosConError: entrada.modulosConError ?? [],
  };
}
