/**
 * MC-01 · Normalización de respuestas (POC-04, secciones 4 y 10).
 * Valida formato, tipos, omisiones y coherencia básica. No modifica el diagnóstico
 * original: produce una proyección con banderas de calidad.
 */

import { preguntasEnOrden, obtenerPregunta } from "@/lib/diagnostico/definicion";
import { valorValido } from "@/lib/diagnostico/validacion";
import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";
import { VALOR_NO_APLICA } from "./catalogo";
import type {
  Advertencia,
  BanderaCalidad,
  ContextoPyme,
  RespuestaNormalizada,
  SalidaNormalizacion,
} from "./tipos";

const CANALES_DIGITALES = ["mensajeria", "redes", "web", "marketplace"];

/** Selecciona la respuesta más reciente cuando hay duplicidad (POC-04, 10). */
function agruparPorPregunta(respuestas: DiagnosticAnswer[]) {
  const mapa = new Map<string, { elegida: DiagnosticAnswer; duplicada: boolean }>();
  for (const respuesta of respuestas) {
    const previa = mapa.get(respuesta.questionId);
    if (!previa) {
      mapa.set(respuesta.questionId, { elegida: respuesta, duplicada: false });
      continue;
    }
    const masReciente =
      new Date(respuesta.answeredAt).getTime() >= new Date(previa.elegida.answeredAt).getTime()
        ? respuesta
        : previa.elegida;
    mapa.set(respuesta.questionId, { elegida: masReciente, duplicada: true });
  }
  return mapa;
}

function valorContexto(mapa: Map<string, { elegida: DiagnosticAnswer }>, questionId: string) {
  const valor = mapa.get(questionId)?.elegida.value;
  if (valor === undefined || Array.isArray(valor)) return null;
  return String(valor);
}

export function normalizar(respuestas: DiagnosticAnswer[]): SalidaNormalizacion {
  const agrupadas = agruparPorPregunta(respuestas);
  const advertencias: Advertencia[] = [];
  const normalizadas: RespuestaNormalizada[] = [];

  for (const pregunta of preguntasEnOrden) {
    const entrada = agrupadas.get(pregunta.id);
    const valor = entrada?.elegida.value;
    let bandera: BanderaCalidad = "ok";
    let valorNormalizado: number | null = null;
    let nota: string | undefined;

    if (valor === undefined || valor === "" || (Array.isArray(valor) && valor.length === 0)) {
      bandera = "faltante";
      nota = "Sin respuesta registrada: se trata como ausencia de evidencia, no como brecha.";
    } else if (String(valor) === VALOR_NO_APLICA) {
      bandera = "no_aplica";
      nota = "Marcada como no aplicable: se excluye del denominador de cobertura.";
    } else if (!valorValido(pregunta, valor)) {
      const numero = Number(valor);
      bandera = Number.isNaN(numero) ? "tipo_invalido" : "fuera_de_rango";
      nota = `Valor rechazado por el esquema de la pregunta ${pregunta.id}.`;
      advertencias.push({
        codigo: bandera === "tipo_invalido" ? "MC-101" : "MC-102",
        mensaje: `La respuesta de ${pregunta.id} no cumple el esquema y fue descartada.`,
        severidad: "media",
        referencias: [pregunta.id],
      });
    } else if (pregunta.puntuable) {
      valorNormalizado = (Number(valor) - 1) * 25;
    }

    if (bandera === "ok" && entrada?.duplicada) {
      bandera = "duplicada";
      nota = "Existían varias respuestas: se conservó la más reciente.";
      advertencias.push({
        codigo: "MC-103",
        mensaje: `Se detectó más de una respuesta para ${pregunta.id}; se usó la más reciente.`,
        severidad: "informativa",
        referencias: [pregunta.id],
      });
    }

    normalizadas.push({
      questionId: pregunta.id,
      dimensionId: pregunta.dimensionId ?? null,
      puntuable: pregunta.puntuable,
      valorOriginal: valor,
      valorNormalizado,
      bandera,
      answeredAt: entrada?.elegida.answeredAt ?? null,
      ...(nota ? { nota } : {}),
    });
  }

  const canalesCrudos = agrupadas.get("C03")?.elegida.value;
  const canales = Array.isArray(canalesCrudos) ? canalesCrudos.map(String) : [];

  const contexto: ContextoPyme = {
    tamano: valorContexto(agrupadas, "C01"),
    sector: valorContexto(agrupadas, "C02"),
    canales,
    objetivo: valorContexto(agrupadas, "C04"),
    tieneCanalDigital: canales.some((c) => CANALES_DIGITALES.includes(c)),
  };

  const faltantes = normalizadas.filter((r) => r.bandera === "faltante");
  if (faltantes.length > 0) {
    advertencias.push({
      codigo: "MC-104",
      mensaje: `${faltantes.length} pregunta(s) sin responder: se registran como ausencia de evidencia.`,
      severidad: faltantes.length > 8 ? "alta" : "baja",
      referencias: faltantes.map((r) => r.questionId),
    });
  }

  if (contexto.tamano === null || contexto.sector === null) {
    advertencias.push({
      codigo: "MC-105",
      mensaje:
        "Falta contexto de tamaño o sector: se omiten las reglas que dependen del perfil de la pyme.",
      severidad: "media",
      referencias: ["C01", "C02"],
    });
  }

  return { respuestas: normalizadas, contexto, advertencias };
}

export function textoPregunta(questionId: string): string {
  return obtenerPregunta(questionId)?.texto ?? questionId;
}
