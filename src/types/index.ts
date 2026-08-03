/**
 * Tipos y contratos de datos provisionales para el MVP Alfa.
 * POC-01 definió los modelos base. POC-02 los amplía para soportar
 * el recorrido completo, los detalles de dimensión y acción, y la revisión
 * de respuestas. Siguen siendo modelos provisionales: la lógica definitiva
 * de diagnóstico y priorización llegará en paquetes posteriores.
 */

export type Sector = "comercio" | "servicios" | "manufactura" | "tecnologia" | "otro";
export type Tamaño = "micro" | "pequeña" | "mediana";
export type EstadoDiagnostico = "no_iniciado" | "en_progreso" | "completado";
export type TipoPregunta = "seleccion_unica" | "seleccion_multiple" | "escala" | "texto";
export type Prioridad = "alta" | "media" | "baja";
export type Impacto = "alto" | "medio" | "bajo";
export type Esfuerzo = "alto" | "medio" | "bajo";
export type EstadoAccion = "pendiente" | "en_progreso" | "completada" | "pausada";
export type TipoActividad = "diagnostico" | "accion" | "perfil" | "sistema";
export type Horizonte = "ahora" | "despues" | "mas_adelante";
export type EtapaId = "preparar" | "diagnosticar" | "interpretar" | "actuar" | "seguir";

export interface Empresa {
  id: string;
  nombre: string;
  sector: Sector;
  tamaño: Tamaño;
  responsable: string;
  correo: string;
  ciudad: string;
  pais: string;
  canales: string[];
  presenciaDigital: string;
  objetivoPrincipal: string;
  sitioWeb?: string;
  descripcion?: string;
  fechaActualizacion: string;
}

export interface Diagnostico {
  id: string;
  estado: EstadoDiagnostico;
  progreso: number; // 0 - 100
  pasoActual: number; // índice basado en 0
  totalPasos: number;
  respuestasRevisadas: boolean;
  resultadosGenerados: boolean;
  fechaActualizacion: string;
}

export interface Opcion {
  id: string;
  etiqueta: string;
  valor: string | number;
}

export interface Pregunta {
  id: string;
  pasoId: string;
  seccion: string;
  texto: string;
  tipo: TipoPregunta;
  opciones?: Opcion[];
  ayuda?: string;
}

export interface PasoDiagnostico {
  id: string;
  numero: number; // 1 - n
  titulo: string;
  proposito: string;
  dimensionId: string;
}

export interface Respuesta {
  preguntaId: string;
  valor: string | string[] | number;
  fechaGuardado: string;
}

export interface Resultado {
  id: string; // slug usado en la ruta de detalle
  dimension: string;
  puntajeDemostrativo: number; // 0 - 100
  nivel: string;
  mensaje: string;
  queObservamos: string;
  queSignifica: string;
  fortalezas: string[];
  oportunidades: string[];
  preguntasRelacionadas: string[];
  accionesRelacionadas: string[];
  esSimulado: boolean;
}

export interface Accion {
  id: string;
  titulo: string;
  proposito: string;
  porQueImporta: string;
  prioridad: Prioridad;
  impacto: Impacto;
  esfuerzo: Esfuerzo;
  horizonte: Horizonte;
  duracionEstimada: string;
  responsableSugerido: string;
  pasos: string[];
  dimensionId: string;
  estado: EstadoAccion;
  esSimulada: boolean;
}

export interface PrioridadDemostrativa {
  id: string;
  titulo: string;
  razon: string;
  dimensionId: string;
}

export interface Actividad {
  id: string;
  fecha: string;
  tipo: TipoActividad;
  descripcion: string;
}

export interface Preferencias {
  menuColapsado: boolean;
  ultimaRuta: string;
  movimientoReducido: boolean;
}

export interface SesionMVP {
  empresa: Empresa;
  perfilCompletado: boolean;
  diagnostico: Diagnostico;
  respuestas: Respuesta[];
  resultados: Resultado[];
  prioridades: PrioridadDemostrativa[];
  acciones: Accion[];
  actividad: Actividad[];
  preferencias: Preferencias;
}
