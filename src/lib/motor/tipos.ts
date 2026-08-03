/**
 * Contratos de datos del Motor de Conocimiento y Reglas (POC-04, secciones 5, 8, 9 y 13).
 * Esta capa no conoce la interfaz: describe únicamente entidades, reglas y salidas.
 */

import type { DiagnosticAnswer, ValorRespuesta } from "@/lib/diagnostico/tipos";

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

export type Criticidad = "baja" | "media" | "alta" | "critica";

/** Competencia observable dentro de una dimensión (POC-04, 5). */
export interface Capacidad {
  id: string;
  dimensionId: string;
  nombre: string;
  descripcion: string;
  criticidad: Criticidad;
  /** Preguntas del POC-03 que aportan evidencia a la capacidad. */
  preguntas: string[];
  /** Grado en que habilita otras capacidades (1-5, factor de fundacionalidad). */
  fundacionalidad: number;
}

/** Par de preguntas cuya combinación revela una contradicción directa (POC-04, 10). */
export interface ParContradiccion {
  id: string;
  dimensionId: string;
  /** Pregunta cuyo valor bajo declara ausencia de la práctica. */
  preguntaBaja: string;
  /** Pregunta cuyo valor alto declara la práctica consolidada. */
  preguntaAlta: string;
  umbralBajo: number;
  umbralAlto: number;
  descripcion: string;
}

export interface BandaMadurez {
  nivel: 1 | 2 | 3 | 4 | 5;
  nombre: string;
  descripcion: string;
  min: number;
  max: number;
}

export interface BandaPrioridad {
  banda: "observacion" | "baja" | "media" | "alta" | "critica";
  etiqueta: string;
  min: number;
  max: number;
}

/* ------------------------------------------------------------------ */
/* Señales                                                             */
/* ------------------------------------------------------------------ */

export type TipoSenal =
  | "fortaleza"
  | "brecha"
  | "riesgo"
  | "oportunidad"
  | "dependencia"
  | "inconsistencia"
  | "sin_evidencia";

export type Polaridad = -1 | 0 | 1;
export type Intensidad = 1 | 2 | 3;

/** Interpretación elemental derivada de una o más respuestas (POC-04, 7). */
export interface Senal {
  id: string;
  tipo: TipoSenal;
  dimensionId: string;
  capacidadId: string | null;
  polaridad: Polaridad;
  intensidad: Intensidad;
  /** Identificadores de pregunta que la sustentan. */
  evidencia: string[];
  confianza: number;
  /** Valor normalizado 0-100 de la respuesta, cuando aplica. */
  valorNormalizado: number | null;
  descripcion: string;
}

/* ------------------------------------------------------------------ */
/* Normalización (MC-01)                                               */
/* ------------------------------------------------------------------ */

export type BanderaCalidad =
  | "ok"
  | "faltante"
  | "no_aplica"
  | "fuera_de_rango"
  | "tipo_invalido"
  | "duplicada";

export interface RespuestaNormalizada {
  questionId: string;
  dimensionId: string | null;
  puntuable: boolean;
  valorOriginal: ValorRespuesta | undefined;
  /** 0-100 para preguntas puntuables válidas; null en cualquier otro caso. */
  valorNormalizado: number | null;
  bandera: BanderaCalidad;
  answeredAt: string | null;
  /** Justificación registrada para exclusiones y errores técnicos. */
  nota?: string;
}

export interface SalidaNormalizacion {
  respuestas: RespuestaNormalizada[];
  contexto: ContextoPyme;
  advertencias: Advertencia[];
}

export interface ContextoPyme {
  tamano: string | null;
  sector: string | null
  canales: string[];
  objetivo: string | null;
  /** Verdadero cuando la pyme declara al menos un canal digital. */
  tieneCanalDigital: boolean;
}

export type SeveridadAdvertencia = "informativa" | "baja" | "media" | "alta" | "critica";

export interface Advertencia {
  codigo: string;
  mensaje: string;
  severidad: SeveridadAdvertencia;
  referencias: string[];
}

/* ------------------------------------------------------------------ */
/* Reglas (POC-04, 8)                                                  */
/* ------------------------------------------------------------------ */

export type EstadoRegla = "draft" | "active" | "deprecated";

