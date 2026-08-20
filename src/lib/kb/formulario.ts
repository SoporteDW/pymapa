/**
 * Formulario dinámico de un Knowledge Pack.
 * Funciones puras: calculan variables, visibilidad condicional y progreso.
 * No conoce componentes ni almacenamiento.
 */

import type {
  KnowledgePack,
  PreguntaKB,
  RespuestasKB,
  TrazaRespuestaKB,
  ValoresKB,
} from "./tipos";

/** Convierte respuestas (por pregunta) en variables estructuradas. */
export function calcularValores(pack: KnowledgePack, respuestas: RespuestasKB): ValoresKB {
  const valores: ValoresKB = {};
  for (const pregunta of pack.preguntas) {
    const respuesta = respuestas[pregunta.id];
    if (respuesta === undefined) continue;
    if (Array.isArray(respuesta) && respuesta.length === 0) continue;
    valores[pregunta.variable] = respuesta;
  }
  return valores;
}

/**
 * Preguntas visibles según la lógica condicional del pack.
 * Se recalcula en cada cambio: responder EC-Q01 puede abrir o cerrar bloques.
 */
export function preguntasVisibles(pack: KnowledgePack, respuestas: RespuestasKB): PreguntaKB[] {
  const valores = calcularValores(pack, respuestas);
  return pack.preguntas.filter((p) => (p.visibleSi ? p.visibleSi(valores) : true));
}

export function estaRespondida(respuestas: RespuestasKB, pregunta: PreguntaKB): boolean {
  const valor = respuestas[pregunta.id];
  if (valor === undefined) return false;
  return Array.isArray(valor) ? valor.length > 0 : valor.length > 0;
}

export function progresoFormulario(pack: KnowledgePack, respuestas: RespuestasKB) {
  const visibles = preguntasVisibles(pack, respuestas);
  const respondidas = visibles.filter((p) => estaRespondida(respuestas, p)).length;
  return {
    visibles: visibles.length,
    respondidas,
    porcentaje: visibles.length === 0 ? 0 : Math.round((respondidas / visibles.length) * 100),
  };
}

export function etiquetaRespuesta(pregunta: PreguntaKB, valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  if (Array.isArray(valor)) {
    if (valor.length === 0) return null;
    return valor
      .map((v) => pregunta.opciones.find((o) => o.valor === v)?.etiqueta ?? v)
      .join(", ");
  }
  if (typeof valor !== "string" || valor.length === 0) return null;
  return pregunta.opciones.find((o) => o.valor === valor)?.etiqueta ?? valor;
}

/** Construye un eslabón de trazabilidad pregunta → respuesta → variable. */
export function trazaDePregunta(pregunta: PreguntaKB, respuestas: RespuestasKB): TrazaRespuestaKB {
  const etiqueta = etiquetaRespuesta(pregunta, respuestas[pregunta.id]);
  return {
    preguntaId: pregunta.id,
    pregunta: pregunta.texto,
    respuesta: etiqueta ?? "Sin responder",
    variableId: pregunta.variableId,
    variable: pregunta.variable,
    respondida: etiqueta !== null,
  };
}

/** Preguntas visibles aún sin responder: evidencia que falta para concluir. */
export function evidenciaFaltante(
  pack: KnowledgePack,
  respuestas: RespuestasKB
): TrazaRespuestaKB[] {
  return preguntasVisibles(pack, respuestas)
    .filter((p) => !estaRespondida(respuestas, p))
    .map((p) => trazaDePregunta(p, respuestas));
}

/** Siguiente pregunta visible sin responder (para reanudar el instrumento). */
export function siguientePendiente(
  pack: KnowledgePack,
  respuestas: RespuestasKB
): PreguntaKB | null {
  return preguntasVisibles(pack, respuestas).find((p) => !estaRespondida(respuestas, p)) ?? null;
}

/** Limpia respuestas de preguntas que dejaron de aplicar tras un cambio. */
export function depurarRespuestas(pack: KnowledgePack, respuestas: RespuestasKB): RespuestasKB {
  const visibles = new Set(preguntasVisibles(pack, respuestas).map((p) => p.id));
  const depuradas: RespuestasKB = {};
  for (const [preguntaId, valor] of Object.entries(respuestas)) {
    if (visibles.has(preguntaId)) depuradas[preguntaId] = valor;
  }
  return depuradas;
}
