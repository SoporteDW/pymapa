/**
 * Síntesis de resultados comprensibles (POC-05, secciones 5 y 6).
 * Traduce hallazgos técnicos del motor a fortalezas, brechas, riesgos y
 * oportunidades, y redacta el resumen ejecutivo desde reglas y datos, sin
 * generar afirmaciones no derivadas del diagnóstico.
 */

import { dimensiones } from "@/lib/diagnostico/definicion";
import { obtenerCapacidad } from "@/lib/motor/catalogo";
import type { Hallazgo, SalidaMotor } from "@/lib/motor/tipos";
import {
  bandaMadurezResultado,
  COBERTURA_RESULTADO_COMPLETO,
  nivelDeConfianza,
} from "./niveles";
import type {
  Completitud,
  DimensionResultVista,
  HallazgoVista,
  ResumenEjecutivo,
  TipoHallazgoVista,
} from "./tipos";

const MAPA_TIPOS: Record<string, TipoHallazgoVista> = {
  fortaleza: "fortaleza",
  capacidad_parcial: "fortaleza",
  brecha: "brecha",
  dependencia: "brecha",
  riesgo: "riesgo",
  inconsistencia: "riesgo",
  oportunidad: "oportunidad",
};

export function tipoVista(hallazgo: Hallazgo): TipoHallazgoVista {
  return MAPA_TIPOS[hallazgo.tipo] ?? "brecha";
}

export function aHallazgoVista(hallazgo: Hallazgo): HallazgoVista {
  const capacidad = hallazgo.capacidadId ? obtenerCapacidad(hallazgo.capacidadId) : undefined;
  return {
    id: hallazgo.id,
    type: tipoVista(hallazgo),
    title: hallazgo.titulo,
    description: hallazgo.esHipotesis
      ? `${hallazgo.estadoActual} Esta lectura es una hipótesis que conviene confirmar.`
      : hallazgo.estadoActual,
    dimensionId: hallazgo.dimensionId,
    dimensionNombre: hallazgo.dimensionNombre,
    capacidadNombre: capacidad?.nombre ?? hallazgo.capacidadNombre ?? null,
    evidenceRefs: hallazgo.evidencia,
    reglas: hallazgo.reglas.map((r) => `${r.ruleId}@${r.version}`),
    confidence: hallazgo.confianza,
    nivelConfianza: nivelDeConfianza(hallazgo.confianza),
    severidad: hallazgo.severidad,
    esHipotesis: hallazgo.esHipotesis,
  };
}

export function agruparHallazgos(hallazgos: HallazgoVista[]) {
  return {
    fortalezas: hallazgos.filter((h) => h.type === "fortaleza"),
    brechas: hallazgos.filter((h) => h.type === "brecha"),
    riesgos: hallazgos.filter((h) => h.type === "riesgo"),
    oportunidades: hallazgos.filter((h) => h.type === "oportunidad"),
  };
}

/** Puntaje global ponderado por dimensión, tal como lo define el POC-03/04. */
export function calcularPuntajeGlobal(salida: SalidaMotor): number {
  const pesoTotal = salida.dimensionResults.reduce((total, d) => total + d.peso, 0) || 1;
  const suma = salida.dimensionResults.reduce((total, d) => total + d.puntaje * d.peso, 0);
  return Math.round((suma / pesoTotal) * 10) / 10;
}

