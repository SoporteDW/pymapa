/**
 * Contratos de la capa de conocimiento (Knowledge Pack).
 *
 * Esta capa es genérica: no conoce el pack de E-commerce ni la interfaz.
 * Un pack concreto (por ejemplo `knowledgePackEcommerce`) implementa estos
 * contratos y puede reemplazarse por una versión posterior sin tocar la UI.
 *
 * Cadena modelada: Pregunta → Respuesta → Variable → Evaluación → Hallazgo →
 * Recomendación → Iniciativa.
 */

import type { Accion } from "@/types";

/** Dominios de conocimiento de la POC (KB-EC, KB-TEC, KB-SS, KB-CRO). */
export type DominioKB = "EC" | "TEC" | "SS" | "CRO";

export type TipoPreguntaKB = "unica" | "multiple";

/** Valor estructurado de una variable: opción única o lista de opciones. */
export type ValorVariable = string | string[];

/** Mapa variable → valor declarado por la empresa. */
export type ValoresKB = Record<string, ValorVariable | undefined>;

/** Mapa preguntaId → respuesta declarada. */
export type RespuestasKB = Record<string, ValorVariable | undefined>;

export interface OpcionKB {
  /** Valor persistido de la opción (estable, independiente del texto). */
  valor: string;
  etiqueta: string;
  /** Marca las opciones que expresan desconocimiento ("No sabemos"). */
  desconoce?: boolean;
}

export interface PreguntaKB {
  /** Identificador oficial del pack, por ejemplo "TEC-Q02". */
  id: string;
  dominio: DominioKB;
  tema: string;
  texto: string;
  tipo: TipoPreguntaKB;
  opciones: OpcionKB[];
  /** Variable estructurada asociada, por ejemplo "TEC-V02 integration_needs". */
  variableId: string;
  variable: string;
  ayuda?: string;
  /** Regla condicional del pack que controla su visibilidad (LC-xx). */
  condicionalId?: string;
  /** Predicado de visibilidad evaluado sobre las variables ya declaradas. */
  visibleSi?: (valores: ValoresKB) => boolean;
}

export interface CondicionalKB {
  id: string;
  condicion: string;
  comportamiento: string;
}

export interface HallazgoKB {
  id: string;
  dominio: DominioKB;
  titulo: string;
  evidencia: string;
  interpretacion: string;
}

/** Escalas experimentales de la POC (sección 11): revisables y explicables. */
export type EscalaKB = "bajo" | "medio" | "alto";

export interface RecomendacionKB {
  id: string;
  hallazgoId: string;
  texto: string;
  objetivo: string;
  resultadoEsperado: string;
  acciones: string[];
  impacto: EscalaKB;
  esfuerzo: EscalaKB;
  urgencia: EscalaKB;
  /** Dimensión Pymapa relacionada (etiqueta legible). */
  dimension: string;
  /** Marca los valores como experimentales y editables. */
  experimental: true;
}

export interface ReglaKB {
  id: string;
  dominio: DominioKB;
  /** Variables utilizadas por la regla. */
  variables: string[];
  /** Preguntas que originan esas variables. */
  preguntas: string[];
  /** Descripción legible de la condición. */
  condicionTexto: string;
  /** Interpretación (evaluación) que produce la regla. */
  evaluacion: string;
  hallazgoId: string;
  recomendacionId: string;
  /** Fuente metodológica del pack (SRC-xxx). */
  fuente: string;
  condicion: (valores: ValoresKB) => boolean;
}

/** Nivel de evidencia: nunca se inventa precisión numérica (principio P-07). */
export type NivelEvidencia = "declarada" | "parcial" | "insuficiente";

export interface PerfilTecnologicoKB {
  /** Perfil requerido, nunca una plataforma concreta. */
  perfil: string;
  razones: string[];
  preliminar: true;
  pendientes: string[];
  evidencia: NivelEvidencia;
  /** LC-06: tensión entre complejidad de integración y capacidad interna. */
  tension: boolean;
}

export interface DatasetDemoKB {
  id: string;
  nombreEmpresa: string;
  descripcion: string;
  ficticio: true;
  respuestas: RespuestasKB;
}

export interface KnowledgePack {
  id: string;
  nombre: string;
  version: string;
  estado: "experimental";
  fuentes: { codigo: string; fuente: string; uso: string }[];
  dominios: { id: DominioKB; etiqueta: string; proposito: string }[];
  preguntas: PreguntaKB[];
  condicionales: CondicionalKB[];
  hallazgos: HallazgoKB[];
  recomendaciones: RecomendacionKB[];
  reglas: ReglaKB[];
  perfilTecnologico: (valores: ValoresKB) => PerfilTecnologicoKB;
  datasetDemo: DatasetDemoKB;
}

/* ------------------------------------------------------------------ */
/* Resultado de la evaluación                                          */
/* ------------------------------------------------------------------ */

/** Un eslabón de la trazabilidad: pregunta → respuesta → variable. */
export interface TrazaRespuestaKB {
  preguntaId: string;
  pregunta: string;
  respuesta: string;
  variableId: string;
  variable: string;
  respondida: boolean;
}

export interface HallazgoDetectadoKB {
  hallazgo: HallazgoKB;
  regla: ReglaKB;
  recomendacion: RecomendacionKB;
  evidencia: NivelEvidencia;
  trazas: TrazaRespuestaKB[];
}

export interface EstadoDominioKB {
  dominio: DominioKB;
  etiqueta: string;
  /** "preliminar" cuando hay evidencia; "insuficiente" cuando no alcanza. */
  estado: "preliminar" | "insuficiente" | "sin_alcance";
  mensaje: string;
  hallazgos: number;
}

export interface ResultadoKB {
  packId: string;
  packVersion: string;
  companyId: string;
  companyName: string;
  generadoEn: string;
  esDemo: boolean;
  resumen: string;
  estados: EstadoDominioKB[];
  hallazgos: HallazgoDetectadoKB[];
  perfilTecnologico: PerfilTecnologicoKB;
  /** Preguntas visibles y aún sin responder (evidencia faltante). */
  faltantes: TrazaRespuestaKB[];
  progreso: { respondidas: number; visibles: number; porcentaje: number };
}

/** Texto único para toda ausencia de evidencia (principio P-07). */
export const TEXTO_INSUFICIENTE = "Información insuficiente para concluirlo.";

/* ------------------------------------------------------------------ */
/* Persistencia por empresa                                            */
/* ------------------------------------------------------------------ */

/**
 * Trazabilidad de origen que viaja con la iniciativa dentro del modelo de
 * Plan de Acción/Roadmap ya existente (no se crea un sistema paralelo).
 */
export interface OrigenKB {
  packId: string;
  packVersion: string;
  reglaId: string;
  hallazgoId: string;
  recomendacionId: string;
  preguntas: string[];
  objetivo: string;
  resultadoEsperado: string;
  creadaEn: string;
}

export interface IniciativaKB {
  /** Ficha compatible con el Plan de Acción actual. */
  accion: Accion;
  origen: OrigenKB;
}

export interface RegistroEmpresaKB {
  companyId: string;
  companyName: string;
  respuestas: RespuestasKB;
  esDemo: boolean;
  datasetDemoId?: string;
  actualizadoEn: string;
  iniciativas: IniciativaKB[];
}