export type TipoSalidaRegla =
  | "fortaleza"
  | "brecha"
  | "riesgo"
  | "oportunidad"
  | "dependencia"
  | "inconsistencia";

export type NombreSeveridad = "informativa" | "baja" | "media" | "alta" | "critica";

/** Condición declarativa: las reglas son datos, nunca código dentro de componentes. */
export type Condicion =
  | { tipo: "senal"; questionId: string; senales: TipoSenal[]; intensidadMin?: number }
  | { tipo: "respuestaMenorIgual"; questionId: string; valor: number }
  | { tipo: "respuestaMayorIgual"; questionId: string; valor: number }
  | { tipo: "sinEvidencia"; questionId: string }
  | { tipo: "conEvidencia"; questionId: string }
  | { tipo: "promedioDimension"; dimensionId: string; operador: "<" | ">=" ; valor: number }
  | { tipo: "coberturaDimension"; dimensionId: string; operador: "<" | ">="; valor: number }
  | { tipo: "inconsistencia"; parId: string }
  | { tipo: "contexto"; campo: "tamano" | "sector" | "objetivo"; valores: string[] }
  | { tipo: "canalDigital"; presente: boolean }
  | { tipo: "todas"; condiciones: Condicion[] }
  | { tipo: "alguna"; condiciones: Condicion[] }
  | { tipo: "no"; condicion: Condicion };

/** Factores de priorización declarados por la regla (POC-04, 11). */
export interface FactoresRegla {
  impacto: number;
  urgencia: number;
  fundacionalidad: number;
  factibilidad: number;
}

export interface Regla {
  ruleId: string;
  version: string;
  status: EstadoRegla;
  scope: { dimensionId: string; capacidadId: string | null };
  conditions: Condicion;
  /** Condiciones de aplicabilidad por contexto pyme (POC-04, 10 y CF-MC-10). */
  applicability?: Condicion;
  evidenceRefs: string[];
  outputType: TipoSalidaRegla;
  severity: NombreSeveridad;
  /** Piso y techo de confianza aplicables al hallazgo generado. */
  confidencePolicy: { base: number; minCobertura?: number; penalizacionInconsistencia?: number };
  messageKey: string;
  priorityFactors: FactoresRegla;
  /** Excepción documentada: eleva la banda a crítica (POC-04, 11 y 12). */
  escalaCritica?: boolean;
  /** Capacidad habilitadora requerida antes de esta necesidad. */
  habilitadaPor?: string;
  supersedes?: string;
}

export interface ReglaActivada {
  ruleId: string;
  ruleVersion: string;
  outputType: TipoSalidaRegla;
  dimensionId: string;
  capacidadId: string | null;
  severity: NombreSeveridad;
  messageKey: string;
  evidencia: string[];
  senales: string[];
  confianza: number;
  condicionesEvaluadas: TrazaCondicion[];
  priorityFactors: FactoresRegla;
  escalaCritica: boolean;
  habilitadaPor?: string;
}

export interface TrazaCondicion {
  descripcion: string;
  resultado: boolean;
}

/* ------------------------------------------------------------------ */
/* Hallazgos, prioridades y explicaciones                              */
/* ------------------------------------------------------------------ */

export interface Hallazgo {
  id: string;
  tipo: TipoSalidaRegla | "capacidad_parcial";
  dimensionId: string;
  dimensionNombre: string;
  capacidadId: string | null;
  capacidadNombre: string | null;
  titulo: string;
  /** Estado actual observado. */
  estadoActual: string;
  /** Por qué importa para la pyme. */
  implicacion: string;
  severidad: NombreSeveridad;
  severidadNivel: number;
  confianza: number;
  /** Confianza baja: se presenta como hipótesis a validar (POC-04, 12). */
  esHipotesis: boolean;
  evidencia: string[];
  senales: string[];
  reglas: { ruleId: string; version: string }[];
  escalaCritica: boolean;
  habilitadaPor?: string;
}

export interface FactoresPrioridad {
  impacto: number;
  urgencia: number;
  fundacionalidad: number;
  brechaMadurez: number;
  factibilidad: number;
  confianza: number;
}

