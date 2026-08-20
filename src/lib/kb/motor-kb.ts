/**
 * Evaluador del Knowledge Pack.
 *
 * Función pura y determinista: respuestas → variables → evaluación → hallazgos
 * → recomendaciones, con trazabilidad completa por hallazgo.
 * No inventa scoring, pesos, benchmarks ni niveles de madurez: cuando falta
 * evidencia devuelve TEXTO_INSUFICIENTE.
 */

import {
  calcularValores,
  estaRespondida,
  evidenciaFaltante,
  preguntasVisibles,
  progresoFormulario,
  trazaDePregunta,
} from "./formulario";
import {
  TEXTO_INSUFICIENTE,
  type DominioKB,
  type EstadoDominioKB,
  type HallazgoDetectadoKB,
  type KnowledgePack,
  type NivelEvidencia,
  type ResultadoKB,
  type RespuestasKB,
} from "./tipos";

export interface EntradaEvaluacionKB {
  pack: KnowledgePack;
  companyId: string;
  companyName: string;
  respuestas: RespuestasKB;
  esDemo?: boolean;
  generadoEn?: string;
}

function nivelEvidencia(
  pack: KnowledgePack,
  respuestas: RespuestasKB,
  preguntasRegla: string[]
): NivelEvidencia {
  const preguntas = pack.preguntas.filter((p) => preguntasRegla.includes(p.id));
  if (preguntas.length === 0) return "insuficiente";
  const respondidas = preguntas.filter((p) => estaRespondida(respuestas, p));
  if (respondidas.length === 0) return "insuficiente";
  const conDesconocimiento = respondidas.some((p) => {
    const valor = respuestas[p.id];
    const valores = Array.isArray(valor) ? valor : [valor];
    return p.opciones.some((o) => o.desconoce && valores.includes(o.valor));
  });
  if (conDesconocimiento || respondidas.length < preguntas.length) return "parcial";
  return "declarada";
}

function estadosPorDominio(
  pack: KnowledgePack,
  respuestas: RespuestasKB,
  hallazgos: HallazgoDetectadoKB[]
): EstadoDominioKB[] {
  const visibles = preguntasVisibles(pack, respuestas);

  return pack.dominios.map((dominio) => {
    const preguntasDominio = visibles.filter((p) => p.dominio === dominio.id);
    const respondidas = preguntasDominio.filter((p) => estaRespondida(respuestas, p));
    const detectados = hallazgos.filter((h) => h.hallazgo.dominio === dominio.id);

    if (preguntasDominio.length === 0) {
      return {
        dominio: dominio.id as DominioKB,
        etiqueta: dominio.etiqueta,
        estado: "sin_alcance" as const,
        mensaje:
          "Este bloque no aplica según las respuestas declaradas sobre el canal digital.",
        hallazgos: 0,
      };
    }
    if (respondidas.length === 0) {
      return {
        dominio: dominio.id as DominioKB,
        etiqueta: dominio.etiqueta,
        estado: "insuficiente" as const,
        mensaje: TEXTO_INSUFICIENTE,
        hallazgos: 0,
      };
    }
    if (detectados.length === 0) {
      return {
        dominio: dominio.id as DominioKB,
        etiqueta: dominio.etiqueta,
        estado: "preliminar" as const,
        mensaje:
          "Con la información declarada no se identificaron hallazgos en este bloque. Conclusión preliminar.",
        hallazgos: 0,
      };
    }
    return {
      dominio: dominio.id as DominioKB,
      etiqueta: dominio.etiqueta,
      estado: "preliminar" as const,
      mensaje: detectados[0]!.hallazgo.interpretacion,
      hallazgos: detectados.length,
    };
  });
}

function construirResumen(
  hallazgos: HallazgoDetectadoKB[],
  faltantes: number,
  progreso: { respondidas: number; visibles: number }
): string {
  if (progreso.respondidas === 0) {
    return "Aún no hay respuestas registradas. Al responder el instrumento, Pymapa interpretará la información declarada y mostrará hallazgos trazables.";
  }
  if (hallazgos.length === 0) {
    return `Con ${progreso.respondidas} de ${progreso.visibles} preguntas respondidas, Pymapa no identificó hallazgos con la evidencia disponible. Conclusión preliminar.`;
  }
  const dominios = [...new Set(hallazgos.map((h) => h.hallazgo.dominio))].length;
  const base = `A partir de ${progreso.respondidas} respuestas declaradas, Pymapa identifica ${hallazgos.length} hallazgo(s) en ${dominios} bloque(s) de análisis, con su recomendación asociada.`;
  return faltantes > 0
    ? `${base} Quedan ${faltantes} pregunta(s) sin responder: completarlas aumenta la precisión del diagnóstico.`
    : base;
}

export function evaluarKB(entrada: EntradaEvaluacionKB): ResultadoKB {
  const { pack, respuestas } = entrada;
  const valores = calcularValores(pack, respuestas);
  const progreso = progresoFormulario(pack, respuestas);
  const faltantes = evidenciaFaltante(pack, respuestas);

  const hallazgos: HallazgoDetectadoKB[] = [];
  for (const regla of pack.reglas) {
    if (!regla.condicion(valores)) continue;
    const hallazgo = pack.hallazgos.find((h) => h.id === regla.hallazgoId);
    const recomendacion = pack.recomendaciones.find((r) => r.id === regla.recomendacionId);
    if (!hallazgo || !recomendacion) continue;

    const trazas = regla.preguntas
      .map((id) => pack.preguntas.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => trazaDePregunta(p, respuestas));

    hallazgos.push({
      hallazgo,
      regla,
      recomendacion,
      evidencia: nivelEvidencia(pack, respuestas, regla.preguntas),
      trazas,
    });
  }

  /** Orden estable: por urgencia e impacto declarados en el pack (experimental). */
  const rango: Record<string, number> = { alto: 3, medio: 2, bajo: 1 };
  hallazgos.sort(
    (a, b) =>
      (rango[b.recomendacion.urgencia] ?? 0) - (rango[a.recomendacion.urgencia] ?? 0) ||
      (rango[b.recomendacion.impacto] ?? 0) - (rango[a.recomendacion.impacto] ?? 0) ||
      a.hallazgo.id.localeCompare(b.hallazgo.id)
  );

  return {
    packId: pack.id,
    packVersion: pack.version,
    companyId: entrada.companyId,
    companyName: entrada.companyName,
    generadoEn: entrada.generadoEn ?? new Date().toISOString(),
    esDemo: entrada.esDemo ?? false,
    resumen: construirResumen(hallazgos, faltantes.length, progreso),
    estados: estadosPorDominio(pack, respuestas, hallazgos),
    hallazgos,
    perfilTecnologico: pack.perfilTecnologico(valores),
    faltantes,
    progreso,
  };
}
