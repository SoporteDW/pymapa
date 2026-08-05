/**
 * Arquitectura preparada para evidencias documentales (no implementada).
 *
 * Esta iteración únicamente deja definidos los contratos para que futuras
 * versiones puedan: solicitar documentos por actividad, recibir archivos,
 * asociar plantillas, cargar y almacenar evidencias, y permitir que la IA
 * analice dichos documentos como parte del proceso de transformación digital.
 *
 * IMPORTANTE: no existe todavía ninguna carga, almacenamiento ni análisis
 * documental. Estos tipos no se usan en la interfaz actual.
 */

export type TipoDocumentoSolicitado =
  | "politica"
  | "procedimiento"
  | "contrato"
  | "reporte"
  | "inventario"
  | "otro";

export type EstadoSolicitudDocumento =
  | "no_solicitado"
  | "solicitado"
  | "recibido"
  | "validado"
  | "rechazado";

/** Plantilla sugerida que en el futuro podrá descargar la pyme. */
export interface PlantillaDocumento {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoDocumentoSolicitado;
  /** Ruta o URL de la plantilla; se resolverá en una versión posterior. */
  referencia: string | null;
}

/** Solicitud de un documento asociada a una actividad del plan. */
export interface SolicitudDocumento {
  id: string;
  accionId: string;
  tipo: TipoDocumentoSolicitado;
  titulo: string;
  instrucciones: string;
  obligatorio: boolean;
  plantillaId: string | null;
  estado: EstadoSolicitudDocumento;
  fechaSolicitud: string | null;
}

/** Archivo cargado como evidencia. El almacenamiento se define más adelante. */
export interface ArchivoEvidencia {
  id: string;
  solicitudId: string;
  accionId: string;
  nombreArchivo: string;
  tipoMime: string;
  tamañoBytes: number;
  /** Ubicación futura del archivo (almacenamiento aún no definido). */
  ubicacion: string | null;
  fechaCarga: string;
  cargadoPor: string;
}

/** Resultado del futuro análisis asistido por IA sobre un documento. */
export interface AnalisisDocumental {
  id: string;
  archivoId: string;
  version: string;
  hallazgos: string[];
  recomendaciones: string[];
  confianza: number;
  fechaAnalisis: string;
  /** Referencias a reglas o dimensiones que el análisis alimentaría. */
  referencias: string[];
}

/** Contrato del servicio documental que implementará una versión posterior. */
export interface ServicioEvidencias {
  listarPlantillas(): Promise<PlantillaDocumento[]>;
  solicitarDocumento(solicitud: Omit<SolicitudDocumento, "id" | "estado">): Promise<SolicitudDocumento>;
  cargarEvidencia(solicitudId: string, archivo: File): Promise<ArchivoEvidencia>;
  listarEvidencias(accionId: string): Promise<ArchivoEvidencia[]>;
  analizarEvidencia(archivoId: string): Promise<AnalisisDocumental>;
}
