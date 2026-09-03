/**
 * B4 + B5 · Contratos del Workspace de ejecución guiada.
 *
 * El workspace NO crea un sistema paralelo de actividades: guarda el ESTADO DE
 * EJECUCIÓN de una actividad que ya existe (ficha del plan general, iniciativa
 * del diagnóstico especializado o actividad del escenario demo), conservando la
 * trazabilidad de su origen.
 *
 * Capa: ejecución (datos de empresa). No contiene conocimiento ni UI.
 */

import type { ArchivoEvidencia } from "@/lib/evidencias/tipos";
import type { EsfuerzoFicha } from "@/lib/resultados/tipos";
import type { FormatoEntregable } from "@/lib/instrumentos/tipos";

/** B5 · Ciclo de ida y vuelta. */
export type EstadoEjecucion =
  | "pendiente"
  | "en_ejecucion"
  | "entregado"
  | "requiere_ajustes"
  | "validado";

export type OrigenActividadTipo =
  | "ficha_general"
  | "iniciativa_kb"
  | "escenario_demo"
  /** B7 · actividad complementaria generada por el resultado de un seguimiento. */
  | "derivada_seguimiento";


export interface OrigenActividad {
  tipo: OrigenActividadTipo;
  /** Instrumento o pack que originó la actividad (trazabilidad). */
  fuente: string;
  dominioId: string;
  dominioNombre: string;
  /** Referencias de conocimiento: hallazgos, reglas, preguntas. */
  referencias: string[];
}

export interface EntregableWorkspace {
  titulo: string;
  descripcion: string;
  formato: FormatoEntregable;
  /** P0.2 · adjuntar archivo solo es obligatorio si el instrumento lo exige. */
  requiereArchivo?: boolean;
  criteriosValidacion: string[];
}

/**
 * P0.3 · Borrador persistente de la entrega: los criterios declarados y la nota
 * son ESTADO DE LA ACTIVIDAD, no estado local de un formulario.
 */
export interface BorradorEntrega {
  criteriosDeclarados: string[];
  nota: string;
  archivos: ArchivoEvidencia[];
}

export interface RevisionEntrega {
  id: string;
  /** Marca explícita: la revisión es simulada y determinista. */
  simulada: true;
  revisadoEn: string;
  veredicto: "validado" | "requiere_ajustes";
  mensaje: string;
  criteriosCumplidos: string[];
  criteriosPendientes: string[];
  ajustesSolicitados: string[];
}

export interface RegistroEntrega {
  id: string;
  numero: number;
  entregadoEn: string;
  nota: string;
  /** Criterios que la empresa declara haber cumplido. */
  criteriosDeclarados: string[];
  archivos: ArchivoEvidencia[];
  /** Evidencias de la empresa creadas a partir de esta entrega (deuda 0.1). */
  evidenciaIds?: string[];
  revision: RevisionEntrega;
}


/** Verificación activada por profundización selectiva (B6). */
export interface VerificacionWorkspace {
  id: string;
  texto: string;
  subgrupo: string;
  impacto: number | null;
  costo: number | null;
  estado: "sin_revisar" | "cumple" | "no_cumple" | "no_aplica";
  nota: string;
}

export interface ProfundizacionWorkspace {
  reglaId: string;
  grupoId: string;
  grupoNombre: string;
  motivo: string;
  instrumentoId: string;
  instrumentoVersion: string;
  totalGrupo: number;
  verificaciones: VerificacionWorkspace[];
}

export interface ActividadWorkspace {
  /** Mismo id de la actividad de origen: no se duplica la actividad. */
  id: string;
  titulo: string;
  /** Qué se busca lograr (objetivo, no tarea). */
  objetivo: string;
  porQue: string;
  origen: OrigenActividad;
  estado: EstadoEjecucion;
  instrumentoId: string;
  instrumentoVersion: string;
  /** Pasos metodológicos del instrumento, congelados al abrir el workspace. */
  pasos: { orden: number; titulo: string; detalle: string; registro: string; hecho: boolean }[];
  entregable: EntregableWorkspace;
  profundizacion: ProfundizacionWorkspace | null;
  historial: RegistroEntrega[];
  /** P0.3 · lo que la empresa ya declaró para la próxima entrega. */
  borrador?: BorradorEntrega;
  /** B7 · reaperturas por resultado de seguimiento (el ciclo vuelve sobre sí). */
  reaperturas?: { motivo: string; fecha: string; seguimientoId: string | null }[];
  creadoEn: string;
  actualizadoEn: string;

}

export interface RegistroWorkspaceEmpresa {
  empresaId: string;
  empresaNombre: string;
  actividades: ActividadWorkspace[];
  actualizadoEn: string;
}

/** Entrada mínima para abrir el workspace de una actividad existente. */
export interface PlantillaActividad {
  id: string;
  titulo: string;
  objetivo: string;
  porQue: string;
  origen: OrigenActividad;
  /** Pasos propios de la ficha; si faltan, se usan los del instrumento. */
  pasosSugeridos?: string[];
  /** Señales para profundización selectiva con el checklist experto. */
  senalesProfundizacion?: string[];
  /**
   * Esfuerzo y duración YA estimados por la Ficha de Acción del diagnóstico.
   * Se transportan como metadatos de la actividad de origen (no son un nuevo
   * estado ni una segunda fuente de verdad): la lectura de intervención los
   * necesita para derivar inversión y horizonte.
   */
  esfuerzo?: EsfuerzoFicha;
  duracion?: string;
}
