/**
 * Contratos de datos del POC-05 (secciones 5, 7, 8 y 12).
 * Capa de negocio pura: transforma la salida del Motor de Conocimiento (POC-04)
 * en resultados comprensibles, prioridades justificadas y Fichas de Acción.
 * No conoce componentes ni almacenamiento.
 */

import type { Advertencia, NombreSeveridad, SalidaMotor } from "@/lib/motor/tipos";

export const RESULTS_VERSION = "resultados-1.0.0";
export const ACTION_CATALOG_VERSION = "fichas-1.0.0";

/* ------------------------------------------------------------------ */
/* Madurez (POC-05, 5.2)                                               */
/* ------------------------------------------------------------------ */

export type NivelMadurez = "inicial" | "basico" | "en_desarrollo" | "avanzado";

export interface BandaMadurezResultado {
  nivel: NivelMadurez;
  etiqueta: string;
  min: number;
  max: number;
  interpretacion: string;
}

/* ------------------------------------------------------------------ */
/* Hallazgos presentables (POC-05, 12 · Finding)                        */
/* ------------------------------------------------------------------ */

export type TipoHallazgoVista = "fortaleza" | "brecha" | "riesgo" | "oportunidad";

export type NivelConfianza = "alta" | "media" | "baja";

export interface HallazgoVista {
  id: string;
  type: TipoHallazgoVista;
  title: string;
  description: string;
  dimensionId: string;
  dimensionNombre: string;
  capacidadNombre: string | null;
  evidenceRefs: string[];
  reglas: string[];
  confidence: number;
  nivelConfianza: NivelConfianza;
  severidad: NombreSeveridad;
  esHipotesis: boolean;
}

/* ------------------------------------------------------------------ */
/* Resultado por dimensión (POC-05, 6.3 y 12)                          */
/* ------------------------------------------------------------------ */

export interface DimensionResultVista {
  dimensionId: string;
  nombre: string;
  score: number;
  maturityLevel: NivelMadurez;
  maturityLabel: string;
  interpretation: string;
  confidence: number;
  nivelConfianza: NivelConfianza;
  cobertura: number;
  parcial: boolean;
  fortalezas: HallazgoVista[];
  brechas: HallazgoVista[];
  riesgos: HallazgoVista[];
  oportunidades: HallazgoVista[];
  notas: string[];
}

/* ------------------------------------------------------------------ */
/* Priorización (POC-05, 7)                                            */
/* ------------------------------------------------------------------ */

export type NivelPrioridad = "critica" | "alta" | "media" | "baja";

/** Variables de priorización del POC-05 (7.2). */
export interface VariablesPrioridad {
  impact: number;
  urgency: number;
  effort: number;
  risk: number;
  dependency: number;
  confidence: number;
}

export interface PrioridadVista {
  id: string;
  /** Prioridad de origen en el motor (POC-04). */
  motorPriorityId: string;
  findingRefs: string[];
  titulo: string;
  dimensionId: string;
  dimensionNombre: string;
  capacidadId: string | null;
  variables: VariablesPrioridad;
  pesos: Record<keyof Omit<VariablesPrioridad, "confidence">, number>;
  /** Puntaje 1,00–5,00 según la fórmula operativa (POC-05, 7.3). */
  score: number;
  scoreBase: number;
  level: NivelPrioridad;
  levelLabel: string;
  rationale: string;
  /** Reglas complementarias aplicadas (POC-05, 7.4). */
  ajustes: string[];
  requiereValidacion: boolean;
  desbloquea: string[];
  habilitadaPor: string | null;
  orden: number;
}

/* ------------------------------------------------------------------ */
/* Fichas de Acción (POC-05, 8)                                        */
/* ------------------------------------------------------------------ */

export type EsfuerzoFicha = "bajo" | "medio" | "alto";

export interface TrazabilidadFicha {
  dimensionId: string;
  dimensionNombre: string;
  capacidadNombre: string | null;
  hallazgos: { id: string; titulo: string; tipo: TipoHallazgoVista }[];
  reglas: string[];
  preguntas: string[];
  prioridadId: string;
  executionId: string;
  ruleSetVersion: string;
  catalogVersion: string;
}

export interface FichaAccion {
  id: string;
  title: string;
  problem: string;
  whyItMatters: string;
  priorityId: string;
  priorityLevel: NivelPrioridad;
  priorityLabel: string;
  priorityScore: number;
  impactExpected: string;
  effort: EsfuerzoFicha;
  effortScore: number;
  duration: string;
  ownerRole: string;
  prerequisites: string[];
  steps: string[];
  indicators: string[];
  risks: { riesgo: string; mitigacion: string }[];
  sourceRefs: TrazabilidadFicha;
  confidence: number;
  nivelConfianza: NivelConfianza;
  requiereValidacion: boolean;
  /** Estado inicial fijo: el seguimiento se implementa en el POC-06. */
  status: "pendiente";
  dimensionId: string;
  dimensionNombre: string;
}

/* ------------------------------------------------------------------ */
/* Resultado general (POC-05, 5.1 y 12)                                */
/* ------------------------------------------------------------------ */

export type Completitud = "completo" | "parcial";

export interface ResumenEjecutivo {
  mensajePrincipal: string;
  fortalezaDestacada: HallazgoVista | null;
  brechaPrincipal: HallazgoVista | null;
  siguientePaso: string;
}

export interface ResultadoPyme {
  id: string;
  diagnosticId: string;
  executionId: string;
  generatedAt: string;
  overallScore: number;
  maturityLevel: NivelMadurez;
  maturityLabel: string;
  maturityInterpretation: string;
  summary: ResumenEjecutivo;
  completeness: Completitud;
  cobertura: number;
  confidence: number;
  nivelConfianza: NivelConfianza;
  dimensions: DimensionResultVista[];
  fortalezas: HallazgoVista[];
  brechas: HallazgoVista[];
  riesgos: HallazgoVista[];
  oportunidades: HallazgoVista[];
  priorities: PrioridadVista[];
  /** Máximo cinco prioridades en la vista inicial (POC-05, 7.4). */
  topPriorities: PrioridadVista[];
  actions: FichaAccion[];
  advertencias: Advertencia[];
  dimensionesAfectadas: string[];
  versions: {
    resultsVersion: string;
    actionCatalogVersion: string;
    ruleSetVersion: string;
    catalogVersion: string;
    engineVersion: string;
  };
}

export interface EntradaResultados {
  salida: SalidaMotor;
}
