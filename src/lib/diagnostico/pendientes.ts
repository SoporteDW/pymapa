/**
 * Macroentrega 5 · Cuestionario interrumpible.
 *
 * Una pyme real no responde 28 preguntas de una sola sesión: puede dejar una
 * pregunta pendiente, aplazarla ("todavía no puedo responder esto") o pedirla a
 * otra persona de la empresa. Ninguna de esas situaciones bloquea las demás
 * preguntas, pero el diagnóstico no puede cerrarse hasta completarlas.
 *
 * Función pura: no lee almacenamiento.
 */

import { obtenerDimension, preguntasEnOrden } from "./definicion";
import type { PreguntaDiagnostico } from "./tipos";

export type EstadoPregunta = "respondida" | "pendiente" | "aplazada" | "delegada";

export const etiquetaEstadoPregunta: Record<EstadoPregunta, string> = {
  respondida: "Respondida",
  pendiente: "Sin responder",
  aplazada: "Aplazada por ti",
  delegada: "Esperando respuesta de otra persona",
};

export interface PreguntaConEstado {
  id: string;
  texto: string;
  seccionNombre: string;
  estado: EstadoPregunta;
  /** Persona a la que se pidió la información, cuando está delegada. */
  responsable?: string;
}

export interface EntradaCuestionario {
  /** Ids de preguntas obligatorias con respuesta válida. */
  respondidas: string[];
  /** Ids que el usuario decidió dejar para después. */
  aplazadas: string[];
  /** Ids pedidos a otra persona: { preguntaId: nombre }. */
  delegadas: Record<string, string>;
  /** Última pregunta abierta, para "Continuar donde quedé". */
  preguntaActual?: string | null;
}

export interface ResumenCuestionario {
  total: number;
  respondidas: number;
  pendientes: number;
  aplazadas: number;
  delegadas: number;
  completo: boolean;
  /** Relato principal: "Tu diagnóstico está en curso · 18 de 28 respondidas". */
  titulo: string;
  /** Segunda línea: "8 pendientes · 2 esperando respuesta de otras personas". */
  detalle: string;
  /** Pregunta a la que lleva el CTA "Continuar donde quedé". */
  siguienteId: string | null;
  preguntas: PreguntaConEstado[];
}

function seccionDe(pregunta: PreguntaDiagnostico): string {
  if (!pregunta.dimensionId) return "Contexto de la empresa";
  return obtenerDimension(pregunta.dimensionId)?.nombre ?? "Diagnóstico";
}

export function preguntasConEstado(entrada: EntradaCuestionario): PreguntaConEstado[] {
  const respondidas = new Set(entrada.respondidas);
  const aplazadas = new Set(entrada.aplazadas);

  return preguntasEnOrden
    .filter((p) => p.obligatoria)
    .map<PreguntaConEstado>((pregunta) => {
      const responsable = entrada.delegadas[pregunta.id];
      const estado: EstadoPregunta = respondidas.has(pregunta.id)
        ? "respondida"
        : responsable
          ? "delegada"
          : aplazadas.has(pregunta.id)
            ? "aplazada"
            : "pendiente";
      return {
        id: pregunta.id,
        texto: pregunta.texto,
        seccionNombre: seccionDe(pregunta),
        estado,
        ...(responsable ? { responsable } : {}),
      };
    });
}

export function resumenCuestionario(entrada: EntradaCuestionario): ResumenCuestionario {
  const preguntas = preguntasConEstado(entrada);
  const total = preguntas.length;
  const cuenta = (estado: EstadoPregunta) => preguntas.filter((p) => p.estado === estado).length;

  const respondidas = cuenta("respondida");
  const pendientes = cuenta("pendiente");
  const aplazadas = cuenta("aplazada");
  const delegadas = cuenta("delegada");
  const completo = total > 0 && respondidas >= total;

  // "Continuar donde quedé": la pregunta abierta si sigue sin responder; si no,
  // la primera sin responder que no esté aplazada ni delegada; si no, cualquiera.
  const sinResponder = preguntas.filter((p) => p.estado !== "respondida");
  const actual = entrada.preguntaActual
    ? sinResponder.find((p) => p.id === entrada.preguntaActual)
    : undefined;
  const siguiente =
    actual ??
    sinResponder.find((p) => p.estado === "pendiente") ??
    sinResponder.find((p) => p.estado === "aplazada") ??
    sinResponder[0];

  const titulo = completo
    ? `Cuestionario completo · ${respondidas} de ${total} respondidas`
    : respondidas === 0
      ? "Tu diagnóstico no ha comenzado"
      : `Tu diagnóstico está en curso · ${respondidas} de ${total} respondidas`;

  const partes: string[] = [];
  if (pendientes > 0) partes.push(`${pendientes} sin responder`);
  if (aplazadas > 0) partes.push(`${aplazadas} aplazadas por ti`);
  if (delegadas > 0)
    partes.push(
      delegadas === 1
        ? "1 esperando respuesta de otra persona"
        : `${delegadas} esperando respuesta de otras personas`
    );

  const detalle = completo
    ? "No queda ninguna pregunta abierta."
    : partes.length > 0
      ? partes.join(" · ")
      : "Puedes empezar cuando quieras: guardamos tu avance.";

  return {
    total,
    respondidas,
    pendientes,
    aplazadas,
    delegadas,
    completo,
    titulo,
    detalle,
    siguienteId: siguiente?.id ?? null,
    preguntas,
  };
}
