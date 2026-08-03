/**
 * Generación automática de Fichas de Acción (POC-05, sección 8).
 * Cada ficha se deriva de una prioridad y de su hallazgo de origen: no se
 * inventa información fuera del diagnóstico ni de las plantillas aprobadas.
 */

import type { SalidaMotor } from "@/lib/motor/tipos";
import { nivelDeConfianza } from "./niveles";
import { plantillaPara } from "./plantillas";
import type {
  EsfuerzoFicha,
  FichaAccion,
  HallazgoVista,
  PrioridadVista,
  TrazabilidadFicha,
} from "./tipos";

export function esfuerzoDeVariable(effort: number): EsfuerzoFicha {
  if (effort <= 2) return "bajo";
  if (effort === 3) return "medio";
  return "alto";
}

/** Rango simple y conservador de tiempo estimado (POC-05, 8.1). */
export function duracionEstimada(esfuerzo: EsfuerzoFicha): string {
  if (esfuerzo === "bajo") return "1 a 2 semanas";
  if (esfuerzo === "medio") return "3 a 6 semanas";
  return "2 a 3 meses";
}

export function etiquetaEsfuerzo(esfuerzo: EsfuerzoFicha): string {
  if (esfuerzo === "bajo") return "Bajo";
  if (esfuerzo === "medio") return "Medio";
  return "Alto";
}

function trazabilidad(
  salida: SalidaMotor,
  prioridad: PrioridadVista,
  hallazgos: HallazgoVista[]
): TrazabilidadFicha {
  const relacionados = hallazgos.filter((h) => prioridad.findingRefs.includes(h.id));
  return {
    dimensionId: prioridad.dimensionId,
    dimensionNombre: prioridad.dimensionNombre,
    capacidadNombre: relacionados[0]?.capacidadNombre ?? null,
    hallazgos: relacionados.map((h) => ({ id: h.id, titulo: h.title, tipo: h.type })),
    reglas: [...new Set(relacionados.flatMap((h) => h.reglas))].sort(),
    preguntas: [...new Set(relacionados.flatMap((h) => h.evidenceRefs))].sort(),
    prioridadId: prioridad.id,
    executionId: salida.metadata.executionId,
    ruleSetVersion: salida.metadata.ruleSetVersion,
    catalogVersion: salida.metadata.catalogVersion,
  };
}

export function generarFicha(
  salida: SalidaMotor,
  prioridad: PrioridadVista,
  hallazgos: HallazgoVista[]
): FichaAccion {
  const origen = hallazgos.find((h) => prioridad.findingRefs.includes(h.id));
  const plantilla = plantillaPara(prioridad.capacidadId, prioridad.dimensionId);
  const esfuerzo = esfuerzoDeVariable(prioridad.variables.effort);
  const motorHallazgo = salida.findings.find((h) => h.id === origen?.id);

  const prerequisitos = [...plantilla.prerrequisitos];
  if (prioridad.habilitadaPor) {
    const habilitadora = salida.priorities.find((p) => p.id === prioridad.habilitadaPor);
    if (habilitadora) {
      prerequisitos.unshift(`Avanzar primero en: ${habilitadora.titulo}`);
    }
  }

  return {
    id: `AC-${prioridad.dimensionId}-${(prioridad.capacidadId ?? prioridad.id).replace(/^CAP-/, "")}`,
    title: plantilla.titulo,
    problem: origen?.description ?? prioridad.titulo,
    whyItMatters:
      motorHallazgo?.implicacion ??
      "Resolver este punto facilita el avance de las demás mejoras digitales.",
    priorityId: prioridad.id,
    priorityLevel: prioridad.level,
    priorityLabel: prioridad.levelLabel,
    priorityScore: prioridad.score,
    impactExpected: plantilla.impactoEsperado,
    effort: esfuerzo,
    effortScore: prioridad.variables.effort,
    duration: duracionEstimada(esfuerzo),
    ownerRole: plantilla.responsable,
    prerequisites: prerequisitos,
    steps: plantilla.pasos,
    indicators: plantilla.indicadores,
    risks: plantilla.riesgos,
    sourceRefs: trazabilidad(salida, prioridad, hallazgos),
    confidence: prioridad.variables.confidence,
    nivelConfianza: nivelDeConfianza(prioridad.variables.confidence),
    requiereValidacion: prioridad.requiereValidacion,
    status: "pendiente",
    dimensionId: prioridad.dimensionId,
    dimensionNombre: prioridad.dimensionNombre,
  };
}

export function generarFichas(
  salida: SalidaMotor,
  prioridades: PrioridadVista[],
  hallazgos: HallazgoVista[]
): FichaAccion[] {
  const fichas: FichaAccion[] = [];
  const vistos = new Set<string>();
  for (const prioridad of prioridades) {
    const ficha = generarFicha(salida, prioridad, hallazgos);
    // Una ficha por capacidad: evita duplicados cuando varias reglas coinciden.
    if (vistos.has(ficha.id)) continue;
    vistos.add(ficha.id);
    fichas.push(ficha);
  }
  return fichas;
}
