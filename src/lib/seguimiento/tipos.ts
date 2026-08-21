/**
 * B7 · Contratos de seguimiento y auditoría continua.
 *
 * Distinguen EJECUCIÓN (la actividad se hizo y se validó) de RESULTADO (la
 * mejora produjo o no el efecto esperado). El seguimiento cuelga siempre de una
 * actividad ya existente del workspace: no crea un sistema paralelo.
 *
 * Capa: ejecución (datos de empresa). Sin scoring científico: la conclusión es
 * cualitativa y explicable.
 */

export type HitoSeguimientoId = "d30" | "d60" | "d90";

/** Qué puede pedir un hito de seguimiento. */
export type TipoSolicitudSeguimiento =
  | "dato"
  | "indicador"
  | "respuesta"
  | "documento"
  | "evidencia"
  | "observacion";

export interface SolicitudSeguimiento {
  tipo: TipoSolicitudSeguimiento;
  texto: string;
}

export interface MedicionHito {
  registradaEn: string;
  /** Valor del indicador declarado por la empresa (puede faltar). */
  valor: number | null;
  respuesta: string;
  observacion: string;
  /** Evidencias de la empresa asociadas a esta medición. */
  evidenciaIds: string[];
}

export interface HitoSeguimiento {
  id: HitoSeguimientoId;
  dias: number;
  etiqueta: string;
  fechaPrevista: string;
  solicitudes: SolicitudSeguimiento[];
  medicion: MedicionHito | null;
}

export type ResultadoSeguimiento = "mejoro" | "sin_cambio" | "empeoro" | "insuficiente";

/** Qué puede hacer Pymapa con el resultado del seguimiento. */
export type DecisionSeguimiento =
  | "validar_impacto"
  | "reabrir_actividad"
  | "actividad_complementaria"
  | "solicitar_evidencia"
  | "apoyo_especializado";

export type DireccionIndicador = "menor_mejor" | "mayor_mejor";

export interface IndicadorSeguimiento {
  id: string;
  nombre: string;
  descripcion: string;
  unidad: string;
  direccion: DireccionIndicador;
  lineaBase: number | null;
  meta: number | null;
  /** Origen del indicador en la base de conocimiento. */
  fuente: string;
}

export interface EvaluacionSeguimiento {
  evaluadoEn: string;
  /** Marca explícita: la evaluación es simulada y determinista. */
  simulada: true;
  resultado: ResultadoSeguimiento;
  mensaje: string;
  decision: DecisionSeguimiento;
  /** Explicabilidad: por qué Pymapa concluye esto. */
  porQue: string[];
  ultimoValor: number | null;
  hitoEvaluado: HitoSeguimientoId | null;
}

export type EstadoSeguimiento = "abierto" | "en_medicion" | "cerrado";

export interface SeguimientoActividad {
  id: string;
  empresaId: string;
  /** Actividad del workspace de la que nace el seguimiento. */
  actividadId: string;
  actividadTitulo: string;
  dominioId: string;
  dominioNombre: string;
  catalogoVersion: string;
  /** Trazabilidad: entrega validada que habilitó el seguimiento. */
  origen: { entregaId: string | null; validadoEn: string | null; porQue: string };
  indicador: IndicadorSeguimiento;
  hitos: HitoSeguimiento[];
  evaluacion: EvaluacionSeguimiento | null;
  estado: EstadoSeguimiento;
  /** Acciones derivadas de la evaluación (ids de actividad, apoyo, evidencia). */
  derivaciones: { tipo: DecisionSeguimiento; referenciaId: string; registradoEn: string }[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface RegistroSeguimientoEmpresa {
  empresaId: string;
  empresaNombre: string;
  seguimientos: SeguimientoActividad[];
  actualizadoEn: string;
}
