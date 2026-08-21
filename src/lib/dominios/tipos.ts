/**
 * B1 · Contratos de dominio de Pymapa.
 *
 * Declara la cadena conceptual completa del Journey Funcional Maestro:
 *
 *   Empresa → Dominio → Pregunta → Respuesta → Evidencia → Variable →
 *   Interpretación → Hallazgo → Recomendación → Actividad → Instrumento →
 *   Entregable → Validación → Seguimiento
 *
 * No todos los eslabones están funcionalmente implementados en esta entrega:
 * los que faltan quedan declarados para que las macroentregas siguientes
 * (B4–B9) puedan incorporarlos sin reconstruir modelo ni interfaz.
 *
 * Separación de capas obligatoria (no se mezclan en un mismo módulo):
 *   experiencia (UI) ≠ conocimiento (KB) ≠ datos de empresa ≠ ejecución.
 */

/** Eslabones de la cadena de conocimiento. */
export type EntidadCadena =
  | "empresa"
  | "dominio"
  | "pregunta"
  | "respuesta"
  | "evidencia"
  | "variable"
  | "interpretacion"
  | "hallazgo"
  | "recomendacion"
  | "actividad"
  | "instrumento"
  | "entregable"
  | "validacion"
  | "seguimiento";

/** Orden canónico de la cadena; sirve para validar relaciones y trazabilidad. */
export const CADENA_CONOCIMIENTO: EntidadCadena[] = [
  "empresa",
  "dominio",
  "pregunta",
  "respuesta",
  "evidencia",
  "variable",
  "interpretacion",
  "hallazgo",
  "recomendacion",
  "actividad",
  "instrumento",
  "entregable",
  "validacion",
  "seguimiento",
];

/** Capas de la arquitectura. Un módulo pertenece a una sola capa. */
export type CapaArquitectura = "experiencia" | "conocimiento" | "empresa" | "ejecucion";

/** Referencia estable a cualquier eslabón de la cadena. */
export interface ReferenciaCadena {
  entidad: EntidadCadena;
  id: string;
}

/** Relación explícita entre dos eslabones (trazabilidad bidireccional). */
export interface VinculoCadena {
  desde: ReferenciaCadena;
  hacia: ReferenciaCadena;
  /** Descripción legible de la relación ("sustenta", "origina", "valida"). */
  relacion: string;
}

/**
 * Dominio del diagnóstico general. Los seis dominios existentes (D01..D06)
 * no se renombran ni se reordenan: este contrato los describe, no los sustituye.
 */
export interface DominioPymapa {
  id: string;
  nombre: string;
  proposito: string;
  /** Peso del modelo de cálculo preliminar vigente (POC-03). */
  peso: number;
}

/** Nivel del instrumento: 1 = diagnóstico general, 2 = especializado. */
export type NivelInstrumento = 1 | 2;

export type EstadoInstrumento = "activo" | "experimental" | "pendiente";

/**
 * Registro de un instrumento metodológico. Permite incorporar más adelante
 * activos como el checklist de 304 verificaciones CRO/UX sin tocar la UI:
 * basta registrar el instrumento con sus grupos y su fuente.
 */
export interface InstrumentoDefinicion {
  id: string;
  nombre: string;
  version: string;
  nivel: NivelInstrumento;
  estado: EstadoInstrumento;
  /** Dominios del diagnóstico general con los que se relaciona. */
  dominios: string[];
  /** Grupos internos del instrumento y cantidad esperada de verificaciones. */
  grupos: { id: string; nombre: string; verificacionesEsperadas: number | null }[];
  /** Origen metodológico del contenido (pack, checklist, documento). */
  fuente: string;
  /** Capa a la que pertenece el contenido del instrumento. */
  capa: Extract<CapaArquitectura, "conocimiento">;
}

/** Identificación del cuerpo de conocimiento que produjo una conclusión. */
export interface FuenteConocimiento {
  packId: string;
  version: string;
  estado: "experimental" | "activo";
}

/**
 * Eslabones aún no implementados funcionalmente. Se declaran para fijar la
 * forma del dato y evitar rediseños en B4–B9.
 */
export interface EntregablePendiente {
  id: string;
  actividadId: string;
  titulo: string;
  descripcion: string;
  /** Evidencias que lo sustentan (se conectan en macroentregas siguientes). */
  evidenciaIds: string[];
}

export interface ValidacionPendiente {
  id: string;
  entregableId: string;
  criterio: string;
  estado: "pendiente" | "aprobada" | "rechazada";
}

export interface SeguimientoPendiente {
  id: string;
  actividadId: string;
  indicador: string;
  periodicidad: "semanal" | "mensual" | "trimestral";
}