export interface Prioridad {
  id: string;
  hallazgoId: string;
  titulo: string;
  dimensionId: string;
  capacidadId: string | null;
  score: number;
  banda: BandaPrioridad["banda"];
  bandaEtiqueta: string;
  factores: FactoresPrioridad;
  pesos: Record<keyof FactoresPrioridad, number>;
  justificacion: string;
  /** Posición final tras aplicar dependencias habilitadoras. */
  orden: number;
  ajustadaPorDependencia: boolean;
  excepcionCritica: boolean;
}

export interface Dependencia {
  origen: string;
  destino: string;
  tipo: "habilita" | "requiere";
  fuerza: number;
  descripcion: string;
}

export interface Explicacion {
  hallazgoId: string;
  /** Texto claro y no técnico. */
  usuario: string;
  /** Reglas activadas, evidencia y factores. */
  prueba: {
    quePasoDetectado: string;
    evidencia: { questionId: string; texto: string; respuesta: string }[];
    reglas: { ruleId: string; version: string; severidad: NombreSeveridad }[];
    confianza: number;
    factoresPrioridad?: FactoresPrioridad;
  };
  /** IDs, versiones y trazas de condiciones evaluadas. */
  desarrollo: {
    catalogVersion: string;
    ruleSetVersion: string;
    senales: string[];
    condiciones: TrazaCondicion[];
  };
}

/* ------------------------------------------------------------------ */
/* Salida del motor (POC-04, 13)                                       */
/* ------------------------------------------------------------------ */

export interface ResultadoDimensionMotor {
  dimensionId: string;
  nombre: string;
  peso: number;
  puntaje: number;
  madurezNivel: number | null;
  madurezNombre: string;
  /** Verdadero cuando la cobertura no permite asignar nivel definitivo. */
  madurezProvisional: boolean;
  cobertura: number;
  confianza: number;
  fortalezas: string[];
  brechas: string[];
  alertasCriticas: number;
  notas: string[];
}

export interface CalidadMotor {
  coverage: number;
  consistencyScore: number;
  confidence: number;
  respondidas: number;
  aplicables: number;
  excluidasNoAplica: number;
  sinEvidencia: number;
  inconsistencias: number;
  warnings: Advertencia[];
}

export type EstadoEjecucion = "completado" | "provisional" | "error";

export interface MetadataEjecucion {
  executionId: string;
  diagnosisId: string;
  companyId: string | null;
  timestamp: string;
  catalogVersion: string;
  ruleSetVersion: string;
  engineVersion: string;
  definitionVersion: string;
  inputHash: string;
  status: EstadoEjecucion;
}

/** Datos preparados para POC-05, sin redacción final de recomendaciones. */
export interface NextStepPayload {
  diagnosisId: string;
  executionId: string;
  ruleSetVersion: string;
  contexto: ContextoPyme;
  /** Prioridades listas para convertirse en Fichas de Acción en POC-05. */
  necesidades: {
    prioridadId: string;
    hallazgoId: string;
    dimensionId: string;
    capacidadId: string | null;
    titulo: string;
    banda: BandaPrioridad["banda"];
    score: number;
    orden: number;
    habilitadaPor?: string;
    evidencia: string[];
    reglas: string[];
    confianza: number;
    esHipotesis: boolean;
  }[];
  fortalezas: { hallazgoId: string; dimensionId: string; titulo: string }[];
  advertencias: Advertencia[];
}

export interface SalidaMotor {
  metadata: MetadataEjecucion;
  quality: CalidadMotor;
  dimensionResults: ResultadoDimensionMotor[];
  findings: Hallazgo[];
  priorities: Prioridad[];
  dependencies: Dependencia[];
  explanations: Explicacion[];
  nextStepPayload: NextStepPayload;
  /** Trazabilidad completa: respuestas normalizadas, señales y reglas activadas. */
  trace: {
    respuestas: RespuestaNormalizada[];
    senales: Senal[];
    reglasActivadas: ReglaActivada[];
    reglasEvaluadas: number;
    reglasDescartadasPorContexto: string[];
  };
}

export interface EntradaMotor {
  diagnosisId: string;
  companyId?: string | null;
  definitionVersion: string;
  respuestas: DiagnosticAnswer[];
  /** Fecha inyectable para pruebas de determinismo. */
  fecha?: Date;
}
