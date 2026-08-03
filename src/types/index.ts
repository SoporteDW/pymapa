/**
 * Tipos y contratos de datos provisionales para el MVP Alfa.
 * Estos modelos son intencionalmente mínimos y pueden evolucionar
 * cuando lleguen los paquetes posteriores.
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

export interface Empresa {
  id: string;
  nombre: string;
  sector: Sector;
  tamaño: Tamaño;
  responsable: string;
  correo: string;
  fechaActualizacion: string;
}

export interface Diagnostico {
  id: string;
  estado: EstadoDiagnostico;
  progreso: number; // 0 - 100
  pasoActual: number;
  totalPasos: number;
  fechaActualizacion: string;
}

export interface Opcion {
  id: string;
  etiqueta: string;
  valor: string | number;
}

export interface Pregunta {
  id: string;
  seccion: string;
  texto: string;
  tipo: TipoPregunta;
  opciones?: Opcion[];
  ayuda?: string;
}

export interface Respuesta {
  preguntaId: string;
  valor: string | string[] | number;
  fechaGuardado: string;
}

export interface Resultado {
  dimension: string;
  puntajeDemostrativo: number; // 0 - 100
  nivel: string;
  mensaje: string;
  esSimulado: boolean;
}

export interface Accion {
  id: string;
  titulo: string;
  proposito: string;
  prioridad: Prioridad;
  impacto: Impacto;
  esfuerzo: Esfuerzo;
  estado: EstadoAccion;
  esSimulada: boolean;
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
  diagnostico: Diagnostico;
  respuestas: Respuesta[];
  resultados: Resultado[];
  acciones: Accion[];
  actividad: Actividad[];
  preferencias: Preferencias;
}
