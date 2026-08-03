/**
 * Cálculo de avance y resumen operativo (POC-06, secciones 8 y 13).
 * Progreso honesto: se deriva de estados, checklist y avance declarado.
 */

import { estadoDerivado } from "./estados";
import { hoyISO, diferenciaDias } from "./fechas";
import type { AccionRoadmap, ResumenRoadmap, Roadmap } from "./tipos";

export const PASOS_AVANCE = [0, 25, 50, 75, 100] as const;

/** Avance por checklist cuando existe; si no, el valor declarado (POC-06, 13). */
export function calcularAvance(accion: AccionRoadmap): number {
  if (accion.estado === "COMPLETADA") return 100;
  if (accion.checklist.length > 0) {
    const completados = accion.checklist.filter((p) => p.completado).length;
    return Math.round((completados / accion.checklist.length) * 100);
  }
  return accion.avance;
}

export function usaChecklist(accion: AccionRoadmap): boolean {
  return accion.checklist.length > 0;
}

/** Avance ponderado: las descartadas se excluyen del universo medible. */
export function progresoGeneral(roadmap: Roadmap): number {
  const medibles = roadmap.acciones.filter((a) => a.estado !== "DESCARTADA");
  if (medibles.length === 0) return 0;
  const suma = medibles.reduce((total, accion) => total + calcularAvance(accion), 0);
  return Math.round(suma / medibles.length);
}

export function estaVencida(accion: AccionRoadmap, hoy = hoyISO()): boolean {
  if (!accion.fechaObjetivo) return false;
  if (accion.estado === "COMPLETADA" || accion.estado === "DESCARTADA") return false;
  return accion.fechaObjetivo < hoy;
}

export function estaProximaAVencer(accion: AccionRoadmap, hoy = hoyISO()): boolean {
  if (!accion.fechaObjetivo || estaVencida(accion, hoy)) return false;
  if (accion.estado === "COMPLETADA" || accion.estado === "DESCARTADA") return false;
  const dias = diferenciaDias(hoy, accion.fechaObjetivo);
  return dias >= 0 && dias <= 3;
}

export function sinResponsable(accion: AccionRoadmap): boolean {
  return accion.responsable.trim().length === 0;
}

export function sinFecha(accion: AccionRoadmap): boolean {
  return !accion.fechaObjetivo;
}

export function resumirRoadmap(roadmap: Roadmap, hoy = hoyISO()): ResumenRoadmap {
  const cuenta = (predicado: (accion: AccionRoadmap) => boolean) =>
    roadmap.acciones.filter(predicado).length;

  const efectivo = (accion: AccionRoadmap) => estadoDerivado(roadmap, accion);

  return {
    totalAcciones: roadmap.acciones.length,
    progresoGeneral: progresoGeneral(roadmap),
    pendientes: cuenta((a) => efectivo(a) === "PENDIENTE"),
    listas: cuenta((a) => efectivo(a) === "LISTA"),
    enCurso: cuenta((a) => a.estado === "EN_CURSO"),
    pausadas: cuenta((a) => a.estado === "PAUSADA"),
    bloqueadas: cuenta((a) => a.estado === "BLOQUEADA"),
    completadas: cuenta((a) => a.estado === "COMPLETADA"),
    descartadas: cuenta((a) => a.estado === "DESCARTADA"),
    vencidas: cuenta((a) => estaVencida(a, hoy)),
    proximasAVencer: cuenta((a) => estaProximaAVencer(a, hoy)),
    sinResponsable: cuenta((a) => sinResponsable(a) && a.estado !== "DESCARTADA"),
    sinFecha: cuenta((a) => sinFecha(a) && a.estado !== "DESCARTADA"),
  };
}

export function estadoGeneralDe(roadmap: Roadmap): Roadmap["estadoGeneral"] {
  const activas = roadmap.acciones.filter((a) => a.estado !== "DESCARTADA");
  if (activas.length > 0 && activas.every((a) => a.estado === "COMPLETADA")) return "completado";
  if (roadmap.acciones.some((a) => a.estado !== "PENDIENTE" && a.estado !== "LISTA")) {
    return "en_ejecucion";
  }
  return "borrador";
}

/** Próxima acción recomendada: lista, sin bloqueo y de mayor prioridad (POC-06, 8). */
export function proximaAccion(roadmap: Roadmap): AccionRoadmap | null {
  const rango: Record<string, number> = { critica: 4, alta: 3, media: 2, baja: 1 };
  const candidatas = roadmap.acciones.filter((accion) => {
    if (accion.estado === "COMPLETADA" || accion.estado === "DESCARTADA") return false;
    if (accion.estado === "BLOQUEADA") return false;
    return estadoDerivado(roadmap, accion) !== "PENDIENTE" || accion.estado === "EN_CURSO";
  });

  if (candidatas.length === 0) return null;

  return (
    [...candidatas].sort(
      (a, b) =>
        Number(b.estado === "EN_CURSO") - Number(a.estado === "EN_CURSO") ||
        (rango[b.prioridadOperativa] ?? 0) - (rango[a.prioridadOperativa] ?? 0) ||
        b.prioridadScore - a.prioridadScore ||
        a.orden - b.orden
    )[0] ?? null
  );
}
