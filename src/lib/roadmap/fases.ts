/**
 * Fases del Roadmap y reglas de horizonte (POC-06, secciones 2.1 y 6).
 * El horizonte se deduce de la prioridad, el esfuerzo y las dependencias.
 */

import type { EsfuerzoFicha, NivelPrioridad } from "@/lib/resultados/tipos";
import type { FaseId, FaseRoadmap } from "./tipos";

export const fasesRoadmap: FaseRoadmap[] = [
  {
    id: "ahora",
    nombre: "Ahora",
    orden: 1,
    rangoTemporal: "Próximas 4 a 6 semanas",
    descripcion: "Lo que conviene empezar de inmediato porque habilita todo lo demás.",
    criteriosDeSalida: "Las acciones están completadas o con avance verificable y evidencia.",
  },
  {
    id: "proximamente",
    nombre: "Próximamente",
    orden: 2,
    rangoTemporal: "Del segundo al cuarto mes",
    descripcion: "Mejoras que requieren preparación previa o dependen de la primera fase.",
    criteriosDeSalida: "Las dependencias de la fase anterior quedaron resueltas.",
  },
  {
    id: "mas_adelante",
    nombre: "Más adelante",
    orden: 3,
    rangoTemporal: "Del quinto mes en adelante",
    descripcion: "Consolidación y optimización una vez estabilizado lo esencial.",
    criteriosDeSalida: "El plan se revisa con un nuevo diagnóstico.",
  },
];

export function faseDe(id: FaseId): FaseRoadmap {
  return fasesRoadmap.find((f) => f.id === id) ?? fasesRoadmap[0]!;
}

export function ordenFase(id: FaseId): number {
  return faseDe(id).orden;
}

export const etiquetaFase: Record<FaseId, string> = {
  ahora: "Ahora",
  proximamente: "Próximamente",
  mas_adelante: "Más adelante",
};

/**
 * Horizonte sugerido (POC-06, 6 · tabla de prioridad/esfuerzo).
 * `tieneDependencia` empuja las acciones de alto esfuerzo a la fase siguiente.
 */
export function horizonteSugerido(
  prioridad: NivelPrioridad,
  esfuerzo: EsfuerzoFicha,
  tieneDependencia: boolean
): FaseId {
  const alta = prioridad === "critica" || prioridad === "alta";

  if (alta) {
    if (esfuerzo === "alto") return tieneDependencia ? "proximamente" : "ahora";
    return tieneDependencia ? "proximamente" : "ahora";
  }

  if (prioridad === "media") {
    if (esfuerzo === "bajo") return tieneDependencia ? "proximamente" : "ahora";
    return "proximamente";
  }

  return "mas_adelante";
}

/** Días estimados por esfuerzo, base de las fechas sugeridas (POC-06, 6.8). */
export function duracionEnDias(esfuerzo: EsfuerzoFicha): number {
  if (esfuerzo === "bajo") return 14;
  if (esfuerzo === "medio") return 35;
  return 75;
}

/** Desplazamiento inicial de cada fase respecto a la fecha de creación. */
export function desplazamientoFase(fase: FaseId): number {
  if (fase === "ahora") return 0;
  if (fase === "proximamente") return 42;
  return 120;
}
