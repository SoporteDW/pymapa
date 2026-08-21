/**
 * B4 · Contratos de instrumentos metodológicos de ejecución.
 *
 * Un instrumento responde "¿con qué se hace?": plantilla, checklist, matriz,
 * guion o procedimiento. Pertenece a la capa de CONOCIMIENTO: es versionado,
 * reutilizable y no depende de la empresa ni de la interfaz.
 */

export type TipoInstrumentoEjecucion =
  | "plantilla"
  | "checklist"
  | "matriz"
  | "guion"
  | "procedimiento"
  | "auditoria";

export type FormatoEntregable =
  | "documento"
  | "hoja_de_calculo"
  | "presentacion"
  | "captura"
  | "registro";

export interface PasoInstrumento {
  orden: number;
  titulo: string;
  detalle: string;
  /** Qué debe quedar registrado al terminar el paso. */
  registro: string;
}

export interface EntregableEsperado {
  titulo: string;
  descripcion: string;
  formato: FormatoEntregable;
  /** Criterios observables que la revisión verificará uno a uno. */
  criteriosValidacion: string[];
}

export interface InstrumentoEjecucion {
  id: string;
  nombre: string;
  version: string;
  tipo: TipoInstrumentoEjecucion;
  /** Cómo se trabaja el instrumento (metodología, no herramienta). */
  metodologia: string;
  /** Dominios del diagnóstico general a los que aplica. */
  dominios: string[];
  /** Señales del título/objetivo de la actividad que lo hacen pertinente. */
  senales: string[];
  pasos: PasoInstrumento[];
  entregable: EntregableEsperado;
  fuente: string;
  capa: "conocimiento";
}
