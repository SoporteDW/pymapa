/**
 * Priorización explicable del POC-05 (sección 7).
 * Fórmula operativa fija, reglas complementarias y ordenamiento determinista.
 * Recibe la salida del motor (POC-04) y no depende de la interfaz.
 */

import { severidadNumerica } from "@/lib/motor/catalogo";
import type { Dependencia, Hallazgo, Prioridad, SalidaMotor } from "@/lib/motor/tipos";
import { nivelDeConfianza } from "./niveles";
import type { NivelPrioridad, PrioridadVista, VariablesPrioridad } from "./tipos";

/** Pesos de la fórmula operativa (POC-05, 7.3). No configurables en el MVP Alfa. */
export const pesosPrioridadResultado = {
  impact: 0.3,
  urgency: 0.25,
  risk: 0.2,
  dependency: 0.1,
  effort: 0.15,
} as const;

export const MAXIMO_PRIORIDADES_INICIALES = 5;
/** Confianza mínima para clasificar como crítica sin evidencia adicional (POC-05, 7.4). */
export const CONFIANZA_MINIMA_CRITICA = 0.65;

const ordenNiveles: NivelPrioridad[] = ["baja", "media", "alta", "critica"];

const etiquetasNivel: Record<NivelPrioridad, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function etiquetaNivelPrioridad(nivel: NivelPrioridad): string {
  return etiquetasNivel[nivel];
}

/** Clasificación por rangos normalizados (POC-05, 7.3). */
export function nivelPorScore(score: number): NivelPrioridad {
  if (score >= 4) return "critica";
  if (score >= 3.2) return "alta";
  if (score >= 2.4) return "media";
  return "baja";
}

function acotar(valor: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, valor));
}

function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function subirNivel(nivel: NivelPrioridad): NivelPrioridad {
  const indice = ordenNiveles.indexOf(nivel);
  return ordenNiveles[Math.min(ordenNiveles.length - 1, indice + 1)]!;
}

function bajarNivel(nivel: NivelPrioridad): NivelPrioridad {
  const indice = ordenNiveles.indexOf(nivel);
  return ordenNiveles[Math.max(0, indice - 1)]!;
}

/**
 * Traduce los factores del motor a las variables del POC-05.
 * Decisión documentada: el esfuerzo es el complemento de la factibilidad y el
 * riesgo proviene de la severidad del hallazgo, para no duplicar cálculos.
 */
export function variablesDePrioridad(
  prioridad: Prioridad,
  hallazgo: Hallazgo | undefined,
  desbloquea: string[]
): VariablesPrioridad {
  const factibilidad = acotar(prioridad.factores.factibilidad, 1, 5);
  return {
    impact: acotar(prioridad.factores.impacto, 1, 5),
    urgency: acotar(prioridad.factores.urgencia, 1, 5),
    effort: acotar(6 - factibilidad, 1, 5),
    risk: acotar(severidadNumerica[hallazgo?.severidad ?? "media"] ?? 3, 1, 5),
    dependency: acotar(desbloquea.length, 0, 2),
    confidence: redondear(acotar(hallazgo?.confianza ?? prioridad.factores.confianza, 0.5, 1)),
  };
}

/** Puntaje de prioridad según la regla de cálculo del POC-05 (7.3). */
export function calcularScorePrioridad(v: VariablesPrioridad): number {
  const base =
    v.impact * pesosPrioridadResultado.impact +
    v.urgency * pesosPrioridadResultado.urgency +
    v.risk * pesosPrioridadResultado.risk +
    v.dependency * pesosPrioridadResultado.dependency +
    (6 - v.effort) * pesosPrioridadResultado.effort;
  return redondear(base * v.confidence);
}

function desbloqueosDe(prioridadId: string, dependencias: Dependencia[]): string[] {
  return dependencias
    .filter((d) => d.origen === prioridadId && d.tipo === "habilita")
    .map((d) => d.destino);
}

function habilitadaPorDe(prioridadId: string, dependencias: Dependencia[]): string | null {
  return dependencias.find((d) => d.destino === prioridadId)?.origen ?? null;
}

