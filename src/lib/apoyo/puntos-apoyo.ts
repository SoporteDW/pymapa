/**
 * Puntos de Apoyo (iteración de refinamiento UX).
 *
 * Una actividad de transformación digital no siempre se resuelve dentro de la
 * plataforma. Este módulo deriva, de forma determinista y sin modificar el
 * motor ni las reglas del diagnóstico, qué apoyos externos requiere una acción.
 * No bloquea el recorrido: solo informa.
 */

import type { FichaAccion } from "@/lib/resultados/tipos";
import type { AccionRoadmap } from "@/lib/roadmap/tipos";

export type TipoPuntoApoyo =
  | "consultor"
  | "decision_gerencial"
  | "documento"
  | "evidencia"
  | "validacion_tecnica";

export interface PuntoApoyo {
  tipo: TipoPuntoApoyo;
  titulo: string;
  descripcion: string;
}

const catalogo: Record<TipoPuntoApoyo, PuntoApoyo> = {
  consultor: {
    tipo: "consultor",
    titulo: "Requiere consultor",
    descripcion:
      "Por su alcance conviene apoyarse en un especialista externo para ejecutarla bien la primera vez.",
  },
  decision_gerencial: {
    tipo: "decision_gerencial",
    titulo: "Requiere decisión gerencial",
    descripcion:
      "Necesita una decisión de la dirección (presupuesto, prioridad o asignación de personas).",
  },
  documento: {
    tipo: "documento",
    titulo: "Requiere documento adicional",
    descripcion:
      "Debes preparar o formalizar un documento de soporte antes de darla por terminada.",
  },
  evidencia: {
    tipo: "evidencia",
    titulo: "Requiere evidencia documental",
    descripcion: "Al cerrarla debes adjuntar una evidencia verificable de lo realizado.",
  },
  validacion_tecnica: {
    tipo: "validacion_tecnica",
    titulo: "Requiere validación técnica",
    descripcion:
      "Conviene validar la información o la solución con alguien con criterio técnico antes de avanzar.",
  },
};

export function puntoApoyo(tipo: TipoPuntoApoyo): PuntoApoyo {
  return catalogo[tipo];
}

interface EntradaApoyo {
  esfuerzo: string;
  prioridad: string;
  requiereValidacion: boolean;
  dimensionId: string;
  tieneIndicadores: boolean;
}

function derivar(entrada: EntradaApoyo): PuntoApoyo[] {
  const tipos = new Set<TipoPuntoApoyo>();
  if (entrada.requiereValidacion) tipos.add("validacion_tecnica");
  if (entrada.esfuerzo === "alto") tipos.add("consultor");
  if (entrada.prioridad === "critica" || entrada.prioridad === "alta") {
    tipos.add("decision_gerencial");
  }
  if (/gobierno|estrategia|datos|proceso/i.test(entrada.dimensionId)) tipos.add("documento");
  if (entrada.tieneIndicadores) tipos.add("evidencia");
  return [...tipos].map((tipo) => catalogo[tipo]);
}

/** Puntos de apoyo de una Ficha de Acción (Plan de Acción). */
export function puntosApoyoDeFicha(ficha: FichaAccion): PuntoApoyo[] {
  return derivar({
    esfuerzo: ficha.effort,
    prioridad: ficha.priorityLevel,
    requiereValidacion: Boolean(ficha.requiereValidacion),
    dimensionId: ficha.dimensionId,
    tieneIndicadores: ficha.indicators.length > 0,
  });
}

/** Puntos de apoyo de una acción del Roadmap. */
export function puntosApoyoDeAccion(accion: AccionRoadmap): PuntoApoyo[] {
  return derivar({
    esfuerzo: accion.esfuerzo,
    prioridad: accion.prioridadOperativa,
    requiereValidacion: accion.requiereValidacion,
    dimensionId: accion.origen.dimensionId,
    tieneIndicadores: accion.indicadores.length > 0,
  });
}
