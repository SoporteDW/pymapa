/**
 * Contratos de datos del Sistema de Diagnóstico Inteligente (POC-03).
 * Se mantienen independientes de la interfaz para que el POC-04 pueda consumir
 * el resultado sin depender de componentes visuales.
 */

export type TipoPreguntaDiagnostico =
  | "single_select"
  | "multi_select"
  | "scale_1_5"
  | "number"
  | "short_text";

export interface OpcionPregunta {
  /** Identificador estable, distinto del texto visible (POC-03, 9.1). */
  id: string;
  etiqueta: string;
  valor: string | number;
  descripcion?: string;
}

export interface PreguntaDiagnostico {
  id: string;
  /** Obligatorio en preguntas puntuables. */
  dimensionId?: string;
  seccion: "contexto" | "puntuable";
  texto: string;
  tipo: TipoPreguntaDiagnostico;
  obligatoria: boolean;
  puntuable: boolean;
  /** Peso relativo dentro de la dimensión. En el MVP Alfa todas valen 1. */
  peso?: number;
  opciones?: OpcionPregunta[];
  ayuda?: string;
  min?: number;
  max?: number;
  maxLength?: number;
}

export interface DimensionDefinicion {
  id: string;
  nombre: string;
  proposito: string;
  /** Peso sobre el puntaje global. La suma de todas las dimensiones es 1. */
  peso: number;
}

export interface UmbralNivel {
  min: number;
  max: number;
  nivel: string;
  mensaje: string;
}

export interface EtiquetaEscala {
  valor: number;
  etiqueta: string;
  normalizado: number;
}

export interface DiagnosticDefinition {
  id: string;
  version: string;
  title: string;
  dimensions: DimensionDefinicion[];
  questions: PreguntaDiagnostico[];
  /** Correspondencia central escala 1-5 → 0-100. */
  normalizationMap: Record<number, number>;
  escala: EtiquetaEscala[];
  thresholds: UmbralNivel[];
}

export type EstadoSesionDiagnostico =
  | "not_started"
  | "in_progress"
  | "review"
  | "processing"
  | "completed"
  | "error";

export interface DiagnosticSession {
  id: string;
  definitionVersion: string;
  companyProfileId: string | null;
  status: EstadoSesionDiagnostico;
  currentQuestionId: string | null;
  currentDimensionId: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  /** Código técnico del último error recuperable (cálculo o configuración). */
  errorCode?: string | null;
}

export type ValorRespuesta = string | string[] | number;

export interface DiagnosticAnswer {
  questionId: string;
  dimensionId?: string;
  value: ValorRespuesta;
  answeredAt: string;
}

export interface DimensionResult {
  dimensionId: string;
  nombre: string;
  peso: number;
  /** Promedio ponderado con precisión completa. */
  rawScore: number;
  /** Valor presentado, redondeado a un decimal. */
  displayedScore: number;
  level: string;
  mensajeNivel: string;
  answeredCount: number;
  totalCount: number;
}

/** Contrato de salida requerido por el POC-04 (POC-03, 12.2). */
export interface DiagnosticResult {
  sessionId: string;
  definitionVersion: string;
  algorithmVersion: string;
  contextAnswers: DiagnosticAnswer[];
  scoredAnswers: DiagnosticAnswer[];
  globalScore: number;
  globalLevel: string;
  globalMessage: string;
  dimensionResults: DimensionResult[];
  calculatedAt: string;
}

/** Estado del almacenamiento local mostrado como indicador discreto. */
export type EstadoGuardado = "idle" | "saving" | "saved" | "error";

export interface EstadoDiagnosticoAlmacenado {
  sesion: DiagnosticSession;
  respuestas: DiagnosticAnswer[];
  resultado: DiagnosticResult | null;
}
