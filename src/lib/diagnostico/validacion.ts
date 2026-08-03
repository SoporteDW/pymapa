/**
 * Validaciones del instrumento (POC-03, sección 9).
 * Incluye la integridad de la configuración (9.1) y la validación de respuestas.
 */

import { definicionDiagnostico, preguntasEnOrden } from "./definicion";
import type { DiagnosticAnswer, DiagnosticDefinition, PreguntaDiagnostico, ValorRespuesta } from "./tipos";

export interface ProblemaConfiguracion {
  codigo: string;
  detalle: string;
}

/** Verifica la integridad de la configuración antes de habilitar el instrumento. */
export function validarConfiguracion(
  definicion: DiagnosticDefinition = definicionDiagnostico
): ProblemaConfiguracion[] {
  const problemas: ProblemaConfiguracion[] = [];

  const ids = definicion.questions.map((q) => q.id);
  const duplicados = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicados.length > 0) {
    problemas.push({
      codigo: "CFG-001",
      detalle: `Identificadores de pregunta duplicados: ${[...new Set(duplicados)].join(", ")}.`,
    });
  }

  for (const pregunta of definicion.questions) {
    if (pregunta.puntuable) {
      const dimension = definicion.dimensions.find((d) => d.id === pregunta.dimensionId);
      if (!dimension) {
        problemas.push({
          codigo: "CFG-002",
          detalle: `La pregunta ${pregunta.id} no tiene una dimensión válida.`,
        });
      } else if (dimension.peso <= 0) {
        problemas.push({
          codigo: "CFG-003",
          detalle: `La dimensión ${dimension.id} debe tener peso positivo.`,
        });
      }
      if ((pregunta.peso ?? 0) <= 0) {
        problemas.push({
          codigo: "CFG-004",
          detalle: `La pregunta ${pregunta.id} debe tener peso positivo.`,
        });
      }
    }

    if (pregunta.opciones) {
      const opcionIds = pregunta.opciones.map((o) => o.id);
      if (new Set(opcionIds).size !== opcionIds.length) {
        problemas.push({
          codigo: "CFG-005",
          detalle: `La pregunta ${pregunta.id} tiene identificadores de opción repetidos.`,
        });
      }
      const idIgualATexto = pregunta.opciones.some((o) => o.id === o.etiqueta);
      if (idIgualATexto) {
        problemas.push({
          codigo: "CFG-006",
          detalle: `Las opciones de ${pregunta.id} deben tener identificadores distintos del texto visible.`,
        });
      }
    }
  }

  const sumaPesos = definicion.dimensions.reduce((total, d) => total + d.peso, 0);
  if (Math.abs(sumaPesos - 1) > 0.0001) {
    problemas.push({
      codigo: "CFG-007",
      detalle: `La suma de pesos de dimensiones debe ser 1.0 y es ${sumaPesos}.`,
    });
  }

  return problemas;
}

/** Comprueba si un valor es aceptable para la pregunta indicada. */
export function valorValido(pregunta: PreguntaDiagnostico, valor: ValorRespuesta | undefined): boolean {
  if (valor === undefined || valor === null) return false;

  switch (pregunta.tipo) {
    case "scale_1_5": {
      const numero = Number(valor);
      return Number.isInteger(numero) && numero >= 1 && numero <= 5;
    }
    case "single_select":
      return (pregunta.opciones ?? []).some((o) => String(o.valor) === String(valor));
    case "multi_select": {
      if (!Array.isArray(valor) || valor.length === 0) return false;
      return valor.every((v) => (pregunta.opciones ?? []).some((o) => String(o.valor) === String(v)));
    }
    case "number": {
      const numero = Number(valor);
      if (Number.isNaN(numero)) return false;
      if (pregunta.min !== undefined && numero < pregunta.min) return false;
      if (pregunta.max !== undefined && numero > pregunta.max) return false;
      return true;
    }
    case "short_text": {
      const texto = String(valor).trim();
      return texto.length > 0 && texto.length <= (pregunta.maxLength ?? 300);
    }
    default:
      return false;
  }
}

/** Descarta valores residuales que ya no pertenecen al catálogo vigente. */
export function respuestasVigentes(respuestas: DiagnosticAnswer[]): DiagnosticAnswer[] {
  return respuestas.filter((respuesta) => {
    const pregunta = preguntasEnOrden.find((p) => p.id === respuesta.questionId);
    return Boolean(pregunta) && valorValido(pregunta!, respuesta.value);
  });
}

export interface PendientePorSeccion {
  seccionId: string;
  seccionNombre: string;
  preguntas: PreguntaDiagnostico[];
}

/** Preguntas obligatorias sin responder, agrupadas por dimensión (POC-03, 9). */
export function pendientesAgrupados(respuestas: DiagnosticAnswer[]): PendientePorSeccion[] {
  const validas = respuestasVigentes(respuestas);
  const respondidas = new Set(validas.map((r) => r.questionId));
  const grupos: PendientePorSeccion[] = [];

  const contexto = preguntasEnOrden.filter(
    (p) => p.seccion === "contexto" && p.obligatoria && !respondidas.has(p.id)
  );
  if (contexto.length > 0) {
    grupos.push({ seccionId: "contexto", seccionNombre: "Contexto de la empresa", preguntas: contexto });
  }

  for (const dimension of definicionDiagnostico.dimensions) {
    const preguntas = preguntasEnOrden.filter(
      (p) => p.dimensionId === dimension.id && p.obligatoria && !respondidas.has(p.id)
    );
    if (preguntas.length > 0) {
      grupos.push({ seccionId: dimension.id, seccionNombre: dimension.nombre, preguntas });
    }
  }

  return grupos;
}

/** Primera pregunta obligatoria pendiente, para el enlace directo de la revisión. */
export function primeraPendiente(respuestas: DiagnosticAnswer[]): PreguntaDiagnostico | undefined {
  const validas = respuestasVigentes(respuestas);
  const respondidas = new Set(validas.map((r) => r.questionId));
  return preguntasEnOrden.find((p) => p.obligatoria && !respondidas.has(p.id));
}

export function contarObligatoriasRespondidas(respuestas: DiagnosticAnswer[]): number {
  const validas = respuestasVigentes(respuestas);
  const respondidas = new Set(validas.map((r) => r.questionId));
  return preguntasEnOrden.filter((p) => p.obligatoria && respondidas.has(p.id)).length;
}
