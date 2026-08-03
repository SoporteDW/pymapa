/**
 * Reglas de cálculo de indicadores (POC-07, secciones 6 y 7).
 * Funciones deterministas y reutilizables: ninguna ponderación vive en la
 * interfaz y ningún valor se inventa cuando el origen no existe.
 */

import { calcularAvance } from "@/lib/roadmap/avance";
import { estadoDerivado, etiquetaEstado } from "@/lib/roadmap/estados";
import { diferenciaDias, hoyISO } from "@/lib/roadmap/fechas";
import type { AccionRoadmap, EstadoAccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";
import type {
  BloqueoDashboard,
  CumplimientoFechas,
  ItemDistribucionEstado,
} from "./tipos";

/** Días que definen el tramo "próxima a vencer" del dashboard (POC-07, 7). */
export const DIAS_PROXIMO_VENCIMIENTO = 7;
/** Umbral de puntuación de prioridad considerado tramo superior (POC-05, 7.3). */
export const UMBRAL_PRIORIDAD_CRITICA = 4;
/** Días sin registros que se consideran ausencia de actividad (POC-07, 8.3). */
export const DIAS_SIN_ACTIVIDAD = 14;

const ESTADOS_FINALES: EstadoAccionRoadmap[] = ["COMPLETADA", "DESCARTADA"];

/** Ponderación de una acción: su puntuación de prioridad o 1 si no existe. */
export function pesoAccion(accion: AccionRoadmap): number {
  return accion.prioridadScore > 0 ? accion.prioridadScore : 1;
}

export function accionesActivas(acciones: AccionRoadmap[]): AccionRoadmap[] {
  return acciones.filter((a) => a.estado !== "DESCARTADA");
}

/** KPI-02: suma de ponderaciones completadas ÷ ponderaciones activas × 100. */
export function avanceRoadmap(acciones: AccionRoadmap[]): number | null {
  const activas = accionesActivas(acciones);
  if (activas.length === 0) return null;
  const total = activas.reduce((suma, a) => suma + pesoAccion(a), 0);
  if (total === 0) return null;
  const completado = activas
    .filter((a) => a.estado === "COMPLETADA")
    .reduce((suma, a) => suma + pesoAccion(a), 0);
  return Math.round((completado / total) * 100);
}

/** Avance operativo declarado (checklist o porcentaje) para vistas de dimensión. */
export function avancePromedio(acciones: AccionRoadmap[]): number | null {
  const activas = accionesActivas(acciones);
  if (activas.length === 0) return null;
  const suma = activas.reduce((total, a) => total + calcularAvance(a), 0);
  return Math.round(suma / activas.length);
}

export function esVencida(accion: AccionRoadmap, hoy = hoyISO()): boolean {
  if (!accion.fechaObjetivo) return false;
  if (ESTADOS_FINALES.includes(accion.estado)) return false;
  return accion.fechaObjetivo < hoy;
}

/** Próxima a vencer: fecha objetivo entre hoy y los siguientes 7 días. */
export function esProximaAVencer(accion: AccionRoadmap, hoy = hoyISO()): boolean {
  if (!accion.fechaObjetivo || esVencida(accion, hoy)) return false;
  if (ESTADOS_FINALES.includes(accion.estado)) return false;
  const dias = diferenciaDias(hoy, accion.fechaObjetivo);
  return dias >= 0 && dias <= DIAS_PROXIMO_VENCIMIENTO;
}

/** Prioridad crítica: marcada como crítica o puntuación en el tramo superior. */
export function esCritica(accion: AccionRoadmap): boolean {
  return (
    accion.prioridadOperativa === "critica" ||
    accion.prioridadOrigen === "critica" ||
    accion.prioridadScore >= UMBRAL_PRIORIDAD_CRITICA
  );
}

/** KPI-04: acciones críticas pendientes, en curso, pausadas o bloqueadas. */
export function prioridadesCriticas(acciones: AccionRoadmap[]): AccionRoadmap[] {
  return acciones
    .filter((a) => esCritica(a) && !ESTADOS_FINALES.includes(a.estado))
    .sort((a, b) => b.prioridadScore - a.prioridadScore || a.orden - b.orden);
}

/** KPI-03: distribución por estado derivado (incluye dependencias cumplidas). */
export function distribucionEstados(
  roadmap: Roadmap,
  acciones: AccionRoadmap[]
): ItemDistribucionEstado[] {
  const orden: EstadoAccionRoadmap[] = [
    "PENDIENTE",
    "LISTA",
    "EN_CURSO",
    "PAUSADA",
    "BLOQUEADA",
    "COMPLETADA",
    "DESCARTADA",
  ];
  const total = acciones.length;
  return orden.map((estado) => {
    const cantidad = acciones.filter((a) => estadoDerivado(roadmap, a) === estado).length;
    return {
      estado,
      etiqueta: etiquetaEstado[estado],
      cantidad,
      porcentaje: total > 0 ? Math.round((cantidad / total) * 100) : 0,
    };
  });
}

/** KPI-05: cumplimiento de fechas sobre acciones activas con fecha objetivo. */
export function cumplimientoFechas(
  acciones: AccionRoadmap[],
  hoy = hoyISO()
): CumplimientoFechas {
  const activas = accionesActivas(acciones);
  const vencidas = activas.filter((a) => esVencida(a, hoy)).length;
  const proximas = activas.filter((a) => esProximaAVencer(a, hoy)).length;
  const sinFecha = activas.filter((a) => !a.fechaObjetivo).length;
  const conFecha = activas.filter((a) => Boolean(a.fechaObjetivo)).length;
  const aTiempo = conFecha - vencidas;
  return {
    aTiempo,
    vencidas,
    proximas,
    sinFecha,
    totalConFecha: conFecha,
    porcentajeATiempo: conFecha > 0 ? Math.round((aTiempo / conFecha) * 100) : null,
  };
}

/**
 * KPI-07 · impacto atendido: impacto completado + 50 % del impacto en curso,
 * sobre el impacto total de las acciones activas. El impacto se aproxima con
 * la ponderación de prioridad calculada en el POC-05.
 */
export function impactoAtendido(acciones: AccionRoadmap[]): number | null {
  const activas = accionesActivas(acciones);
  if (activas.length === 0) return null;
  const total = activas.reduce((suma, a) => suma + pesoAccion(a), 0);
  if (total === 0) return null;
  const completado = activas
    .filter((a) => a.estado === "COMPLETADA")
    .reduce((suma, a) => suma + pesoAccion(a), 0);
  const enCurso = activas
    .filter((a) => a.estado === "EN_CURSO")
    .reduce((suma, a) => suma + pesoAccion(a), 0);
  return Math.round(((completado + enCurso * 0.5) / total) * 100);
}

/** Antigüedad de un bloqueo: días desde su detección hasta hoy o su resolución. */
export function antiguedadBloqueo(
  fechaDeteccion: string,
  fechaResolucion: string | null,
  hoy = hoyISO()
): number {
  const fin = (fechaResolucion ?? hoy).slice(0, 10);
  return Math.max(0, diferenciaDias(fechaDeteccion.slice(0, 10), fin));
}

/** KPI-08: bloqueos abiertos ordenados por antigüedad descendente. */
export function bloqueosActivos(
  roadmap: Roadmap,
  acciones: AccionRoadmap[],
  hoy = hoyISO()
): BloqueoDashboard[] {
  const visibles = new Set(acciones.map((a) => a.id));
  return roadmap.bloqueos
    .filter((b) => b.estado === "abierto" && visibles.has(b.accionId))
    .map((bloqueo) => {
      const accion = roadmap.acciones.find((a) => a.id === bloqueo.accionId);
      return {
        bloqueoId: bloqueo.id,
        accionId: bloqueo.accionId,
        accionTitulo: accion?.titulo ?? "Acción no disponible",
        descripcion: bloqueo.descripcion,
        tipo: bloqueo.tipo,
        fechaDeteccion: bloqueo.fechaDeteccion,
        antiguedadDias: antiguedadBloqueo(bloqueo.fechaDeteccion, bloqueo.fechaResolucion, hoy),
        dimensionId: accion?.origen.dimensionId ?? "",
      };
    })
    .sort((a, b) => b.antiguedadDias - a.antiguedadDias);
}

const RANGO_PRIORIDAD: Record<string, number> = { critica: 4, alta: 3, media: 2, baja: 1 };
const FACTIBILIDAD_ESFUERZO: Record<string, number> = { bajo: 3, medio: 2, alto: 1 };

/** Puntuación compuesta de la recomendación: prioridad, impacto, urgencia y factibilidad. */
export function puntuacionRecomendacion(accion: AccionRoadmap, hoy = hoyISO()): number {
  const prioridad = RANGO_PRIORIDAD[accion.prioridadOperativa] ?? 1;
  const impacto = pesoAccion(accion);
  const urgencia = esVencida(accion, hoy) ? 3 : esProximaAVencer(accion, hoy) ? 2 : 1;
  const factibilidad = FACTIBILIDAD_ESFUERZO[accion.esfuerzo] ?? 2;
  return prioridad * 2 + impacto + urgencia * 1.5 + factibilidad;
}

/**
 * KPI-10 · próxima acción recomendada. Excluye completadas, descartadas y
 * bloqueadas, y las que tienen dependencias sin cumplir.
 */
export function proximaAccionRecomendada(
  roadmap: Roadmap,
  acciones: AccionRoadmap[],
  hoy = hoyISO()
): AccionRoadmap | null {
  const candidatas = acciones.filter((accion) => {
    if (ESTADOS_FINALES.includes(accion.estado)) return false;
    if (accion.estado === "BLOQUEADA") return false;
    const derivado = estadoDerivado(roadmap, accion);
    return derivado !== "PENDIENTE" || accion.estado === "EN_CURSO";
  });
  if (candidatas.length === 0) return null;
  return (
    [...candidatas].sort(
      (a, b) =>
        Number(b.estado === "EN_CURSO") - Number(a.estado === "EN_CURSO") ||
        puntuacionRecomendacion(b, hoy) - puntuacionRecomendacion(a, hoy) ||
        a.orden - b.orden
    )[0] ?? null
  );
}
