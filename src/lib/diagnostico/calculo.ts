/**
 * Modelo de cálculo preliminar (POC-03, sección 10).
 * Funciones puras y determinísticas: no dependen de la interfaz ni del almacenamiento.
 * No generan interpretaciones, prioridades ni recomendaciones.
 */

import {
  ALGORITHM_VERSION,
  DEFINITION_VERSION,
  definicionDiagnostico,
  normalizationMap,
  preguntasDeDimension,
  umbrales,
} from "./definicion";
import { respuestasVigentes } from "./validacion";
import type {
  DiagnosticAnswer,
  DiagnosticResult,
  DimensionResult,
  UmbralNivel,
} from "./tipos";

/** Normaliza una respuesta de escala 1-5 al rango 0-100. */
export function normalizarEscala(valor: number): number {
  const normalizado = normalizationMap[valor];
  if (normalizado === undefined) {
    throw new Error(`Valor fuera de la escala 1-5: ${valor}`);
  }
  return normalizado;
}

export function redondearUnDecimal(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/** Nivel preliminar correspondiente a un puntaje 0-100. */
export function nivelDePuntaje(puntaje: number): UmbralNivel {
  const encontrado = umbrales.find((u) => puntaje >= u.min && puntaje <= u.max);
  if (encontrado) return encontrado;
  return puntaje < 0 ? umbrales[0]! : umbrales[umbrales.length - 1]!;
}

/** Promedio ponderado de las preguntas puntuables válidas de una dimensión. */
export function puntajeDimension(
  dimensionId: string,
  respuestas: DiagnosticAnswer[]
): { rawScore: number; answeredCount: number; totalCount: number } {
  const preguntas = preguntasDeDimension(dimensionId).filter((p) => p.puntuable);
  const mapa = new Map(respuestas.map((r) => [r.questionId, r.value]));

  let sumaPonderada = 0;
  let sumaPesos = 0;
  let answeredCount = 0;

  for (const pregunta of preguntas) {
    const valor = mapa.get(pregunta.id);
    if (valor === undefined) continue;
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < 1 || numero > 5) continue;
    const peso = pregunta.peso ?? 1;
    sumaPonderada += normalizarEscala(numero) * peso;
    sumaPesos += peso;
    answeredCount += 1;
  }

  return {
    rawScore: sumaPesos > 0 ? sumaPonderada / sumaPesos : 0,
    answeredCount,
    totalCount: preguntas.length,
  };
}

export function resultadosPorDimension(respuestas: DiagnosticAnswer[]): DimensionResult[] {
  return definicionDiagnostico.dimensions.map((dimension) => {
    const { rawScore, answeredCount, totalCount } = puntajeDimension(dimension.id, respuestas);
    const displayedScore = redondearUnDecimal(rawScore);
    const nivel = nivelDePuntaje(displayedScore);
    return {
      dimensionId: dimension.id,
      nombre: dimension.nombre,
      peso: dimension.peso,
      rawScore,
      displayedScore,
      level: nivel.nivel,
      mensajeNivel: nivel.mensaje,
      answeredCount,
      totalCount,
    };
  });
}

/** Suma de puntajes de dimensión multiplicados por su peso. */
export function puntajeGlobal(dimensionResults: DimensionResult[]): number {
  const total = dimensionResults.reduce((suma, d) => suma + d.rawScore * d.peso, 0);
  return Math.min(100, Math.max(0, total));
}

/** Construye el contrato de salida completo requerido por el POC-04. */
export function calcularResultado(
  sessionId: string,
  respuestas: DiagnosticAnswer[],
  fecha: Date = new Date()
): DiagnosticResult {
  const validas = respuestasVigentes(respuestas);
  const contextAnswers = validas.filter((r) => !r.dimensionId);
  const scoredAnswers = validas.filter((r) => Boolean(r.dimensionId));

  const dimensionResults = resultadosPorDimension(scoredAnswers);
  const global = puntajeGlobal(dimensionResults);
  const globalDisplayed = redondearUnDecimal(global);
  const nivel = nivelDePuntaje(globalDisplayed);

  return {
    sessionId,
    definitionVersion: DEFINITION_VERSION,
    algorithmVersion: ALGORITHM_VERSION,
    contextAnswers,
    scoredAnswers,
    globalScore: globalDisplayed,
    globalLevel: nivel.nivel,
    globalMessage: nivel.mensaje,
    dimensionResults,
    calculatedAt: fecha.toISOString(),
  };
}

/** Las dos dimensiones con menor puntaje: se rotulan como áreas para profundizar. */
export function areasParaProfundizar(dimensionResults: DimensionResult[]): string[] {
  return [...dimensionResults]
    .sort((a, b) => a.displayedScore - b.displayedScore || a.dimensionId.localeCompare(b.dimensionId))
    .slice(0, 2)
    .map((d) => d.dimensionId);
}
