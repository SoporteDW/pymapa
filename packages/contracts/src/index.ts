/**
 * @pymapa/contracts
 *
 * Contratos compartidos de la arquitectura productiva de Pymapa.
 *
 * REGLAS DE ESTE PAQUETE (M1-A):
 * - Solo tipos, DTOs y comandos puros (datos + anotaciones).
 * - PROHIBIDO: lógica diagnóstica, Knowledge Rules, scoring,
 *   cálculo de sufficiency/confidence/priority, findings o acceso a datos.
 * - Nada de este paquete reemplaza aún el motor actual (src/lib/motor).
 *   Es una frontera de contratos para la transición incremental.
 */

/* ------------------------------------------------------------------ */
/* Catálogo de capacidades                                             */
/* ------------------------------------------------------------------ */

/**
 * Ítem del catálogo gobernado de capacidades.
 * El contenido del catálogo vive en knowledge/catalog/*.json y es
 * gobernado por proceso editorial; aquí solo se define su forma.
 */
export interface CapabilityCatalogItem {
  /** Identificador estable, p. ej. "OP-01". */
  id: string;
  /** Dominio al que pertenece (p. ej. "OP"). */
  domainId: string;
  /** Nombre oficial de la capacidad. */
  name: string;
  /** Descripción editorial aprobada. Puede estar vacía si aún no se aprueba contenido. */
  description: string;
  /** Versión del contenido del ítem. */
  version: string;
  /** Estado editorial: solo "published" es usable por el producto. */
  status: "draft" | "review" | "published" | "deprecated";
}

/* ------------------------------------------------------------------ */
/* Knowledge Packs                                                     */
/* ------------------------------------------------------------------ */

/**
 * Ciclo de vida de un Knowledge Pack (instrumentos, reglas y contenido
 * de conocimiento asociados a una capacidad).
 */
export type KnowledgePackStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "deprecated";

/**
 * Vía de adquisición de una capacidad dentro de la plataforma.
 */
export type AcquisitionType =
  /** La empresa la ejecuta por sí misma con la Ficha de Actividad. */
  | "autogestion"
  /** Requiere acompañamiento/apoyo externo (asesor, aliado). */
  | "acompanamiento"
  /** Se adquiere como servicio/producto de un tercero. */
  | "tercerizado";

/**
 * DTO de la próxima adquisición recomendada para una empresa.
 * La decisión de QUÉ recomendar nunca se toma en el frontend:
 * este DTO solo transporta una recomendación ya producida por el servidor.
 */
export interface NextAcquisitionDTO {
  capabilityId: string;
  acquisitionType: AcquisitionType;
  /** Razón editorial ya calculada (texto para mostrar, no regla). */
  rationale: string;
  /** Prioridad ya asignada por el servidor. El frontend nunca la calcula. */
  priority: number;
}

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

/**
 * Estado serializable de una evaluación (diagnóstico) de una empresa.
 * Es solo la vista de estado; ningún campo se calcula en el frontend.
 */
export interface AssessmentStateDTO {
  assessmentId: string;
  companyId: string;
  /** Capacidad actualmente en evaluación, si aplica. */
  activeCapabilityId: string | null;
  /** IDs de respuestas ya registradas (referencias, no respuestas crudas). */
  answeredItemIds: string[];
  /** Total de ítems del instrumento vigente. */
  totalItems: number;
  /** Estado del ciclo de vida de la evaluación. */
  status: "not_started" | "in_progress" | "completed" | "abandoned";
  /** Marca temporal ISO 8601 de la última actualización. */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Comandos                                                            */
/* ------------------------------------------------------------------ */

/**
 * Estados de conocimiento aprobados por el Knowledge Master.
 * UNKNOWN es información explícita: nunca equivale a ausencia, falla ni a una
 * respuesta negativa, y nunca se convierte automáticamente en conclusión adversa.
 */
export type KnowledgeState = "KNOWN" | "UNKNOWN" | "NOT_APPLICABLE" | "CONTRADICTORY";

/**
 * Adquisición (pregunta) servida por el Knowledge Pack a través del
 * application boundary. El frontend nunca la construye ni la deduce.
 */
export interface AcquisitionQuestionDTO {
  acquisitionId: string;
  capabilityId: string;
  /** Nivel de adquisición del patrón aprobado (P1..P5). */
  level: string;
  informationNeedRef: string | null;
  variableRefs: string[];
  question: string;
  purpose: string | null;
  allowedKnowledgeStates: KnowledgeState[];
  /** Estados semánticos aprobados de la variable, si el Master los enumera. */
  allowedSemanticValues: string[] | null;
  /** Marca de gobierno cuando no existe conjunto de opciones aprobado. */
  optionSetStatus: string | null;
}

/**
 * Comando para enviar una respuesta individual de un instrumento.
 */
export interface SubmitResponseCommand {
  assessmentId: string;
  capabilityId: string;
  itemId: string;
  /** Valor de la respuesta según el tipo de ítem (opaco para el frontend). */
  value: string | number | boolean | string[];
  /** Marca temporal ISO 8601 del envío. */
  submittedAt: string;
  /** Estado de conocimiento declarado por la persona (vertical productivo). */
  knowledgeState?: KnowledgeState;
  /** Razón contextual, obligatoria cuando el estado es NOT_APPLICABLE. */
  notApplicableReason?: string | null;
  /** Fuentes en conflicto, obligatorias cuando el estado es CONTRADICTORY. */
  conflictingObservationIds?: string[];
}

/**
 * Resultado de procesar un SubmitResponseCommand.
 * Ningún campo es calculado por el frontend; viene del servidor.
 */
export interface SubmitResponseResult {
  /** Si la respuesta fue aceptada y persistida. */
  accepted: boolean;
  /** Estado actualizado de la evaluación tras procesar el comando. */
  assessment: AssessmentStateDTO;
  /** Hallazgos producidos por el servidor, si aplica (vacío si no aplica). */
  findingIds: string[];
  /** Motivo de rechazo, cuando accepted === false. */
  rejectionReason?: string;
}
