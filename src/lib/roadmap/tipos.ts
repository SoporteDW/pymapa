/**
 * Contratos de datos del POC-06 (secciones 4, 5, 12, 13 y 14).
 * Capa de negocio pura: convierte las Fichas de Acción del POC-05 en un plan
 * de ejecución con estados, fechas, dependencias, avance y trazabilidad.
 * No conoce componentes ni almacenamiento.
 */

import type { EsfuerzoFicha, NivelPrioridad } from "@/lib/resultados/tipos";

export const ROADMAP_VERSION = "roadmap-1.0.0";

/* ------------------------------------------------------------------ */
/* Fases y horizonte (POC-06, 2.1 y 6)                                 */
/* ------------------------------------------------------------------ */

export type FaseId = "ahora" | "proximamente" | "mas_adelante";

export interface FaseRoadmap {
  id: FaseId;
  nombre: string;
  orden: number;
  rangoTemporal: string;
  descripcion: string;
  criteriosDeSalida: string;
}

/* ------------------------------------------------------------------ */
/* Estados operativos (POC-06, 5)                                      */
/* ------------------------------------------------------------------ */

export type EstadoAccionRoadmap =
  | "PENDIENTE"
  | "LISTA"
  | "EN_CURSO"
  | "PAUSADA"
  | "BLOQUEADA"
  | "COMPLETADA"
  | "DESCARTADA";

/* ------------------------------------------------------------------ */
/* Seguimiento (POC-06, 4, 13 y 14)                                    */
/* ------------------------------------------------------------------ */

export interface PasoChecklist {
  id: string;
  texto: string;
  completado: boolean;
}

export type TipoEvidencia = "archivo" | "enlace" | "nota";

export interface Evidencia {
  id: string;
  tipo: TipoEvidencia;
  descripcion: string;
  referencia: string;
  fecha: string;
}

export interface NotaAccion {
  id: string;
  texto: string;
  fecha: string;
  autor: string;
}

export type TipoBloqueo = "recurso" | "decision" | "dependencia" | "tecnico" | "otro";

export interface Bloqueo {
  id: string;
  accionId: string;
  tipo: TipoBloqueo;
  descripcion: string;
  fechaDeteccion: string;
  estado: "abierto" | "resuelto";
  resolucion: string | null;
  fechaResolucion: string | null;
}

export type TipoRegistroAvance =
  | "creacion"
  | "cambio_estado"
  | "avance"
  | "reprogramacion"
  | "responsable"
  | "nota"
  | "evidencia"
  | "bloqueo"
  | "fase"
  | "descarte";

export interface RegistroAvance {
  id: string;
  accionId: string;
  fecha: string;
  usuario: string;
  tipo: TipoRegistroAvance;
  estadoAnterior: EstadoAccionRoadmap | null;
  estadoNuevo: EstadoAccionRoadmap | null;
  porcentaje: number | null;
  comentario: string;
  evidenciaId: string | null;
}

/* ------------------------------------------------------------------ */
/* Trazabilidad conservada del POC-05 (POC-06, 3 y 12)                 */
/* ------------------------------------------------------------------ */

export interface OrigenAccion {
  fichaAccionId: string;
  hallazgoId: string | null;
  hallazgoTitulo: string | null;
  prioridadId: string;
  dimensionId: string;
  dimensionNombre: string;
  capacidadNombre: string | null;
  reglas: string[];
  preguntas: string[];
  executionId: string;
}

/* ------------------------------------------------------------------ */
/* Acción del Roadmap (POC-06, 4)                                      */
/* ------------------------------------------------------------------ */

export interface AccionRoadmap {
  id: string;
  fichaAccionId: string;
  hallazgoId: string | null;
  titulo: string;
  objetivo: string;
  porQueImporta: string;
  /** Prioridad calculada en POC-05: nunca se modifica (POC-06, 19). */
  prioridadOrigen: NivelPrioridad;
  prioridadOrigenLabel: string;
  prioridadScore: number;
  /** Prioridad operativa editable por el usuario. */
  prioridadOperativa: NivelPrioridad;
  impacto: string;
  esfuerzo: EsfuerzoFicha;
  duracion: string;
  duracionDias: number;
  responsable: string;
  responsableSugerido: string;
  fechaInicio: string | null;
  fechaObjetivo: string | null;
  /** Valores originales sugeridos por el sistema (POC-06, 6.9). */
  fechaInicioOriginal: string | null;
  fechaObjetivoOriginal: string | null;
  faseId: FaseId;
  faseOriginal: FaseId;
  orden: number;
  estado: EstadoAccionRoadmap;
  avance: number;
  checklist: PasoChecklist[];
  indicadores: string[];
  dependencias: string[];
  notas: NotaAccion[];
  evidencias: Evidencia[];
  motivoDescarte: string | null;
  requiereValidacion: boolean;
  origen: OrigenAccion;
  actualizadaEn: string;
}

/* ------------------------------------------------------------------ */
/* Roadmap (POC-06, 4)                                                 */
/* ------------------------------------------------------------------ */

export type EstadoGeneralRoadmap = "borrador" | "en_ejecucion" | "completado";

export interface ResumenRoadmap {
  totalAcciones: number;
  progresoGeneral: number;
  pendientes: number;
  listas: number;
  enCurso: number;
  pausadas: number;
  bloqueadas: number;
  completadas: number;
  descartadas: number;
  vencidas: number;
  proximasAVencer: number;
  sinResponsable: number;
  sinFecha: number;
}

export interface Roadmap {
  id: string;
  empresaId: string;
  executionId: string;
  version: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  estadoGeneral: EstadoGeneralRoadmap;
  horizonte: string;
  fases: FaseRoadmap[];
  acciones: AccionRoadmap[];
  bloqueos: Bloqueo[];
  historial: RegistroAvance[];
  esDemo: boolean;
}
