/**
 * MC-05 · Priorización de brechas (POC-04, sección 11).
 * Fórmula ponderada configurable y reproducible: conserva factores, pesos y
 * justificación, y ordena respetando capacidades habilitadoras.
 */

import {
  bandaDePrioridad,
  bandasPrioridad,
  obtenerCapacidad,
  pesosPrioridad,
} from "./catalogo";
import type {
  Dependencia,
  FactoresPrioridad,
  Hallazgo,
  Prioridad,
  ReglaActivada,
  ResultadoDimensionMotor,
} from "./tipos";

const TIPOS_ACCIONABLES = new Set(["brecha", "riesgo", "oportunidad", "dependencia"]);

/** Distancia frente al nivel esperado: nivel 1 → 5, nivel 5 → 1. */
function brechaDeMadurez(dimension: ResultadoDimensionMotor | undefined): number {
  if (!dimension || dimension.madurezNivel === null) return 3;
  return Math.max(1, Math.min(5, 6 - dimension.madurezNivel));
}

function normalizar1a5(valor: number): number {
  return ((Math.max(1, Math.min(5, valor)) - 1) / 4) * 100;
}

export interface SalidaPriorizacion {
  prioridades: Prioridad[];
  dependencias: Dependencia[];
}

export function priorizar(
  hallazgos: Hallazgo[],
  activadas: ReglaActivada[],
  dimensiones: ResultadoDimensionMotor[]
): SalidaPriorizacion {
  const porDimension = new Map(dimensiones.map((d) => [d.dimensionId, d]));
  const accionables = hallazgos.filter((h) => TIPOS_ACCIONABLES.has(h.tipo));

  const preliminares = accionables.map((hallazgo) => {
    const reglasDelHallazgo = activadas.filter((r) =>
      hallazgo.reglas.some((rr) => rr.ruleId === r.ruleId)
    );
    const maximo = (campo: keyof ReglaActivada["priorityFactors"]) =>
      reglasDelHallazgo.length > 0
        ? Math.max(...reglasDelHallazgo.map((r) => r.priorityFactors[campo]))
        : 3;

    const capacidad = hallazgo.capacidadId ? obtenerCapacidad(hallazgo.capacidadId) : undefined;

    const factores: FactoresPrioridad = {
      impacto: maximo("impacto"),
      urgencia: maximo("urgencia"),
      fundacionalidad: Math.max(maximo("fundacionalidad"), capacidad?.fundacionalidad ?? 1),
      brechaMadurez: brechaDeMadurez(porDimension.get(hallazgo.dimensionId)),
      factibilidad: maximo("factibilidad"),
      confianza: hallazgo.confianza,
    };

    const score =
      Math.round(
        (normalizar1a5(factores.impacto) * pesosPrioridad.impacto +
          normalizar1a5(factores.urgencia) * pesosPrioridad.urgencia +
          normalizar1a5(factores.fundacionalidad) * pesosPrioridad.fundacionalidad +
          normalizar1a5(factores.brechaMadurez) * pesosPrioridad.brechaMadurez +
          normalizar1a5(factores.factibilidad) * pesosPrioridad.factibilidad +
          factores.confianza * 100 * pesosPrioridad.confianza) *
          10
      ) / 10;

    const bandaCalculada = bandaDePrioridad(score);
    // Excepción documentada: seguridad y continuidad elevan la banda a crítica.
    const banda = hallazgo.escalaCritica
      ? bandasPrioridad[bandasPrioridad.length - 1]!
      : bandaCalculada;

    const justificacion = [
      `Impacto ${factores.impacto}/5`,
      `urgencia ${factores.urgencia}/5`,
      `fundacionalidad ${factores.fundacionalidad}/5`,
      `brecha de madurez ${factores.brechaMadurez}/5`,
      `factibilidad ${factores.factibilidad}/5`,
      `confianza ${factores.confianza.toFixed(2)}`,
      hallazgo.escalaCritica
        ? "banda elevada a crítica por excepción de seguridad o continuidad"
        : `banda ${banda.etiqueta} según score ${score}`,
    ].join("; ");

    const prioridad: Prioridad = {
      id: `P-${hallazgo.id}`,
      hallazgoId: hallazgo.id,
      titulo: hallazgo.titulo,
      dimensionId: hallazgo.dimensionId,
      capacidadId: hallazgo.capacidadId,
      score,
      banda: banda.banda,
      bandaEtiqueta: banda.etiqueta,
      factores,
      pesos: pesosPrioridad,
      justificacion,
      orden: 0,
      ajustadaPorDependencia: false,
      excepcionCritica: hallazgo.escalaCritica,
    };
    return { prioridad, hallazgo };
  });

  // Orden base: score descendente y luego identificador, para asegurar determinismo.
  const ordenadas = [...preliminares].sort(
    (a, b) =>
      b.prioridad.score - a.prioridad.score ||
      a.prioridad.hallazgoId.localeCompare(b.prioridad.hallazgoId)
  );

  const dependencias: Dependencia[] = [];
  const capacidadesPrioritarias = new Map<string, string>();
  for (const item of ordenadas) {
    if (item.prioridad.capacidadId && !capacidadesPrioritarias.has(item.prioridad.capacidadId)) {
      capacidadesPrioritarias.set(item.prioridad.capacidadId, item.prioridad.id);
    }
  }

  // Ajuste por dependencia: la capacidad habilitadora se resuelve primero (CF-MC-06).
  const resultado: typeof ordenadas = [];
  const insertadas = new Set<string>();

  const insertar = (item: (typeof ordenadas)[number]) => {
    if (insertadas.has(item.prioridad.id)) return;
    insertadas.add(item.prioridad.id);
    const habilitadora = item.hallazgo.habilitadaPor;
    if (habilitadora) {
      const idHabilitadora = capacidadesPrioritarias.get(habilitadora);
      const previa = ordenadas.find((o) => o.prioridad.id === idHabilitadora);
      if (previa && previa.prioridad.id !== item.prioridad.id) {
        dependencias.push({
          origen: previa.prioridad.id,
          destino: item.prioridad.id,
          tipo: "habilita",
          fuerza: 3,
          descripcion: `${previa.prioridad.titulo} habilita ${item.prioridad.titulo}.`,
        });
        if (!insertadas.has(previa.prioridad.id)) {
          insertar(previa);
          item.prioridad.ajustadaPorDependencia = true;
        }
      }
    }
    resultado.push(item);
  };

  for (const item of ordenadas) insertar(item);

  resultado.forEach((item, indice) => {
    item.prioridad.orden = indice + 1;
  });

  // Dependencias declaradas explícitamente por reglas de tipo dependencia.
  for (const hallazgo of hallazgos.filter((h) => h.tipo === "dependencia")) {
    const prioridad = resultado.find((r) => r.prioridad.hallazgoId === hallazgo.id);
    if (!prioridad) continue;
    dependencias.push({
      origen: prioridad.prioridad.id,
      destino: hallazgo.dimensionId,
      tipo: "requiere",
      fuerza: 2,
      descripcion: hallazgo.estadoActual,
    });
  }

  return { prioridades: resultado.map((r) => r.prioridad), dependencias };
}
