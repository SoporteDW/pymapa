/**
 * B5 · Máquina de estados del ciclo de entrega y validación.
 *
 * Pendiente → En ejecución → Entregado → (Requiere ajustes ⇄ Entregado) → Validado
 */

import type { EstadoEjecucion } from "./tipos";

export const ORDEN_ESTADOS_EJECUCION: EstadoEjecucion[] = [
  "pendiente",
  "en_ejecucion",
  "entregado",
  "requiere_ajustes",
  "validado",
];

export const etiquetaEstadoEjecucion: Record<EstadoEjecucion, string> = {
  pendiente: "Pendiente",
  en_ejecucion: "En ejecución",
  entregado: "Entregado",
  requiere_ajustes: "Requiere ajustes",
  validado: "Validado",
};

export const descripcionEstadoEjecucion: Record<EstadoEjecucion, string> = {
  pendiente: "La actividad está priorizada, pero aún no se comenzó a trabajar.",
  en_ejecucion: "El equipo está trabajando el instrumento metodológico de esta actividad.",
  entregado: "El entregable fue enviado a revisión y está en espera de resultado.",
  requiere_ajustes: "La revisión identificó ajustes concretos antes de poder validar.",
  validado: "El entregable cumple los criterios y la actividad queda validada.",
};

const TRANSICIONES: Record<EstadoEjecucion, EstadoEjecucion[]> = {
  pendiente: ["en_ejecucion"],
  en_ejecucion: ["entregado", "pendiente"],
  entregado: ["validado", "requiere_ajustes"],
  requiere_ajustes: ["en_ejecucion", "entregado"],
  // B7 · el recorrido puede volver sobre sí mismo: si el seguimiento muestra
  // que la ejecución no produjo resultado, la actividad validada se reabre.
  validado: ["en_ejecucion"],
};


export function transicionPermitida(desde: EstadoEjecucion, hacia: EstadoEjecucion): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function puedeEntregar(estado: EstadoEjecucion): boolean {
  return estado === "en_ejecucion" || estado === "requiere_ajustes";
}

export function estaCerrada(estado: EstadoEjecucion): boolean {
  return estado === "validado";
}

/** Progreso del ciclo (0–1), útil para indicadores sin duplicar lógica en la UI. */
export function avanceCiclo(estado: EstadoEjecucion): number {
  switch (estado) {
    case "pendiente":
      return 0;
    case "en_ejecucion":
      return 0.35;
    case "entregado":
      return 0.7;
    case "requiere_ajustes":
      return 0.55;
    case "validado":
      return 1;
  }
}
