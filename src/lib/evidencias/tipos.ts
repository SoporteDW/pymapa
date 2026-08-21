/**
 * B3 · Contratos de evidencia documental.
 *
 * Una evidencia es conocimiento de la EMPRESA (no de la ejecución del
 * formulario): se solicita, se recibe, se analiza y queda disponible para el
 * resto del recorrido. El análisis de esta etapa es SIMULADO y así queda
 * marcado en el dato (`simulado: true`); no hay lectura documental real.
 */

export type TipoEvidencia =
  | "politica"
  | "procedimiento"
  | "contrato"
  | "reporte"
  | "inventario"
  | "captura"
  | "otro";

export type EstadoEvidencia =
  | "solicitada"
  | "recibida"
  | "en_analisis"
  | "analizada"
  | "rechazada";

/**
 * Relación de la evidencia con la cadena de conocimiento:
 * Empresa → Actividad → Instrumento → Entregable → Evidencia → Revisión.
 */
export interface VinculoEvidencia {
  empresaId: string;
  dominioId: string;
  /** Sesión de diagnóstico que originó la solicitud, si existe. */
  diagnosticoId: string | null;
  preguntaIds: string[];
  hallazgoIds: string[];
  actividadIds: string[];
  entregableIds: string[];
  /** Seguimientos (B7) que usan esta evidencia como respaldo de una medición. */
  seguimientoIds?: string[];
  /** Instrumento con el que se produjo el entregable, cuando aplica. */
  instrumentoId?: string | null;
  /** Revisión (B5) que evaluó el entregable del que nació esta evidencia. */
  revisionId?: string | null;
}

/** De dónde proviene la evidencia dentro del recorrido. */
export type OrigenEvidencia = "solicitud_diagnostico" | "entrega_workspace" | "seguimiento";


export interface ArchivoEvidencia {
  nombre: string;
  tipoMime: string;
  tamañoBytes: number;
  /** Ubicación real del archivo: no se almacena contenido en esta etapa. */
  ubicacion: string | null;
}

export interface AnalisisEvidencia {
  id: string;
  version: string;
  /** Marca explícita: el análisis no proviene de lectura documental real. */
  simulado: true;
  realizadoEn: string;
  observaciones: string[];
  /** Señales que el analista simulado dice haber verificado. */
  senalesVerificadas: string[];
  /** Si el análisis resuelve la necesidad de información del dominio. */
  resuelveSuficiencia: boolean;
}

export interface EvidenciaEmpresa {
  id: string;
  /** Solicitud del catálogo de conocimiento que la originó. */
  solicitudId: string;
  titulo: string;
  /** Por qué Pymapa la necesita (texto del catálogo, no de la UI). */
  motivo: string;
  instrucciones: string;
  tipo: TipoEvidencia;
  estado: EstadoEvidencia;
  vinculo: VinculoEvidencia;
  solicitadaEn: string;
  recibidaEn: string | null;
  archivo: ArchivoEvidencia | null;
  analisis: AnalisisEvidencia | null;
}

/** Respuesta a una pregunta de aclaración formulada por Pymapa. */
export interface AclaracionRegistrada {
  id: string;
  aclaracionId: string;
  dominioId: string;
  pregunta: string;
  motivo: string;
  respuesta: string;
  preguntaIds: string[];
  registradaEn: string;
}

/** Conocimiento documental acumulado por empresa. */
export interface RegistroEvidenciasEmpresa {
  empresaId: string;
  empresaNombre: string;
  evidencias: EvidenciaEmpresa[];
  aclaraciones: AclaracionRegistrada[];
  actualizadoEn: string;
}
