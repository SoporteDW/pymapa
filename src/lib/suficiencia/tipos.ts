/**
 * B2 · Contratos de suficiencia, evidencia pendiente y aclaraciones.
 *
 * Estados CUALITATIVOS: no hay scoring, ni índices de confianza, ni pesos.
 * El diagnóstico general puede concluir por dominio que la información es
 * suficiente, insuficiente, que falta evidencia o que falta una aclaración.
 */

export type EstadoSuficiencia =
  | "suficiente"
  | "insuficiente"
  | "evidencia_pendiente"
  | "aclaracion_pendiente";

import type { TipoEvidencia } from "@/lib/evidencias/tipos";

/** Documento que Pymapa puede pedir para poder concluir en un dominio. */
export interface SolicitudEvidenciaDefinicion {
  id: string;
  dominioId: string;
  titulo: string;
  tipo: TipoEvidencia;
  /** Por qué se necesita (se muestra al usuario tal cual). */
  motivo: string;
  instrucciones: string;
  /** Señales que el análisis simulado revisará en el documento. */
  senales: string[];
}

/** Pregunta de aclaración que Pymapa puede formular. */
export interface AclaracionDefinicion {
  id: string;
  dominioId: string;
  pregunta: string;
  motivo: string;
}

/**
 * Condiciones admitidas. Son parametrizables y declarativas: el motor las
 * interpreta, el catálogo solo las describe.
 * - `respuestas_incompletas`: faltan respuestas puntuables del dominio.
 * - `nivel_declarado_bajo`: alguna respuesta del dominio es <= `umbral`.
 * - `respuestas_dispersas`: diferencia entre la mayor y la menor >= `umbral`.
 */
export type TipoCondicionSuficiencia =
  | "respuestas_incompletas"
  | "nivel_declarado_bajo"
  | "respuestas_dispersas";

export interface ReglaSuficiencia {
  id: string;
  dominioId: string;
  condicion: {
    tipo: TipoCondicionSuficiencia;
    /** "dominio" = todas las preguntas puntuables del dominio. */
    preguntas: "dominio" | string[];
    umbral?: number;
  };
  exige: "evidencia" | "aclaracion";
  solicitudId?: string;
  aclaracionId?: string;
  /** Explicación breve mostrada al usuario. */
  porQue: string;
  fuente: string;
}

/** Catálogo versionado: parte de la Knowledge Base, desacoplado de la UI. */
export interface CatalogoSuficiencia {
  id: string;
  version: string;
  estado: "experimental";
  solicitudes: SolicitudEvidenciaDefinicion[];
  aclaraciones: AclaracionDefinicion[];
  reglas: ReglaSuficiencia[];
}

/**
 * Mecanismos con los que la empresa puede resolver una necesidad.
 * La necesidad describe QUÉ falta; el mecanismo es CÓMO decide resolverlo.
 */
export type MecanismoResolucion = "aclaracion" | "evidencia" | "delegacion" | "apoyo";

/** Necesidad concreta detectada en un dominio. */
export interface NecesidadInformacion {
  reglaId: string;
  dominioId: string;
  tipo: "evidencia" | "aclaracion";
  /** Id de la solicitud o de la aclaración del catálogo. */
  referenciaId: string;
  titulo: string;
  porQue: string;
  preguntaIds: string[];
  /** Ya resuelta por cualquiera de los mecanismos válidos. */
  resuelta: boolean;
  /** Mecanismo que efectivamente la resolvió; null si sigue pendiente. */
  resueltaPor: MecanismoResolucion | null;
  /** Mecanismo sugerido por el catálogo, sin ser obligatorio. */
  mecanismoSugerido: MecanismoResolucion;
}

export interface SuficienciaDominio {
  dominioId: string;
  nombre: string;
  estado: EstadoSuficiencia;
  mensaje: string;
  respondidas: number;
  total: number;
  necesidades: NecesidadInformacion[];
}

export interface ResultadoSuficiencia {
  catalogoId: string;
  catalogoVersion: string;
  evaluadoEn: string;
  /** Estado agregado, derivado del peor estado por dominio. */
  estadoGeneral: EstadoSuficiencia;
  mensajeGeneral: string;
  dominios: SuficienciaDominio[];
  necesidadesPendientes: NecesidadInformacion[];
  /** Solo es verdadero cuando todos los dominios están suficientes. */
  puedeCerrar: boolean;
}
