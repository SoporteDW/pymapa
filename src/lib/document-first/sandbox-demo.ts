/**
 * Moda Origen · Demo Document-First — sandbox local (navegador).
 * Aislado de producción: no importa el cliente de Cloud ni funciones de servidor.
 * Historial append-only: confirmar, editar o revertir nunca borra lo anterior.
 */

import type { ValorRespuesta } from "@/lib/diagnostico/tipos";
import type { CampoPlan } from "./plan-import";
import type { EstadoCobertura } from "./reglas-g1";

export const CLAVE_SANDBOX_DF = "pymapa:demo-document-first:v1";

export type DecisionPropuesta = "PROPOSED" | "CONFIRMED" | "REJECTED" | "NEEDS_CLARIFICATION" | "SUPERSEDED";

export interface ProcedenciaDoc {
  documento: string;
  sha256: string;
  pagina: number;
  cita: string;
  regla: string;
}

export interface RespuestaSandbox {
  valor: ValorRespuesta;
  origen: "manual" | "documento";
  procedencia?: ProcedenciaDoc;
  en: string;
}

export interface EventoHistorial {
  preguntaId: string;
  accion: "CONFIRMADA" | "EDITADA_Y_CONFIRMADA" | "MANUAL" | "REVERTIDA" | "RECHAZADA";
  anterior: RespuestaSandbox | null;
  nueva: RespuestaSandbox | null;
  en: string;
}

export interface PropuestaSandbox {
  preguntaId: string;
  estadoCobertura: EstadoCobertura;
  valorPropuesto: ValorRespuesta | null;
  valorEditado: ValorRespuesta | null;
  decision: DecisionPropuesta;
  procedencia: ProcedenciaDoc | null;
}

export interface CampoPlanSandbox {
  campo: CampoPlan;
  etiqueta: string;
  valor: string;
  pagina: number;
  cita: string;
}

export interface PrioridadPlanSandbox {
  codigo: string;
  titulo: string;
  vinculoLegacyId: string | null;
  campos: CampoPlanSandbox[];
  /** Nunca "ejecutada" ni "validada": solo propuesta o confirmada como plan. */
  decision: "PROPUESTA" | "CONFIRMADA_COMO_PLAN" | "RECHAZADA";
  documento: { nombre: string; sha256: string };
  confirmadaEn?: string;
}

export interface EstadoSandboxDF {
  respuestas: Record<string, RespuestaSandbox>;
  historial: EventoHistorial[];
  documentoDiagnostico: { nombre: string; sha256: string; paginas: number; fragmentos: number; cargadoEn: string } | null;
  propuestas: PropuestaSandbox[];
  plan: PrioridadPlanSandbox[];
}

export function estadoVacio(): EstadoSandboxDF {
  return { respuestas: {}, historial: [], documentoDiagnostico: null, propuestas: [], plan: [] };
}

export function leerSandbox(): EstadoSandboxDF {
  if (typeof window === "undefined") return estadoVacio();
  try {
    const raw = window.localStorage.getItem(CLAVE_SANDBOX_DF);
    return raw ? { ...estadoVacio(), ...(JSON.parse(raw) as EstadoSandboxDF) } : estadoVacio();
  } catch {
    return estadoVacio();
  }
}

export function guardarSandbox(e: EstadoSandboxDF): void {
  if (typeof window !== "undefined") window.localStorage.setItem(CLAVE_SANDBOX_DF, JSON.stringify(e));
}

/** Registra una respuesta (manual o confirmada desde documento) con historial. */
export function registrarRespuesta(
  e: EstadoSandboxDF,
  preguntaId: string,
  nueva: RespuestaSandbox,
  accion: EventoHistorial["accion"]
): EstadoSandboxDF {
  const anterior = e.respuestas[preguntaId] ?? null;
  return {
    ...e,
    respuestas: { ...e.respuestas, [preguntaId]: nueva },
    historial: [...e.historial, { preguntaId, accion, anterior, nueva, en: nueva.en }],
  };
}

/** Revierte al valor anterior al último cambio (agrega un evento; no borra). */
export function revertirRespuesta(e: EstadoSandboxDF, preguntaId: string, en: string): EstadoSandboxDF {
  const ultimo = [...e.historial].reverse().find((h) => h.preguntaId === preguntaId && h.accion !== "REVERTIDA" && h.accion !== "RECHAZADA");
  if (!ultimo) return e;
  const respuestas = { ...e.respuestas };
  if (ultimo.anterior) respuestas[preguntaId] = ultimo.anterior;
  else delete respuestas[preguntaId];
  return {
    ...e,
    respuestas,
    historial: [...e.historial, { preguntaId, accion: "REVERTIDA", anterior: e.respuestas[preguntaId] ?? null, nueva: ultimo.anterior, en }],
  };
}