export function construirDimensiones(
  salida: SalidaMotor,
  hallazgos: HallazgoVista[]
): DimensionResultVista[] {
  return salida.dimensionResults
    .slice()
    .sort((a, b) => a.dimensionId.localeCompare(b.dimensionId))
    .map((dimension) => {
      const propios = hallazgos.filter((h) => h.dimensionId === dimension.dimensionId);
      const banda = bandaMadurezResultado(dimension.puntaje);
      const grupos = agruparHallazgos(propios);
      const definicion = dimensiones.find((d) => d.id === dimension.dimensionId);

      const interpretacion = construirInterpretacionDimension(
        definicion?.nombre ?? dimension.nombre,
        dimension.puntaje,
        banda.etiqueta,
        grupos.fortalezas.length,
        grupos.brechas.length + grupos.riesgos.length,
        dimension.madurezProvisional
      );

      return {
        dimensionId: dimension.dimensionId,
        nombre: dimension.nombre,
        score: dimension.puntaje,
        maturityLevel: banda.nivel,
        maturityLabel: banda.etiqueta,
        interpretation: interpretacion,
        confidence: dimension.confianza,
        nivelConfianza: nivelDeConfianza(dimension.confianza),
        cobertura: dimension.cobertura,
        parcial: dimension.madurezProvisional,
        ...grupos,
        notas: dimension.notas,
      };
    });
}

function construirInterpretacionDimension(
  nombre: string,
  puntaje: number,
  etiqueta: string,
  fortalezas: number,
  brechas: number,
  parcial: boolean
): string {
  const partes: string[] = [];
  partes.push(`${nombre} se ubica en nivel ${etiqueta.toLowerCase()} con ${puntaje} de 100.`);
  if (fortalezas > 0 && brechas > 0) {
    partes.push(
      `Hay prácticas que ya funcionan y ${brechas} aspecto${brechas === 1 ? "" : "s"} que limita${brechas === 1 ? "" : "n"} el avance.`
    );
  } else if (fortalezas > 0) {
    partes.push("Las prácticas observadas sostienen esta área y conviene mantenerlas.");
  } else if (brechas > 0) {
    partes.push(
      `Se identificaron ${brechas} aspecto${brechas === 1 ? "" : "s"} por resolver antes de avanzar.`
    );
  } else {
    partes.push("No se detectaron señales relevantes con la evidencia disponible.");
  }
  if (parcial) {
    partes.push("La lectura es parcial porque faltan respuestas en esta área.");
  }
  return partes.join(" ");
}

export function completitudDe(salida: SalidaMotor): Completitud {
  return salida.quality.coverage >= COBERTURA_RESULTADO_COMPLETO &&
    salida.metadata.status === "completado"
    ? "completo"
    : "parcial";
}

/** Resumen ejecutivo en lenguaje no técnico: máximo tres frases (POC-05, 6.2). */
export function construirResumenEjecutivo(
  puntajeGlobal: number,
  hallazgos: HallazgoVista[],
  completitud: Completitud
): ResumenEjecutivo {
  const banda = bandaMadurezResultado(puntajeGlobal);
  const { fortalezas, brechas, riesgos } = agruparHallazgos(hallazgos);

  const fortalezaDestacada =
    [...fortalezas].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
  const candidatasBrecha = [...brechas, ...riesgos].sort(
    (a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id)
  );
  const brechaPrincipal = candidatasBrecha[0] ?? null;

  const frases: string[] = [
    `Tu empresa se ubica hoy en un nivel ${banda.etiqueta.toLowerCase()} con ${puntajeGlobal} puntos de 100.`,
  ];
  if (fortalezaDestacada) {
    frases.push(
      `Lo que ya funciona a tu favor está en ${fortalezaDestacada.dimensionNombre.toLowerCase()}.`
    );
  }
  if (brechaPrincipal) {
    frases.push(
      `El mayor avance disponible está en ${brechaPrincipal.dimensionNombre.toLowerCase()}, donde se detectó la limitación más relevante.`
    );
  }
  if (completitud === "parcial") {
    frases.push("Esta lectura es parcial: completar el diagnóstico aumentará su precisión.");
  }

  return {
    mensajePrincipal: frases.slice(0, 3).join(" "),
    fortalezaDestacada,
    brechaPrincipal,
    siguientePaso:
      "Revisa tus prioridades para saber por dónde empezar y abre la Ficha de Acción correspondiente.",
  };
}
