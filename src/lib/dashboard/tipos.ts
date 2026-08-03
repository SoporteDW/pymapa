/**
 * Contratos de datos del POC-07 (secciones 6 y 12).
 * Capa de negocio pura: deriva indicadores del diagnóstico (POC-03), del motor
 * (POC-04), de los resultados y fichas (POC-05) y del Roadmap (POC-06).
 * No conoce componentes ni almacenamiento.
 */

import type { AccionRoadmap, EstadoAccionRoadmap } from "@/lib/roadmap/tipos";
import type { NivelPrioridad, NivelMadurez } from "@/lib/resultados/tipos";
import type { SeveridadAlerta, TipoAlerta } from "@/lib/roadmap/alertas";

export const DASHBOARD_VERSION = "dashboard-1.0.0";

/* ------------------------------------------------------------------ */
/* Indicadores (POC-07, 6)                                             */
/* ------------------------------------------------------------------ */

export type MetricId =
  | "KPI-01"
  | "KPI-02"
  | "KPI-03"
  | "KPI-04"
  | "KPI-05"
  | "KPI-06"
  | "KPI-07"
  | "KPI-08"
  | "KPI-09"
  | "KPI-10";

/** "sin_datos" evita presentar cero como resultado real (POC-07, 7). */
export type EstadoMetrica = "disponible" | "sin_datos";

export type UnidadMetrica = "puntos" | "porcentaje" | "acciones" | "eventos" | "texto";

export interface MetricValue {
  metricId: MetricId;
  titulo: string;
  /** null cuando el origen no existe: la interfaz muestra "sin información". */
  value: number | null;
  /** Valor textual para indicadores cualitativos (KPI-10). */
  texto: string | null;
  unit: UnidadMetrica;
  status: EstadoMetrica;
  periodStart: string;
  periodEnd: string;
  /** Identificadores trazables: acciones, hallazgos, prioridades o ejecución. */
  sourceIds: string[];
  contexto: string;
  /** Origen navegable del indicador (POC-07, CA-05). */
  detalle: DestinoIndicador | null;
}

export type DestinoIndicador =
  | { tipo: "resultados" }
  | { tipo: "dimension"; dimensionId: string }
  | { tipo: "roadmap"; estado?: EstadoAccionRoadmap; soloVencidas?: boolean; soloBloqueadas?: boolean }
  | { tipo: "accion"; accionId: string }
  | { tipo: "alertas" };

/* ------------------------------------------------------------------ */
/* Series y actividad (POC-07, 12)                                     */
/* ------------------------------------------------------------------ */

export interface TrendPoint {
  metricId: MetricId;
  date: string;
  value: number;
  etiqueta: string;
}

export interface SerieTendencia {
  metricId: MetricId;
  titulo: string;
  puntos: TrendPoint[];
  status: EstadoMetrica;
  nota: string;
}

export type TipoEventoActividad =
  | "cambio_estado"
  | "avance"
  | "evidencia"
  | "bloqueo"
  | "reprogramacion"
  | "nota"
  | "diagnostico"
  | "otro";

export interface ActivityEvent {
  id: string;
  eventType: TipoEventoActividad;
  title: string;
  timestamp: string;
  actor: string;
  relatedEntityType: "accion" | "diagnostico";
  relatedEntityId: string;
  detalle: string;
}

/* ------------------------------------------------------------------ */
/* Alertas del centro de alertas (POC-07, 8.3)                         */
/* ------------------------------------------------------------------ */

export type TipoAlertaDashboard = TipoAlerta | "sin_actividad" | "critica_pendiente";

export interface AlertaDashboard {
  id: string;
  type: TipoAlertaDashboard;
  severity: SeveridadAlerta;
  title: string;
  causa: string;
  consecuencia: string;
  recomendacion: string;
  createdAt: string | null;
  relatedActionId: string | null;
  relatedActionTitle: string | null;
  dimensionId: string | null;
  status: "abierta";
}

/* ------------------------------------------------------------------ */
/* Bloques del dashboard                                               */
/* ------------------------------------------------------------------ */

export interface ItemDistribucionEstado {
  estado: EstadoAccionRoadmap;
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
}

export interface CumplimientoFechas {
  aTiempo: number;
  vencidas: number;
  proximas: number;
  sinFecha: number;
  totalConFecha: number;
  porcentajeATiempo: number | null;
}

export interface ItemDimensionDashboard {
  dimensionId: string;
  nombre: string;
  madurez: number;
  nivel: NivelMadurez;
  nivelLabel: string;
  interpretacion: string;
  avanceAcciones: number | null;
  totalAcciones: number;
  completadas: number;
  bloqueadas: number;
  vencidas: number;
  hallazgos: number;
  prioridades: number;
  parcial: boolean;
}

export interface BloqueoDashboard {
  bloqueoId: string;
  accionId: string;
  accionTitulo: string;
  descripcion: string;
  tipo: string;
  fechaDeteccion: string;
  antiguedadDias: number;
  dimensionId: string;
}

/* ------------------------------------------------------------------ */
/* Filtros (POC-07, 9 y 12)                                            */
/* ------------------------------------------------------------------ */

export type PeriodoDashboard = "30" | "90" | "180" | "historico";

export interface DashboardFilters {
  period: PeriodoDashboard;
  dimensionId: string | "todas";
  priority: NivelPrioridad | "todas";
  actionStatus: EstadoAccionRoadmap | "todos";
  ownerId: string | "todos";
}

export interface RangoPeriodo {
  inicio: string;
  fin: string;
  etiqueta: string;
  dias: number | null;
}

/* ------------------------------------------------------------------ */
/* Snapshot (POC-07, 12)                                               */
/* ------------------------------------------------------------------ */

export interface DashboardSnapshot {
  id: string;
  companyId: string;
  diagnosticId: string;
  executionId: string;
  generatedAt: string;
  diagnosticGeneratedAt: string;
  roadmapUpdatedAt: string | null;
  maturityScore: number;
  maturityLabel: string;
  roadmapProgress: number | null;
  impactCoverage: number | null;
  version: string;
  esDemo: boolean;
  filtros: DashboardFilters;
  periodo: RangoPeriodo;
  metricas: Record<MetricId, MetricValue>;
  distribucionEstados: ItemDistribucionEstado[];
  cumplimiento: CumplimientoFechas;
  dimensiones: ItemDimensionDashboard[];
  prioridadesCriticas: AccionRoadmap[];
  bloqueos: BloqueoDashboard[];
  actividad: ActivityEvent[];
  tendencias: SerieTendencia[];
  recomendacion: AccionRoadmap | null;
  alertas: AlertaDashboard[];
  accionesFiltradas: AccionRoadmap[];
  /** Módulos que fallaron al calcularse: habilita el error parcial (POC-07, 10). */
  modulosConError: string[];
}