/**
 * Construye las prioridades presentables y ordenadas.
 * Determinista: mismas entradas producen el mismo orden y los mismos puntajes.
 */
export function construirPrioridades(salida: SalidaMotor): PrioridadVista[] {
  const hallazgosPorId = new Map(salida.findings.map((h) => [h.id, h]));

  const preliminares = salida.priorities.map((prioridad) => {
    const hallazgo = hallazgosPorId.get(prioridad.hallazgoId);
    const desbloquea = desbloqueosDe(prioridad.id, salida.dependencies);
    const variables = variablesDePrioridad(prioridad, hallazgo, desbloquea);
    const scoreBase = calcularScorePrioridad(variables);

    let nivel = nivelPorScore(scoreBase);
    const ajustes: string[] = [];

    // Regla complementaria 1: una acción habilitadora que desbloquea dos o más sube un nivel.
    if (desbloquea.length >= 2 && nivel !== "critica") {
      nivel = subirNivel(nivel);
      ajustes.push(
        `Sube un nivel porque habilita ${desbloquea.length} acciones dependientes.`
      );
    }

    // Regla complementaria 2: confianza baja no puede clasificarse como crítica.
    const requiereValidacion = variables.confidence < CONFIANZA_MINIMA_CRITICA;
    if (requiereValidacion && nivel === "critica") {
      nivel = bajarNivel(nivel);
      ajustes.push(
        "Requiere validación: la confianza de la evidencia es inferior a 0,65, por lo que no se clasifica como crítica."
      );
    } else if (requiereValidacion) {
      ajustes.push("Requiere validación: la evidencia disponible es limitada.");
    }

    const rationale = [
      `Impacto ${variables.impact}/5`,
      `urgencia ${variables.urgency}/5`,
      `riesgo ${variables.risk}/5`,
      `dependencia ${variables.dependency}/2`,
      `esfuerzo ${variables.effort}/5`,
      `confianza ${variables.confidence.toFixed(2)}`,
      `puntaje ${scoreBase.toFixed(2)} sobre 5`,
    ].join("; ");

    const vista: PrioridadVista = {
      id: `PR-${prioridad.hallazgoId}`,
      motorPriorityId: prioridad.id,
      findingRefs: [prioridad.hallazgoId],
      titulo: prioridad.titulo,
      dimensionId: prioridad.dimensionId,
      dimensionNombre: hallazgo?.dimensionNombre ?? prioridad.dimensionId,
      capacidadId: prioridad.capacidadId,
      variables,
      pesos: pesosPrioridadResultado,
      score: scoreBase,
      scoreBase,
      level: nivel,
      levelLabel: etiquetasNivel[nivel],
      rationale,
      ajustes,
      requiereValidacion,
      desbloquea,
      habilitadaPor: habilitadaPorDe(prioridad.id, salida.dependencies),
      orden: 0,
    };
    return vista;
  });

  // Orden: primero críticas y altas; empate por menor esfuerzo y luego mayor impacto.
  const ordenadas = [...preliminares].sort((a, b) => {
    const nivel = ordenNiveles.indexOf(b.level) - ordenNiveles.indexOf(a.level);
    if (nivel !== 0) return nivel;
    if (b.score !== a.score) return b.score - a.score;
    if (a.variables.effort !== b.variables.effort) {
      return a.variables.effort - b.variables.effort;
    }
    if (b.variables.impact !== a.variables.impact) {
      return b.variables.impact - a.variables.impact;
    }
    return a.id.localeCompare(b.id);
  });

  return ordenadas.map((p, indice) => ({ ...p, orden: indice + 1 }));
}

export function prioridadesPrincipales(prioridades: PrioridadVista[]): PrioridadVista[] {
  return prioridades.slice(0, MAXIMO_PRIORIDADES_INICIALES);
}

export function nivelConfianzaPrioridad(prioridad: PrioridadVista) {
  return nivelDeConfianza(prioridad.variables.confidence);
}
