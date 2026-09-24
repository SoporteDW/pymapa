/**
 * @pymapa/knowledge-engine
 *
 * Runtime GENÉRICO de conocimiento. Interpreta un Knowledge Pack declarativo.
 *
 * REGLAS DURAS:
 * - PROHIBIDO cualquier condicional por capacidad (comparar el id de una
 *   capacidad concreta dentro del runtime).
 *   Todo comportamiento proviene del pack.
 * - No produce scoring numérico, ni maturity, ni priority, ni severidad.
 * - No convierte estados semánticos en números. Los niveles de evidencia
 *   (E0..E3) son estados de requisito, nunca puntajes.
 * - UNKNOWN se preserva: nunca se transforma en ausencia, falla ni respuesta
 *   negativa, y nunca deriva automáticamente en conclusión adversa.
 * - Estados materialmente incompatibles producen CONTRADICTORY con sus fuentes:
 *   nunca se promedian, ni se decide por jerarquía, ni se delega a un LLM.
 * - Las reglas gobernadas cuya clasificación no es DETERMINISTIC no se ejecutan:
 *   se transportan como juicio pendiente con su lineage.
 * - Solo se ejecuta contra código server-side (ver docs/architecture).
 */
import {
  parseKnowledgePack,
  resolveValidationRequirementOwner,
  validateKnowledgePack,
  VALIDATION_CONDITION_KINDS,
  VALIDATION_REQUIREMENT_OWNER_KINDS,
  type KnowledgePack,
  type KnowledgePackAcquisition,
  type KnowledgeState,
  type PropertyResolutionMode,
} from "@pymapa/knowledge-schema";

/** Versión semántica del runtime genérico. Independiente de la versión de cualquier Knowledge Pack. */
export const ENGINE_SEMVER = "0.2.0";
export const ENGINE_VERSION = `pymapa-knowledge-engine/${ENGINE_SEMVER}`;

/**
 * Historial de semántica genérica del runtime. Cada versión describe cambios de
 * interpretación aplicables a CUALQUIER pack; ninguna entrada es específica de
 * una capacidad. Los EvaluationRuns persistidos conservan la versión con la que
 * se produjeron: nunca se reetiquetan ni se recalculan.
 */
export const ENGINE_SEMANTIC_HISTORY: readonly {
  version: string;
  changes: readonly { id: string; semantic: string; statement: string }[];
}[] = [
  {
    version: "0.1.0",
    changes: [
      {
        id: "ENG-0.1-BASE",
        semantic: "BASELINE_RUNTIME",
        statement:
          "Interpretación declarativa de packs: variables, adquisiciones P1–P5, estados de conocimiento, contradicciones, candidatos de finding con lineage, reglas no determinísticas como juicio pendiente, CRV determinísticos por actividad.",
      },
    ],
  },
  {
    version: "0.2.0",
    changes: [
      {
        id: "ENG-0.2-01",
        semantic: "CONTEXTUAL_GOVERNED_PROPERTIES",
        statement:
          "Propiedades gobernadas con modo de resolución FIXED / CONTEXTUAL / NOT_EXPLICIT (severidad, confianza, contextualización, acciones del engine); guardas severidad×confianza declaradas por el pack; estado null cuando la propiedad es contextual.",
      },
      {
        id: "ENG-0.2-02",
        semantic: "INTERVENTION_PATTERN_OWNED_VALIDATION_REQUIREMENTS",
        statement:
          "Requisitos de validación (CRV) con dueño ACTIVITY | INTERVENTION_PATTERN | DELIVERABLE, condiciones GOVERNED_STATEMENT y JUSTIFYING_CONDITION_REFERENCE; un CRV de juicio gobernado solo se satisface por juicio humano con evidencia.",
      },
      {
        id: "ENG-0.2-03",
        semantic: "DONE_IMPLEMENTATION_LIFECYCLE",
        statement:
          "Patrones de intervención, capas de Done, Done Criteria con o sin identificador y estados de ejecución; implementado solo si todas las capas y criterios se cumplen; sin criterios explícitos → DONE_CRITERIA_NOT_EXPLICIT; Done no implica CRV ni efectividad.",
      },
      {
        id: "ENG-0.2-04",
        semantic: "EFFECTIVENESS",
        statement:
          "Estados de efectividad declarados por el pack; sin implementación no hay efectividad; el estado superior exige CRV satisfecho y evidencia; efecto negativo material fuerza el estado negativo declarado.",
      },
      {
        id: "ENG-0.2-05",
        semantic: "ATTRIBUTION",
        statement:
          "Confianza de atribución evaluada de forma independiente de la efectividad; resultado ≠ atribución.",
      },
      {
        id: "ENG-0.2-06",
        semantic: "FOLLOW_UP_REASSESSMENT",
        statement:
          "Follow-up y reassessment señalados como REVIEW_REQUIRED según el pack, sin frecuencia, fórmula, score ni madurez inferidos.",
      },
      {
        id: "ENG-0.2-07",
        semantic: "UNRESOLVED_FINDING_PROJECTION",
        statement:
          "Proyección findingsAwaitingResolution con estados no resueltos, observaciones, evidencias y requisito de adquisición/aclaración derivado solo de referencias declaradas por el pack.",
      },
      {
        id: "ENG-0.2-08",
        semantic: "UNKNOWN_NOT_APPLICABLE_CONTRADICTORY_CORRECTION",
        statement:
          "Corrección genérica: solo KNOWN aporta soporte a un candidato de finding; UNKNOWN → AWAITING_INFORMATION, todo NOT_APPLICABLE → EXCLUDED_NOT_APPLICABLE, alguna CONTRADICTORY → BLOCKED_BY_CONTRADICTION. En 0.1.0 cualquier observación vinculada creaba candidato.",
      },
    ],
  },
];

export type { KnowledgePack, KnowledgeState, PropertyResolutionMode };
export { validateKnowledgePack, parseKnowledgePack };

/* ------------------------------------------------------------------ */
/* Entradas                                                            */
/* ------------------------------------------------------------------ */

/** Observación aceptada para evaluación (estructurada, ya no es la Response). */
export interface EngineObservation {
  id: string;
  variableRef: string;
  acquisitionRef: string;
  knowledgeState: KnowledgeState;
  /** Valor semántico aprobado; null cuando el estado no lo aporta (p. ej. UNKNOWN). */
  semanticValue: string | null;
  /** Response de origen, cuando existe. Response ≠ Observation. */
  sourceResponseId: string | null;
  /** Fuente humana que la originó. Response ≠ Evidence ≠ Observation. */
  respondentId?: string | null;
  /** Evidencias que la soportan. Una evidencia puede soportar varias. */
  evidenceIds?: string[];
  /** Requerido por el Knowledge Master cuando el estado es NOT_APPLICABLE. */
  notApplicableReason?: string | null;
  /** Requerido cuando el estado es CONTRADICTORY: fuentes/observaciones en conflicto. */
  conflictingObservationIds?: string[];
  recordedAt: string;
}

/** Bookkeeping del runtime sobre una Information Need (no es semántica del Master). */
export type InformationNeedRuntimeState =
  | "PENDING"
  | "PARTIAL"
  | "COLLECTED"
  | "AWAITING_CLARIFICATION"
  | "NOT_MAPPED";

export interface VariableEvaluationResult {
  variableRef: string;
  state: KnowledgeState;
  semanticValue: string | null;
  detail: {
    criticality: string;
    /** FIXED / CONTEXTUAL / NOT_EXPLICIT: la criticidad contextual nunca se adivina. */
    criticalityResolution: PropertyResolutionMode;
    minimumEvidence: string;
    observationIds: string[];
    /** Lineage explícito: Response ≠ Evidence ≠ Observation ≠ Evaluation. */
    responseIds: string[];
    evidenceIds: string[];
    respondentIds: string[];
    /** Observaciones en conflicto cuando el estado es CONTRADICTORY. */
    conflictingObservationIds: string[];
    classification: "DETERMINISTIC";
    note: string;
  };
}

export interface InformationNeedStateResult {
  needRef: string;
  state: InformationNeedRuntimeState;
  detail: {
    variableRefs: string[];
    /** Variables sin ninguna observación registrada todavía. */
    pendingVariableRefs: string[];
    /** Variables con UNKNOWN registrado explícitamente (dato capturado, no ausencia). */
    explicitUnknownVariableRefs: string[];
    contradictoryVariableRefs: string[];
    mappingStatus: string;
  };
}

export interface PendingJudgment {
  ruleRef: string;
  classification: "GOVERNED_JUDGMENT" | "UNIMPLEMENTED_GAP";
  reason: string;
}

/** Estado de requisito de evidencia. E0..E3 nunca se convierten en números. */
export type EvidenceRequirementResolution = "RESOLVED" | "EVIDENCE_REQUIREMENT_REVIEW_REQUIRED";

export interface EvidenceRequirementResult {
  variableRef: string;
  /** Nivel declarado (E0..E3). Estado de requisito, no puntaje. */
  requiredLevel: string;
  /** Niveles admisibles cuando el requisito es condicional. */
  options: string[] | null;
  resolution: EvidenceRequirementResolution;
  /** FIXED / CONTEXTUAL / NOT_EXPLICIT del requisito declarado. */
  resolutionMode: PropertyResolutionMode;
  provenance: {
    knowledgePackId: string;
    knowledgePackVersion: string;
    note: string;
    escalationFactors: string[];
    escalationFormula: string;
  };
}

export interface ContradictionResult {
  variableRef: string;
  conflictingObservationIds: string[];
  conflictingSemanticValues: string[];
  /** Fuentes humanas distintas implicadas, cuando se conocen. */
  sourceRespondentIds: string[];
  /** Adquisiciones de aclaración declaradas por el pack. */
  clarificationAcquisitionRefs: string[];
  /** Candidatos de evidencia admisibles declarados por el pack. */
  evidenceCandidateRefs: string[];
  note: string;
}

/* ------------------------------------------------------------------ */
/* Findings (M1-HIJ)                                                   */
/* ------------------------------------------------------------------ */

/** Ciclo de vida del finding. El engine solo produce CANDIDATE/NEEDS_REVIEW. */
export type FindingLifecycleState =
  | "CANDIDATE"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "SUPERSEDED"
  | "DISMISSED";

export interface FindingCandidateResult {
  findingRef: string;
  name: string;
  polarity: "ADVERSE" | "STRENGTH";
  /** Estado inicial gobernado. Un juicio gobernado nunca se confirma solo. */
  lifecycleState: Extract<FindingLifecycleState, "CANDIDATE" | "NEEDS_REVIEW">;
  /** true solo si TODAS sus reglas son DETERMINISTIC e implementadas. */
  deterministicallyConfirmable: boolean;
  /** Severidad cualitativa cuando el material la soporta; nunca numérica. */
  severity: {
    state: string | null;
    reason: string;
    /** FIXED / CONTEXTUAL / NOT_EXPLICIT. CONTEXTUAL exige juicio gobernado. */
    resolution: PropertyResolutionMode;
    admissibleLevels: string[];
  };
  /** Confianza del candidato: nunca calculada; niveles admisibles si existen. */
  confidence: {
    state: null;
    resolution: PropertyResolutionMode;
    admissibleLevels: string[];
    reason: string;
  };
  ruleRefs: string[];
  variableRefs: string[];
  /** Estado de cada variable involucrada (solo KNOWN aporta soporte). */
  variableStates: { variableRef: string; state: KnowledgeState | "NOT_OBSERVED" }[];
  /** Lineage: observaciones y evidencias que lo sostienen. */
  supportingObservationIds: string[];
  supportingEvidenceIds: string[];
  reason: string;
}

/**
 * Finding cuya evidencia existe pero ninguna variable involucrada es KNOWN.
 * UNKNOWN, NOT_APPLICABLE y CONTRADICTORY no son soporte adverso: el finding
 * queda a la espera de información, excluido por aplicabilidad o bloqueado
 * por contradicción (aclaración), jamás como candidato.
 */
export type FindingResolutionRequirement =
  /** UNKNOWN: falta información; se re-adquiere por las adquisiciones del pack. */
  | "INFORMATION_REQUIRED"
  /** CONTRADICTORY: se aclara por las adquisiciones de aclaración del pack. */
  | "CLARIFICATION_REQUIRED"
  /** NOT_APPLICABLE en todas las variables: excluido por aplicabilidad. */
  | "NONE_EXCLUDED_BY_APPLICABILITY";

/**
 * Finding que NO puede sostenerse todavía (M2 runtime closure; persistido por run).
 * Nunca es un finding confirmado ni una conclusión adversa.
 */
export interface FindingAwaitingResolutionResult {
  findingRef: string;
  status: "AWAITING_INFORMATION" | "EXCLUDED_NOT_APPLICABLE" | "BLOCKED_BY_CONTRADICTION";
  variableStates: { variableRef: string; state: KnowledgeState | "NOT_OBSERVED" }[];
  /** Estados no resueltos presentes (UNKNOWN / NOT_APPLICABLE / CONTRADICTORY). */
  unresolvedStates: Exclude<KnowledgeState, "KNOWN">[];
  observationIds: string[];
  evidenceIds: string[];
  /** Qué hace falta para resolverlo y por qué adquisiciones declaradas. */
  resolution: { requirement: FindingResolutionRequirement; acquisitionRefs: string[] };
  reason: string;
}

/** Referencia a otra capacidad. Nunca ejecuta la capacidad destino. */
export interface DerivedDependencyReferenceResult {
  cause: string;
  sourceCapabilityId: string;
  targetCapabilityId: string | null;
  targetDomainId: string | null;
  executable: false;
  note: string;
}

/** Identidad gobernada de recomendación. El contenido puede no ser explícito. */
export interface RecommendationCandidateResult {
  recommendationRef: string;
  title: string | null;
  contentStatus: string;
  mappingStatus: string;
  findingRefs: string[];
  /** false cuando el mapeo Finding→Recommendation no está gobernado. */
  automatable: boolean;
  reason: string;
}

export interface EvaluationTraceability {
  knowledgeMasterIdentifier: string;
  knowledgeMasterVersion: string;
  knowledgePackId: string;
  knowledgePackVersion: string;
  engineVersion: string;
  /** KnowledgeVersion fijada al Assessment; el engine nunca la elige. */
  knowledgeVersionId: string;
  capabilityId: string;
  observationIds: string[];
  ruleRefsConsidered: string[];
}

export interface EvaluationResult {
  variableEvaluations: VariableEvaluationResult[];
  informationNeedStates: InformationNeedStateResult[];
  /** Reglas gobernadas no resueltas determinísticamente en esta etapa. */
  pendingJudgments: PendingJudgment[];
  /** Requisitos de evidencia por variable (E0..E3 como estados). */
  evidenceRequirements: EvidenceRequirementResult[];
  /** Conflictos materiales entre fuentes, con sus referencias. */
  contradictions: ContradictionResult[];
  /** Adquisiciones ya respondidas (derivadas de las observaciones). */
  answeredAcquisitionRefs: string[];
  /** true cuando el resultado requiere revisión gobernada, no inferencia. */
  needsReview: boolean;
  /** Findings CONFIRMADOS por el runtime: siempre vacío, no hay regla determinística. */
  findings: never[];
  /** Candidatos de finding con su lineage; nunca confirmados automáticamente. */
  findingCandidates: FindingCandidateResult[];
  /** Findings con observaciones pero sin soporte KNOWN (UNKNOWN/NA/CONTRADICTORY). */
  findingsAwaitingResolution: FindingAwaitingResolutionResult[];
  /** Referencias a otras capacidades. Nunca ejecutan la capacidad destino. */
  derivedDependencyReferences: DerivedDependencyReferenceResult[];
  /** Sufficiency/Confidence no tienen fórmula aprobada. */
  sufficiency: { state: null; reason: string };
  confidence: {
    state: null;
    reason: string;
    resolution: PropertyResolutionMode;
    admissibleLevels: string[];
    factors: string[];
  };
  /** Contextualización: reglas gobernadas, nunca aplicadas automáticamente. */
  contextualization: { resolution: PropertyResolutionMode; ruleRefs: string[]; reason: string };
  traceability: EvaluationTraceability;
}

export interface NextAcquisition {
  acquisitionId: string;
  capabilityId: string;
  level: string;
  informationNeedRef: string | null;
  variableRefs: string[];
  question: string;
  purpose: string | null;
  allowedKnowledgeStates: KnowledgeState[];
  /** Valores semánticos aprobados para la variable de la adquisición, si existen. */
  allowedSemanticValues: string[] | null;
  optionSetStatus: string | null;
  /** Transcripción del trigger que la habilita, si el pack lo declara. */
  triggerStatement: string | null;
}

const NO_FORMULA =
  "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER: no existe fórmula aprobada; el runtime no la infiere.";

const NO_EVIDENCE_FORMULA =
  "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER: requisito condicional sin fórmula aprobada; queda para revisión gobernada.";

const LEVEL_ORDER = ["P1", "P2", "P3", "P4", "P5"];
/** Marca de silencio de la fuente para nivel/pregunta no declarados. */
const NOT_EXPLICIT_LEVEL = "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER";

/** Nivel declarado por el pack para adquisiciones de aclaración. */
const CLARIFICATION_LEVEL = "P4";

const ANY_VARIABLE = "*";

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

export interface KnowledgeEngine {
  readonly pack: KnowledgePack;
  readonly engineVersion: string;
  /** Adquisiciones disponibles en el pack (declarativas). */
  listAcquisitions(): KnowledgePackAcquisition[];
  getAcquisition(acquisitionId: string): KnowledgePackAcquisition | null;
  /** Valida que una observación sea admisible según el pack. */
  validateObservation(observation: EngineObservation): { ok: true } | { ok: false; reason: string };
  evaluate(input: { observations: EngineObservation[]; knowledgeVersionId: string }): EvaluationResult;
  /** Siguiente adquisición adaptativa, decidida por el pack y el estado actual. */
  getNextAcquisition(evaluation: EvaluationResult): NextAcquisition | null;
  /** Todas las adquisiciones habilitadas por el estado actual, en orden de nivel. */
  getEligibleAcquisitions(evaluation: EvaluationResult): NextAcquisition[];
  /** Adquisiciones de aclaración habilitadas por una contradicción. */
  getClarificationCandidates(evaluation: EvaluationResult): NextAcquisition[];
  /**
   * Identidades de recomendación gobernadas. No genera recomendaciones a partir
   * de un finding cuando el mapeo Finding→Recommendation no está gobernado.
   */
  getRecommendationCandidates(findingRef?: string): RecommendationCandidateResult[];
  /** Principio Minimum Sufficient Intervention (principio, nunca fórmula). */
  getInterventionPrinciple(): {
    id: string;
    statement: string;
    formula: string;
    ruleRefs: string[];
    automatable: boolean;
  } | null;
  /** Identidades de actividad gobernadas (A01–A09), sin mapeo automático. */
  listActivityIdentities(): { activityRef: string; title: string | null; contentStatus: string; mappingStatus: string }[];
  /** CRV explícitamente aprobados. Nunca se inventan para otras actividades. */
  listValidationRequirements(): ValidationRequirementIdentity[];
  getValidationRequirementForActivity(activityRef: string | null): ValidationRequirementIdentity | null;
  /** Evalúa las condiciones conjuntas del CRV. No produce puntaje alguno. */
  evaluateValidationRequirement(
    requirementRef: string,
    input: { primaryExecutorRespondentId: string | null; cases: ValidationCaseInput[] },
  ): ValidationRequirementEvaluation;
  /** CRV de un dueño gobernado (Activity, patrón o deliverable). */
  getValidationRequirementsForOwner(kind: ValidationRequirementOwnerKind, ref: string): ValidationRequirementIdentity[];
  /** Admisibilidad de un juicio humano sobre un CRV. Nunca decide por sí mismo. */
  assessValidationRequirementJudgment(
    requirementRef: string,
    input: ValidationRequirementJudgmentInput,
  ): ValidationRequirementJudgmentAssessment;
  listInterventionPatterns(): InterventionPatternIdentity[];
  /** Done: capas + criterios del patrón → estado de ejecución. Done ≠ efectividad. */
  evaluateImplementation(patternRef: string, input: ImplementationInput): ImplementationEvaluation;
  /** Efectividad, atribución, decisión, follow-up y reassessment (sin scoring). */
  assessValidation(input: ValidationAssessmentInput): ValidationAssessment;
  /** Guardas severidad × confianza antes de consolidar un finding. */
  assessFindingConsolidation(findingRef: string, input: FindingConsolidationInput): FindingConsolidationAssessment;
  listEngineActions(): { id: string; meaning: string }[];
  /** Comparación Baseline vs Reassessment: cambios de estado, nunca mejora. */
  compareVariableStates(
    baseline: { variableRef: string; state: string }[],
    current: { variableRef: string; state: string }[],
  ): StateComparison[];
}

export interface ValidationRequirementCondition {
  id: string;
  kind: (typeof VALIDATION_CONDITION_KINDS)[number];
  statement: string;
  requiredCount: number | null;
}

export type ValidationRequirementOwnerKind = (typeof VALIDATION_REQUIREMENT_OWNER_KINDS)[number];

export interface ValidationRequirementIdentity {
  requirementRef: string;
  /** Activity dueña (retrocompatible). null cuando el dueño no es una Activity. */
  activityRef: string | null;
  /** Dueño gobernado: Activity, patrón de intervención o deliverable. */
  owner: { kind: ValidationRequirementOwnerKind; ref: string };
  name: string | null;
  definition: string;
  definitionSource: string;
  evaluation: "DETERMINISTIC_CONDITIONS" | "GOVERNED_JUDGMENT";
  conditions: ValidationRequirementCondition[];
  requiredCaseCount: number | null;
  /** Invariante: un CRV no es un KPI ni un maturity score. */
  isScore: false;
}

export interface ValidationCaseInput {
  sequenceIndex: number;
  executorRespondentId: string;
  outcome: "CORRECT" | "INCORRECT";
  criticalAssistance: boolean;
}

export interface ValidationRequirementEvaluation {
  requirementRef: string;
  satisfied: boolean;
  /** REVIEW_REQUIRED: CRV de juicio gobernado; el runtime nunca lo satisface solo. */
  status: "SATISFIED" | "NOT_SATISFIED" | "IN_PROGRESS" | "REVIEW_REQUIRED";
  metConditionIds: string[];
  unmetConditionIds: string[];
  reason: string;
  consecutiveCorrectCount: number;
  requiredCaseCount: number | null;
  secondExecutorRespondentId: string | null;
}

/* ------------------------------------------------------------------ */
/* M2 runtime closure · Ciclo de vida genérico de intervención                  */
/* ------------------------------------------------------------------ */

/** Juicio humano registrado sobre un CRV de juicio gobernado. */
export interface ValidationRequirementJudgmentInput {
  judgment: "SATISFIED" | "NOT_SATISFIED" | "INSUFFICIENT_EVIDENCE";
  judgedBy: string | null;
  evidenceIds: string[];
  /** Findings/condiciones que justificaron la intervención. */
  justifyingFindingRefs?: string[];
  /** KPIs citados: nunca sustituyen evidencia (CRV ≠ KPI). */
  kpiRefs?: string[];
}

export interface ValidationRequirementJudgmentAssessment {
  requirementRef: string;
  admissible: boolean;
  /** Juicio aceptado; null si no es admisible. Nunca un puntaje. */
  status: "SATISFIED" | "NOT_SATISFIED" | "INSUFFICIENT_EVIDENCE" | null;
  metConditionIds: string[];
  unmetConditionIds: string[];
  issues: string[];
  isScore: false;
}

export interface InterventionPatternIdentity {
  patternRef: string;
  name: string;
  objective: string | null;
  purpose: string | null;
  instruments: { id: string; name: string }[];
  deliverables: { id: string; name: string; instrumentRef: string | null }[];
  minimumActivities: string[];
  /** Done Criteria direccionados por posición (1..n); id null si la fuente no lo da. */
  doneCriteria: { position: number; id: string | null; statement: string }[];
  validationRequirementRefs: string[];
}

export interface ImplementationInput {
  layerRecords: { layerRef: string; completed: boolean; evidenceIds?: string[] }[];
  doneCriteriaRecords: { position: number; met: boolean; evidenceIds?: string[] }[];
  /** Estado declarado por una persona; el runtime lo contrasta, no lo inventa. */
  assertedExecutionStateRef?: string | null;
}

export interface ImplementationEvaluation {
  patternRef: string;
  /** Estado implementado solo si se cumplen TODOS sus requisitos declarados. */
  executionStateRef: string | null;
  implemented: boolean;
  stateSelection: "DETERMINISTIC" | "GOVERNED_JUDGMENT";
  candidateExecutionStateRefs: string[];
  completedLayerRefs: string[];
  missingLayerRefs: string[];
  layersMissingEvidence: string[];
  unmetDoneCriteriaPositions: number[];
  issues: string[];
  /** Invariantes: Done ≠ CRV ≠ Validation ≠ efectividad. */
  validationRequirementSatisfied: null;
  effectivenessStateRef: null;
  reason: string;
}

export interface ValidationAssessmentInput {
  requirementRef: string;
  implementationStateRef: string | null;
  effectivenessStateRef: string;
  /** Resultado del juicio del CRV (assessValidationRequirementJudgment). */
  validationRequirementStatus: "SATISFIED" | "NOT_SATISFIED" | "INSUFFICIENT_EVIDENCE" | null;
  attributionConfidenceRef: string | null;
  unintendedNegativeOutcome: boolean;
  evidenceIds: string[];
  validatedBy: string | null;
  kpiRefs?: string[];
}

export interface ValidationAssessment {
  requirementRef: string;
  admissible: boolean;
  issues: string[];
  effectivenessStateRef: string;
  /** Nunca derivada de la efectividad: resultado observado ≠ atribución. */
  attributionConfidenceRef: string | null;
  decisions: { decision: string; action: string | null; selection: "DETERMINISTIC" | "GOVERNED_JUDGMENT" }[];
  followUp: {
    triggered: boolean;
    ruleRefs: (string | null)[];
    status: "NOT_TRIGGERED" | "REQUIRED" | "REVIEW_REQUIRED";
    frequencyFormula: string;
  };
  reassessment: {
    triggered: boolean;
    status: "NOT_TRIGGERED" | "REQUIRED" | "REVIEW_REQUIRED";
    loop: string | null;
    createsNewAssessment: true;
    distinctFromFollowUp: true;
  };
  isMaturity: false;
  isScore: false;
}

export interface FindingConsolidationInput {
  severityRef: string | null;
  confidenceRef: string | null;
  claim: "CAUSAL" | "NON_CAUSAL";
  judgedBy: string | null;
}

export interface FindingConsolidationAssessment {
  findingRef: string;
  status: "ADMISSIBLE" | "BLOCKED" | "INVALID_INPUT";
  blockedByGuardIds: string[];
  requiredActions: string[];
  issues: string[];
}

export type StateTransition =
  | "UNCHANGED"
  | "MORE_INFORMATION"
  | "LESS_INFORMATION"
  | "CONTRADICTION_RESOLVED"
  | "CONTRADICTION_INTRODUCED"
  | "CHANGED"
  | "NEW"
  | "REMOVED";

export interface StateComparison {
  variableRef: string;
  baselineState: string | null;
  currentState: string | null;
  transition: StateTransition;
  /** Siempre null: no existe algoritmo aprobado de mejora empresarial. */
  improvement: null;
  interpretation: string;
}

interface EstadoVariable {
  state: KnowledgeState;
  semanticValue: string | null;
  observed: boolean;
}

export function createKnowledgeEngine(rawPack: unknown): KnowledgeEngine {
  const pack = parseKnowledgePack(rawPack);
  const variableById = new Map(pack.variables.map((v) => [v.id, v]));
  const acquisitionById = new Map(pack.acquisitions.map((a) => [a.id, a]));
  const severityLevelIds = (pack.severity?.levels ?? []).map((l) => l.id);
  const confidenceLevelIds = (pack.confidence?.levels ?? []).map((l) => l.id);

  /** Severidad del candidato: FIXED solo si la fuente la fija; CONTEXTUAL nunca se adivina. */
  function severidadCandidato(declarada: string | undefined): FindingCandidateResult["severity"] {
    const explicita = declarada && !declarada.startsWith("NOT_EXPLICIT") ? declarada : null;
    if (explicita && (severityLevelIds.length === 0 || severityLevelIds.includes(explicita))) {
      return {
        state: explicita,
        reason: "severidad fijada por el Knowledge Master",
        resolution: "FIXED",
        admissibleLevels: severityLevelIds.slice(),
      };
    }
    if (pack.severity?.resolution === "CONTEXTUAL") {
      return {
        state: null,
        reason:
          "CONTEXTUAL: la severidad depende del caso; requiere juicio gobernado registrado (ni el runtime ni un LLM la asignan).",
        resolution: "CONTEXTUAL",
        admissibleLevels: severityLevelIds.slice(),
      };
    }
    return {
      state: null,
      reason:
        "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER: no existe algoritmo de severidad ni de priority; la severidad no se infiere.",
      resolution: "NOT_EXPLICIT",
      admissibleLevels: severityLevelIds.slice(),
    };
  }

  function confianzaCandidato(): FindingCandidateResult["confidence"] {
    const resolution = pack.confidence?.resolution ?? "NOT_EXPLICIT";
    return {
      state: null,
      resolution,
      admissibleLevels: confidenceLevelIds.slice(),
      reason:
        resolution === "CONTEXTUAL"
          ? "CONTEXTUAL: la confianza se asigna por juicio gobernado con los factores declarados; no se calcula."
          : NO_FORMULA,
    };
  }

  function semanticValuesFor(acq: KnowledgePackAcquisition): string[] | null {
    const ref = acq.responseModel.semanticValuesFromVariable;
    if (!ref) return null;
    return variableById.get(ref)?.semanticStates ?? null;
  }

  function evaluateVariable(
    variableRef: string,
    observations: EngineObservation[],
  ): VariableEvaluationResult {
    const variable = variableById.get(variableRef);
    const own = observations
      .filter((o) => o.variableRef === variableRef)
      .slice()
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const ids = own.map((o) => o.id);
    const base = {
      criticality: variable?.criticality ?? "UNKNOWN_VARIABLE",
      criticalityResolution: resolucionCriticidad(variable?.criticality),
      minimumEvidence: variable?.minimumEvidence ?? "UNKNOWN_VARIABLE",
      observationIds: ids,
      responseIds: own.map((o) => o.sourceResponseId).filter((x): x is string => Boolean(x)),
      evidenceIds: [...new Set(own.flatMap((o) => o.evidenceIds ?? []))],
      respondentIds: [
        ...new Set(own.map((o) => o.respondentId).filter((x): x is string => Boolean(x))),
      ],
      conflictingObservationIds: [] as string[],
      classification: "DETERMINISTIC" as const,
    };

    if (own.length === 0) {
      return {
        variableRef,
        state: "UNKNOWN",
        semanticValue: null,
        detail: {
          ...base,
          note: "sin observación registrada; ausencia de dato, no conclusión adversa",
        },
      };
    }

    const declaradas = own.filter((o) => o.knowledgeState === "CONTRADICTORY");
    const conocidas = own.filter((o) => o.knowledgeState === "KNOWN" && o.semanticValue);
    const valores = new Set(conocidas.map((o) => o.semanticValue as string));

    if (declaradas.length > 0 || valores.size > 1) {
      const enConflicto = [
        ...new Set([
          ...declaradas.flatMap((o) => [o.id, ...(o.conflictingObservationIds ?? [])]),
          ...(valores.size > 1 ? conocidas.map((o) => o.id) : []),
        ]),
      ];
      return {
        variableRef,
        state: "CONTRADICTORY",
        semanticValue: null,
        detail: {
          ...base,
          conflictingObservationIds: enConflicto,
          note: "estados en conflicto: no se promedian, ni se resuelven por jerarquía, ni automáticamente",
        },
      };
    }

    const lastKnown = [...own].reverse().find((o) => o.knowledgeState === "KNOWN");
    if (lastKnown) {
      return {
        variableRef,
        state: "KNOWN",
        semanticValue: lastKnown.semanticValue ?? null,
        detail: { ...base, note: "estado semántico preservado tal como fue capturado" },
      };
    }

    const lastUnknown = [...own].reverse().find((o) => o.knowledgeState === "UNKNOWN");
    if (lastUnknown) {
      return {
        variableRef,
        state: "UNKNOWN",
        semanticValue: null,
        detail: {
          ...base,
          note: "UNKNOWN explícito preservado; no equivale a negativo ni a ausencia, y admite otra fuente",
        },
      };
    }

    const lastNa = [...own].reverse().find((o) => o.knowledgeState === "NOT_APPLICABLE");
    return {
      variableRef,
      state: "NOT_APPLICABLE",
      semanticValue: null,
      detail: {
        ...base,
        note: lastNa?.notApplicableReason
          ? `no aplicable · razón: ${lastNa.notApplicableReason}`
          : "no aplicable",
      },
    };
  }

  function estadosPorVariable(evaluation: EvaluationResult): Map<string, EstadoVariable> {
    return new Map(
      evaluation.variableEvaluations.map((v) => [
        v.variableRef,
        {
          state: v.state,
          semanticValue: v.semanticValue,
          observed: v.detail.observationIds.length > 0,
        },
      ]),
    );
  }

  /** Evaluación declarativa del trigger. Genérica: solo estados de variables. */
  function triggerSatisfecho(
    acq: KnowledgePackAcquisition,
    estados: Map<string, EstadoVariable>,
  ): boolean {
    const trigger = acq.trigger;
    if (!trigger) return true;
    if (trigger.classification !== "DETERMINISTIC") return false;
    const conditions = trigger.conditions ?? [];
    if (conditions.length === 0) return false;

    const cumple = (cond: (typeof conditions)[number], estado: EstadoVariable | undefined) => {
      if (!estado) return false;
      if (cond.observed !== undefined && cond.observed !== estado.observed) return false;
      if (cond.states && !cond.states.includes(estado.state)) return false;
      if (cond.semanticValues) {
        if (!estado.semanticValue) return false;
        if (!cond.semanticValues.includes(estado.semanticValue)) return false;
      }
      return true;
    };

    const resultados = conditions.map((cond) =>
      cond.variableRef === ANY_VARIABLE
        ? [...estados.values()].some((estado) => cumple(cond, estado))
        : cumple(cond, estados.get(cond.variableRef)),
    );

    return (trigger.mode ?? "ALL") === "ANY"
      ? resultados.some(Boolean)
      : resultados.every(Boolean);
  }

  function aNextAcquisition(acq: KnowledgePackAcquisition): NextAcquisition {
    return {
      acquisitionId: acq.id,
      capabilityId: pack.capability.id,
      level: acq.level ?? NOT_EXPLICIT_LEVEL,
      informationNeedRef: acq.informationNeedRef ?? null,
      variableRefs: acq.variableRefs.slice(),
      question: acq.question ?? NOT_EXPLICIT_LEVEL,
      purpose: acq.purpose ?? null,
      allowedKnowledgeStates: acq.responseModel.knowledgeStates.slice(),
      allowedSemanticValues: semanticValuesFor(acq),
      optionSetStatus: acq.responseModel.optionSetStatus ?? null,
      triggerStatement: acq.trigger?.statement ?? null,
    };
  }

  function elegibles(evaluation: EvaluationResult): KnowledgePackAcquisition[] {
    const estados = estadosPorVariable(evaluation);
    const respondidas = new Set(evaluation.answeredAcquisitionRefs);
    // Solo se sirven adquisiciones con pregunta literal; los canales por NI
    // (acquisitionMode INFORMATION_NEED) admiten observaciones pero no se preguntan.
    return pack.acquisitions
      .filter((acq) => typeof acq.question === "string")
      .sort((a, b) => LEVEL_ORDER.indexOf(a.level ?? "") - LEVEL_ORDER.indexOf(b.level ?? ""))
      .filter((acq) => !respondidas.has(acq.id))
      .filter((acq) => triggerSatisfecho(acq, estados));
  }

  return {
    pack,
    engineVersion: ENGINE_VERSION,

    listAcquisitions() {
      return pack.acquisitions.slice();
    },

    getAcquisition(acquisitionId) {
      return acquisitionById.get(acquisitionId) ?? null;
    },

    validateObservation(observation) {
      const acq = acquisitionById.get(observation.acquisitionRef);
      if (!acq) return { ok: false, reason: `adquisición no declarada en el pack: ${observation.acquisitionRef}` };
      if (!acq.variableRefs.includes(observation.variableRef)) {
        return { ok: false, reason: `la adquisición no alimenta la variable ${observation.variableRef}` };
      }
      if (!acq.responseModel.knowledgeStates.includes(observation.knowledgeState)) {
        return { ok: false, reason: `estado de conocimiento no admitido: ${observation.knowledgeState}` };
      }
      if (observation.knowledgeState === "NOT_APPLICABLE" && !observation.notApplicableReason) {
        return { ok: false, reason: "NOT_APPLICABLE requiere razón contextual" };
      }
      if (
        observation.knowledgeState === "CONTRADICTORY" &&
        (observation.conflictingObservationIds ?? []).length === 0
      ) {
        return { ok: false, reason: "CONTRADICTORY requiere referencias a las fuentes en conflicto" };
      }
      if (observation.knowledgeState === "KNOWN") {
        const allowed = semanticValuesFor(acq);
        if (!observation.semanticValue) {
          return { ok: false, reason: "KNOWN requiere el valor semántico capturado" };
        }
        if (allowed && !allowed.includes(observation.semanticValue)) {
          return { ok: false, reason: "valor semántico fuera de los estados aprobados de la variable" };
        }
      }
      if (observation.knowledgeState === "UNKNOWN" && observation.semanticValue) {
        return { ok: false, reason: "UNKNOWN no puede portar valor semántico" };
      }
      return { ok: true };
    },

    evaluate({ observations, knowledgeVersionId }) {
      const variableRefs = pack.variables.map((v) => v.id);
      const variableEvaluations = variableRefs.map((ref) => evaluateVariable(ref, observations));
      const stateByVariable = new Map(variableEvaluations.map((v) => [v.variableRef, v.state]));

      // "Sin observación" ≠ UNKNOWN explícito. La distinción gobierna qué falta preguntar.
      const sinObservacion = new Set(
        variableEvaluations.filter((v) => v.detail.observationIds.length === 0).map((v) => v.variableRef),
      );

      const informationNeedStates: InformationNeedStateResult[] = pack.informationNeeds.map((need) => {
        if (need.variableRefs.length === 0) {
          return {
            needRef: need.id,
            state: "NOT_MAPPED",
            detail: {
              variableRefs: [],
              pendingVariableRefs: [],
              explicitUnknownVariableRefs: [],
              contradictoryVariableRefs: [],
              mappingStatus: need.mappingStatus,
            },
          };
        }
        const pending = need.variableRefs.filter((ref) => sinObservacion.has(ref));
        const explicitUnknown = need.variableRefs.filter(
          (ref) => !sinObservacion.has(ref) && stateByVariable.get(ref) === "UNKNOWN",
        );
        const contradictory = need.variableRefs.filter(
          (ref) => stateByVariable.get(ref) === "CONTRADICTORY",
        );

        // UNKNOWN explícito mantiene la necesidad PARCIAL (abierta a delegación,
        // otra fuente o evidencia); nunca la cierra ni la vuelve adversa.
        const state: InformationNeedRuntimeState =
          contradictory.length > 0
            ? "AWAITING_CLARIFICATION"
            : explicitUnknown.length > 0
              ? "PARTIAL"
              : pending.length === 0
                ? "COLLECTED"
                : pending.length < need.variableRefs.length
                  ? "PARTIAL"
                  : "PENDING";

        return {
          needRef: need.id,
          state,
          detail: {
            variableRefs: need.variableRefs.slice(),
            pendingVariableRefs: pending,
            explicitUnknownVariableRefs: explicitUnknown,
            contradictoryVariableRefs: contradictory,
            mappingStatus: need.mappingStatus,
          },
        };
      });

      const rules = pack.rules ?? [];
      const pendingJudgments: PendingJudgment[] = rules
        .filter((r) => r.classification !== "DETERMINISTIC" && !r.implemented)
        .map((r) => ({
          ruleRef: r.id,
          classification: r.classification as PendingJudgment["classification"],
          reason:
            r.classification === "GOVERNED_JUDGMENT"
              ? "juicio gobernado no resoluble determinísticamente en esta etapa; queda pendiente de revisión"
              : "vacío de conocimiento declarado: no se resuelve por inferencia",
        }));

      // Requisitos de evidencia: E0..E3 son estados de requisito. Cuando el
      // material los expresa de forma condicional y no hay fórmula aprobada,
      // el runtime NO inventa el umbral: pide revisión gobernada.
      const escalationFormula = pack.evidence?.escalationFormula ?? "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER";
      const escalationFactors = pack.evidence?.escalationFactors ?? [];
      const evidenceRequirements: EvidenceRequirementResult[] = pack.variables.map((v) => {
        const condicional = Boolean(v.minimumEvidenceConditional);
        const sinFormula = escalationFormula.startsWith("NOT_EXPLICIT");
        // Un nivel mínimo no explícito nunca se resuelve: el runtime no fija umbral.
        const nivelNoExplicito = v.minimumEvidence.startsWith("NOT_EXPLICIT");
        const revision = nivelNoExplicito || (condicional && sinFormula);
        return {
          variableRef: v.id,
          requiredLevel: v.minimumEvidence,
          options: v.minimumEvidenceOptions ? v.minimumEvidenceOptions.slice() : null,
          resolution: revision ? "EVIDENCE_REQUIREMENT_REVIEW_REQUIRED" : "RESOLVED",
          resolutionMode: condicional ? "CONTEXTUAL" : nivelNoExplicito ? "NOT_EXPLICIT" : "FIXED",
          provenance: {
            knowledgePackId: pack.packId,
            knowledgePackVersion: pack.packVersion,
            note: revision ? NO_EVIDENCE_FORMULA : (v.minimumEvidenceNote ?? "requisito declarado"),
            escalationFactors: escalationFactors.slice(),
            escalationFormula,
          },
        };
      });

      const clarificationRefs = (
        pack.contradictionHandling?.clarificationAcquisitionRefs ?? []
      ).filter((ref) => acquisitionById.has(ref));
      const evidenceCandidateRefs = pack.contradictionHandling?.evidenceCandidateRefs ?? [];

      const contradictions: ContradictionResult[] = variableEvaluations
        .filter((v) => v.state === "CONTRADICTORY")
        .map((v) => {
          const own = observations.filter((o) => o.variableRef === v.variableRef);
          return {
            variableRef: v.variableRef,
            conflictingObservationIds: v.detail.conflictingObservationIds.slice(),
            conflictingSemanticValues: [
              ...new Set(
                own
                  .filter((o) => o.knowledgeState === "KNOWN" && o.semanticValue)
                  .map((o) => o.semanticValue as string),
              ),
            ],
            sourceRespondentIds: v.detail.respondentIds.slice(),
            clarificationAcquisitionRefs: clarificationRefs.slice(),
            evidenceCandidateRefs: evidenceCandidateRefs.slice(),
            note: "fuentes materialmente incompatibles: se conserva el conflicto con sus referencias",
          };
        });

      const answeredAcquisitionRefs = [...new Set(observations.map((o) => o.acquisitionRef))];

      // Findings: el pack declara identidad, polaridad, reglas y variables.
      // Ninguna regla de findings es DETERMINISTIC en el material gobernado, de
      // modo que un candidato nunca se confirma por inferencia: NEEDS_REVIEW.
      // Soporte (M2 runtime closure): SOLO una variable KNOWN sostiene un candidato.
      // UNKNOWN no es respuesta negativa, NOT_APPLICABLE excluye por
      // aplicabilidad y CONTRADICTORY exige aclaración: ninguno de los tres
      // establece por sí mismo un finding adverso.
      const ruleById = new Map(rules.map((r) => [r.id, r]));
      const evaluacionPorVariable = new Map(variableEvaluations.map((v) => [v.variableRef, v]));
      const findingCandidates: FindingCandidateResult[] = [];
      const findingsAwaitingResolution: FindingAwaitingResolutionResult[] = [];
      for (const finding of pack.findings ?? []) {
        const ruleRefs = finding.ruleRefs ?? [];
        const variableRefs = finding.variableRefs ?? [];
        const involucradas = variableRefs
          .map((ref) => evaluacionPorVariable.get(ref))
          .filter((v): v is VariableEvaluationResult => Boolean(v));
        const conDato = involucradas.filter((v) => v.detail.observationIds.length > 0);
        if (conDato.length === 0) continue;
        const variableStates = involucradas.map((v) => ({
          variableRef: v.variableRef,
          state: (v.detail.observationIds.length > 0 ? v.state : "NOT_OBSERVED") as
            | KnowledgeState
            | "NOT_OBSERVED",
        }));
        const soporte = conDato.filter((v) => v.state === "KNOWN");
        if (soporte.length === 0) {
          const hayContradiccion = conDato.some((v) => v.state === "CONTRADICTORY");
          const todasNoAplican = conDato.every((v) => v.state === "NOT_APPLICABLE");
          const unresolvedStates = (["UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"] as const).filter((st) =>
            conDato.some((v) => v.state === st),
          );
          const requirement: FindingResolutionRequirement = hayContradiccion
            ? "CLARIFICATION_REQUIRED"
            : todasNoAplican
              ? "NONE_EXCLUDED_BY_APPLICABILITY"
              : "INFORMATION_REQUIRED";
          // Solo referencias declaradas por el pack; nunca se infiere una ruta.
          const variablesPendientes = new Set(
            conDato.filter((v) => v.state === "UNKNOWN").map((v) => v.variableRef),
          );
          const acquisitionRefs =
            requirement === "CLARIFICATION_REQUIRED"
              ? [
                  ...new Set(
                    contradictions
                      .filter((c) => variableRefs.includes(c.variableRef))
                      .flatMap((c) => c.clarificationAcquisitionRefs),
                  ),
                ]
              : requirement === "INFORMATION_REQUIRED"
                ? pack.acquisitions
                    .filter((a) => a.variableRefs.some((ref) => variablesPendientes.has(ref)))
                    .map((a) => a.id)
                : [];
          findingsAwaitingResolution.push({
            findingRef: finding.id,
            status: hayContradiccion
              ? "BLOCKED_BY_CONTRADICTION"
              : todasNoAplican
                ? "EXCLUDED_NOT_APPLICABLE"
                : "AWAITING_INFORMATION",
            variableStates,
            unresolvedStates: [...unresolvedStates],
            observationIds: [...new Set(conDato.flatMap((v) => v.detail.observationIds))],
            evidenceIds: [...new Set(conDato.flatMap((v) => v.detail.evidenceIds))],
            resolution: { requirement, acquisitionRefs },
            reason: hayContradiccion
              ? "contradicción material sin resolver: se aclara antes de cualquier finding; no se promedia ni se decide por jerarquía"
              : todasNoAplican
                ? "variables legítimamente no aplicables: excluidas por aplicabilidad, no constituyen finding"
                : "UNKNOWN registrado: dato capturado, no respuesta negativa; no sostiene un finding",
          });
          continue;
        }
        const reglas = ruleRefs.map((ref) => ruleById.get(ref));
        const confirmable =
          ruleRefs.length > 0 &&
          reglas.every((r) => r?.classification === "DETERMINISTIC" && r.implemented);
        findingCandidates.push({
          findingRef: finding.id,
          name: finding.name,
          polarity: (finding.polarity ?? "ADVERSE") as "ADVERSE" | "STRENGTH",
          lifecycleState: confirmable ? ("CANDIDATE" as const) : ("NEEDS_REVIEW" as const),
          deterministicallyConfirmable: confirmable,
          severity: severidadCandidato(finding.severity),
          confidence: confianzaCandidato(),
          ruleRefs: ruleRefs.slice(),
          variableRefs: variableRefs.slice(),
          variableStates,
          supportingObservationIds: [...new Set(soporte.flatMap((v) => v.detail.observationIds))],
          supportingEvidenceIds: [...new Set(soporte.flatMap((v) => v.detail.evidenceIds))],
          reason: confirmable
            ? "reglas determinísticas implementadas: candidato evaluable"
            : (finding.polarity ?? "ADVERSE") === "STRENGTH"
              ? "fortaleza posible: no existe gate formal de evidencia positiva (KCC-AT04-03); requiere revisión gobernada"
              : "depende de juicio gobernado (GOVERNED_JUDGMENT): no se confirma automáticamente",
        });
      }

      const derivedDependencyReferences: DerivedDependencyReferenceResult[] = (
        pack.crossCapabilityReferences ?? []
      ).map((ref) => ({
        cause: ref.cause,
        sourceCapabilityId: pack.capability.id,
        targetCapabilityId: ref.targetCapabilityId ?? null,
        targetDomainId: ref.targetDomainId ?? null,
        executable: false as const,
        note: ref.targetCapabilityId
          ? "referencia declarativa: no ejecuta la capacidad destino"
          : "dominio declarado sin capacidad específica: no se infiere ninguna",
      }));

      return {
        variableEvaluations,
        informationNeedStates,
        pendingJudgments,
        evidenceRequirements,
        contradictions,
        answeredAcquisitionRefs,
        needsReview:
          pendingJudgments.length > 0 ||
          contradictions.length > 0 ||
          evidenceRequirements.some((e) => e.resolution === "EVIDENCE_REQUIREMENT_REVIEW_REQUIRED"),
        findings: [],
        findingCandidates,
        findingsAwaitingResolution,
        derivedDependencyReferences,
        sufficiency: { state: null, reason: NO_FORMULA },
        confidence: {
          state: null,
          reason: NO_FORMULA,
          resolution: pack.confidence?.resolution ?? "NOT_EXPLICIT",
          admissibleLevels: (pack.confidence?.levels ?? []).map((l) => l.id),
          factors: (pack.confidence?.factors ?? []).slice(),
        },
        contextualization: {
          resolution: pack.contextualization ? "CONTEXTUAL" : "NOT_EXPLICIT",
          ruleRefs: (pack.contextualization?.rules ?? [])
            .map((r) => r.id)
            .filter((id): id is string => id !== null),
          reason: pack.contextualization
            ? "reglas de contextualización gobernadas: modifican la aplicación, nunca se aplican automáticamente"
            : "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER: el pack no declara contextualización",
        },
        traceability: {
          knowledgeMasterIdentifier: pack.knowledgeMaster.identifier,
          knowledgeMasterVersion: pack.knowledgeMaster.version,
          knowledgePackId: pack.packId,
          knowledgePackVersion: pack.packVersion,
          engineVersion: ENGINE_VERSION,
          knowledgeVersionId,
          capabilityId: pack.capability.id,
          observationIds: observations.map((o) => o.id),
          ruleRefsConsidered: rules.map((r) => r.id),
        },
      };
    },

    getEligibleAcquisitions(evaluation) {
      return elegibles(evaluation).map(aNextAcquisition);
    },

    getNextAcquisition(evaluation) {
      // Adaptativo: el pack declara el trigger, el runtime solo lo evalúa.
      // Una adquisición ya respondida no se repregunta, ni siquiera con UNKNOWN.
      const [siguiente] = elegibles(evaluation);
      return siguiente ? aNextAcquisition(siguiente) : null;
    },

    getRecommendationCandidates(findingRef) {
      // Identidades gobernadas R01–R09. El mapeo Finding→Recommendation no está
      // gobernado: nunca se genera una recomendación automáticamente.
      return (pack.recommendations ?? [])
        .filter((rec) => {
          if (!findingRef) return true;
          return (rec.findingRefs ?? []).includes(findingRef);
        })
        .map((rec) => ({
          recommendationRef: rec.id,
          title: rec.title ?? null,
          contentStatus: rec.contentStatus,
          mappingStatus: rec.mappingStatus,
          findingRefs: (rec.findingRefs ?? []).slice(),
          automatable: rec.mappingStatus === "GOVERNED" && (rec.findingRefs ?? []).length > 0,
          reason:
            rec.mappingStatus === "GOVERNED"
              ? "mapeo gobernado declarado por el pack"
              : "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER: sin mapeo gobernado; requiere selección humana registrada",
        }));
    },

    getInterventionPrinciple() {
      const principio = pack.interventionPrinciple;
      if (!principio) return null;
      return {
        id: principio.id,
        statement: principio.statement,
        formula: principio.formula,
        ruleRefs: (principio.ruleRefs ?? []).slice(),
        // Principio, nunca fórmula: la selección no es automatizable.
        automatable: !principio.formula.startsWith("NOT_EXPLICIT"),
      };
    },

    listActivityIdentities() {
      return (pack.activities ?? []).map((a) => ({
        activityRef: a.id,
        title: a.title ?? null,
        contentStatus: a.contentStatus,
        mappingStatus: a.mappingStatus,
      }));
    },

    getClarificationCandidates(evaluation) {
      if (evaluation.contradictions.length === 0) return [];
      const declaradas = new Set(
        evaluation.contradictions.flatMap((c) => c.clarificationAcquisitionRefs),
      );
      const disponibles = elegibles(evaluation).filter(
        (acq) => declaradas.has(acq.id) || acq.level === CLARIFICATION_LEVEL,
      );
      return disponibles.map(aNextAcquisition);
    },

    /* ------------------- CRV / Validation (M1-KL) -------------------- */

    listValidationRequirements() {
      return (pack.validationRequirements ?? []).map(aIdentidadCrv);
    },

    getValidationRequirementForActivity(activityRef) {
      if (!activityRef) return null;
      const crv = (pack.validationRequirements ?? []).find((v) => {
        const owner = resolveValidationRequirementOwner(v);
        return owner?.kind === "ACTIVITY" && owner.ref === activityRef;
      });
      return crv ? aIdentidadCrv(crv) : null;
    },

    getValidationRequirementsForOwner(kind, ref) {
      return (pack.validationRequirements ?? [])
        .filter((v) => {
          const owner = resolveValidationRequirementOwner(v);
          return owner?.kind === kind && owner.ref === ref;
        })
        .map(aIdentidadCrv);
    },

    assessValidationRequirementJudgment(requirementRef, input) {
      const crv = (pack.validationRequirements ?? []).find((v) => v.id === requirementRef);
      return evaluarJuicioCrv(requirementRef, crv, input);
    },

    listInterventionPatterns() {
      return (pack.interventionPatterns ?? []).map((ip) => identidadPatron(pack, ip));
    },

    evaluateImplementation(patternRef, input) {
      return evaluarImplementacion(pack, patternRef, input);
    },

    assessValidation(input) {
      return evaluarValidacion(pack, input);
    },

    assessFindingConsolidation(findingRef, input) {
      return evaluarConsolidacion(pack, findingRef, input);
    },

    listEngineActions() {
      return (pack.engineActions ?? []).map((a) => ({ id: a.id, meaning: a.meaning }));
    },

    evaluateValidationRequirement(requirementRef, input) {
      const crv = (pack.validationRequirements ?? []).find((v) => v.id === requirementRef);
      if (!crv) {
        return {
          requirementRef,
          satisfied: false,
          status: "NOT_SATISFIED" as const,
          metConditionIds: [],
          unmetConditionIds: [],
          reason: "VALIDATION_REQUIREMENT_NOT_EXPLICIT",
          consecutiveCorrectCount: 0,
          requiredCaseCount: null,
          secondExecutorRespondentId: null,
        };
      }
      if ((crv.evaluation ?? "DETERMINISTIC_CONDITIONS") === "GOVERNED_JUDGMENT") {
        return {
          requirementRef,
          satisfied: false,
          status: "REVIEW_REQUIRED" as const,
          metConditionIds: [],
          unmetConditionIds: crv.conditions.map((c) => c.id),
          reason:
            "CRV de juicio gobernado: requiere juicio humano registrado (assessValidationRequirementJudgment); el runtime no lo satisface",
          consecutiveCorrectCount: 0,
          requiredCaseCount: null,
          secondExecutorRespondentId: null,
        };
      }
      return evaluarCrv(crv, input);
    },

    compareVariableStates(baseline, current) {
      return compararEstados(baseline, current);
    },
  };
}

function resolucionCriticidad(criticidad: string | undefined): PropertyResolutionMode {
  if (!criticidad || criticidad.startsWith("NOT_EXPLICIT")) return "NOT_EXPLICIT";
  if (criticidad === "CONTEXT_DEPENDENT") return "CONTEXTUAL";
  return "FIXED";
}

/* ------------------------------------------------------------------ */
/* CRV: identidad y evaluación determinística de condiciones           */
/* ------------------------------------------------------------------ */

type CrvPack = NonNullable<KnowledgePack["validationRequirements"]>[number];

function aIdentidadCrv(crv: CrvPack): ValidationRequirementIdentity {
  const consecutiva = crv.conditions.find((c) => c.kind === "CONSECUTIVE_CORRECT_CASES");
  const owner = resolveValidationRequirementOwner(crv) as { kind: ValidationRequirementOwnerKind; ref: string };
  return {
    requirementRef: crv.id,
    activityRef: owner.kind === "ACTIVITY" ? owner.ref : null,
    owner: { kind: owner.kind, ref: owner.ref },
    name: crv.name ?? null,
    definition: crv.definition,
    definitionSource: crv.definitionSource,
    evaluation: crv.evaluation ?? "DETERMINISTIC_CONDITIONS",
    conditions: crv.conditions.map((c) => ({
      id: c.id,
      kind: c.kind,
      statement: c.statement,
      requiredCount: c.requiredCount ?? null,
    })),
    requiredCaseCount: consecutiva?.requiredCount ?? null,
    // Un CRV nunca es un puntaje: la satisfacción es conjunta y cualitativa.
    isScore: false,
  };
}

/**
 * Evalúa un CRV únicamente con las condiciones declaradas por el pack.
 * Las condiciones son CONJUNTAS: satisfacer dos de tres no satisface el CRV.
 */
function evaluarCrv(
  crv: CrvPack,
  input: { primaryExecutorRespondentId: string | null; cases: ValidationCaseInput[] },
): ValidationRequirementEvaluation {
  const requerido = crv.conditions.find((c) => c.kind === "CONSECUTIVE_CORRECT_CASES")?.requiredCount ?? null;
  const ordenados = [...input.cases].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  const segundos = ordenados.filter(
    (c) => !input.primaryExecutorRespondentId || c.executorRespondentId !== input.primaryExecutorRespondentId,
  );

  // Mejor racha consecutiva por ejecutor: correcta y sin asistencia crítica.
  let mejorRacha = 0;
  let mejorRachaCorrectos = 0;
  let ejecutorRacha: string | null = null;
  const porEjecutor = new Map<string, ValidationCaseInput[]>();
  for (const caso of segundos) {
    porEjecutor.set(caso.executorRespondentId, [
      ...(porEjecutor.get(caso.executorRespondentId) ?? []),
      caso,
    ]);
  }
  for (const [ejecutor, casos] of porEjecutor) {
    let racha = 0;
    let rachaCorrectos = 0;
    for (const caso of casos) {
      if (caso.outcome === "CORRECT") rachaCorrectos += 1;
      else rachaCorrectos = 0;
      if (caso.outcome === "CORRECT" && !caso.criticalAssistance) racha += 1;
      else racha = 0;
      if (racha > mejorRacha) {
        mejorRacha = racha;
        ejecutorRacha = ejecutor;
      }
      if (rachaCorrectos > mejorRachaCorrectos) mejorRachaCorrectos = rachaCorrectos;
    }
  }

  const met: string[] = [];
  const unmet: string[] = [];
  for (const condicion of crv.conditions) {
    let cumple = false;
    switch (condicion.kind) {
      case "GOVERNED_STATEMENT":
      case "JUSTIFYING_CONDITION_REFERENCE":
        // Nunca alcanzable por el evaluador determinístico (el schema lo impide).
        cumple = false;
        break;
      case "DISTINCT_SECOND_EXECUTOR":
        cumple = input.primaryExecutorRespondentId !== null && segundos.length > 0;
        break;
      case "CONSECUTIVE_CORRECT_CASES":
        cumple = mejorRachaCorrectos >= (condicion.requiredCount ?? Number.POSITIVE_INFINITY);
        break;
      case "NO_CRITICAL_ASSISTANCE":
        cumple =
          requerido === null
            ? segundos.every((c) => !c.criticalAssistance)
            : mejorRacha >= requerido;
        break;
    }
    (cumple ? met : unmet).push(condicion.id);
  }

  const satisfied = unmet.length === 0;
  const enProgreso = !satisfied && mejorRacha > 0 && requerido !== null && mejorRacha < requerido;
  return {
    requirementRef: crv.id,
    satisfied,
    status: satisfied ? "SATISFIED" : enProgreso ? "IN_PROGRESS" : "NOT_SATISFIED",
    metConditionIds: met,
    unmetConditionIds: unmet,
    reason: satisfied
      ? `CRV satisfecho: ${crv.definition}`
      : `CRV no satisfecho; condiciones pendientes: ${unmet.join(", ")}`,
    consecutiveCorrectCount: mejorRacha,
    requiredCaseCount: requerido,
    secondExecutorRespondentId: satisfied ? ejecutorRacha : null,
  };
}

/* ------------------------------------------------------------------ */
/* M2 runtime closure · Juicio de CRV, Done, validación y consolidación         */
/* Todo es genérico: la semántica proviene exclusivamente del pack.     */
/* ------------------------------------------------------------------ */

type PatronPack = NonNullable<KnowledgePack["interventionPatterns"]>[number];

function evaluarJuicioCrv(
  requirementRef: string,
  crv: CrvPack | undefined,
  input: ValidationRequirementJudgmentInput,
): ValidationRequirementJudgmentAssessment {
  const base = { requirementRef, isScore: false as const };
  if (!crv) {
    return {
      ...base,
      admissible: false,
      status: null,
      metConditionIds: [],
      unmetConditionIds: [],
      issues: ["VALIDATION_REQUIREMENT_NOT_EXPLICIT"],
    };
  }
  if ((crv.evaluation ?? "DETERMINISTIC_CONDITIONS") !== "GOVERNED_JUDGMENT") {
    return {
      ...base,
      admissible: false,
      status: null,
      metConditionIds: [],
      unmetConditionIds: [],
      issues: ["CRV determinístico: se evalúa con evaluateValidationRequirement, no por juicio"],
    };
  }
  const issues: string[] = [];
  const met: string[] = [];
  const unmet: string[] = [];
  const humano = Boolean(input.judgedBy);
  if (!humano) issues.push("el juicio de un CRV exige una persona responsable registrada (judgedBy)");
  const concluyente = input.judgment === "SATISFIED" || input.judgment === "NOT_SATISFIED";
  if (concluyente && input.evidenceIds.length === 0) {
    issues.push(
      (input.kpiRefs ?? []).length > 0
        ? "un KPI no sustituye evidencia: CRV ≠ KPI"
        : "un juicio concluyente de CRV exige evidencia registrada",
    );
  }
  for (const condicion of crv.conditions) {
    let cumple = false;
    if (condicion.kind === "GOVERNED_STATEMENT") {
      cumple = humano && (!concluyente || input.evidenceIds.length > 0);
    } else if (condicion.kind === "JUSTIFYING_CONDITION_REFERENCE") {
      cumple = (input.justifyingFindingRefs ?? []).length > 0;
      if (!cumple && concluyente) {
        issues.push(`${condicion.id}: el juicio debe referenciar la condición que justificó la intervención`);
      }
    }
    (cumple ? met : unmet).push(condicion.id);
  }
  const admissible = issues.length === 0;
  return {
    ...base,
    admissible,
    status: admissible ? input.judgment : null,
    metConditionIds: met,
    unmetConditionIds: unmet,
    issues,
  };
}

function identidadPatron(pack: KnowledgePack, ip: PatronPack): InterventionPatternIdentity {
  return {
    patternRef: ip.id,
    name: ip.name,
    objective: ip.objective ?? null,
    purpose: ip.purpose ?? null,
    instruments: (ip.instruments ?? []).map((i) => ({ id: i.id, name: i.name })),
    deliverables: (ip.deliverables ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      instrumentRef: d.instrumentRef ?? null,
    })),
    minimumActivities: (ip.minimumActivities ?? []).slice(),
    doneCriteria: (ip.doneCriteria ?? []).map((c, i) => ({
      position: i + 1,
      id: c.id,
      statement: c.statement,
    })),
    validationRequirementRefs: (pack.validationRequirements ?? [])
      .filter((v) => {
        const owner = resolveValidationRequirementOwner(v);
        return owner?.kind === "INTERVENTION_PATTERN" && owner.ref === ip.id;
      })
      .map((v) => v.id),
  };
}

function evaluarImplementacion(
  pack: KnowledgePack,
  patternRef: string,
  input: ImplementationInput,
): ImplementationEvaluation {
  const vacio = {
    patternRef,
    executionStateRef: null,
    implemented: false,
    stateSelection: "GOVERNED_JUDGMENT" as const,
    candidateExecutionStateRefs: [] as string[],
    completedLayerRefs: [] as string[],
    missingLayerRefs: [] as string[],
    layersMissingEvidence: [] as string[],
    unmetDoneCriteriaPositions: [] as number[],
    validationRequirementSatisfied: null,
    effectivenessStateRef: null,
  };
  const patron = (pack.interventionPatterns ?? []).find((p) => p.id === patternRef);
  const modelo = pack.implementationModel;
  if (!patron || !modelo) {
    return {
      ...vacio,
      issues: [patron ? "IMPLEMENTATION_MODEL_NOT_EXPLICIT" : "INTERVENTION_PATTERN_NOT_EXPLICIT"],
      reason: "el pack no declara el modelo de implementación o el patrón",
    };
  }
  const issues: string[] = [];
  const capas = new Map(modelo.doneLayers.map((l) => [l.id, l]));
  const completadas: string[] = [];
  const sinEvidencia: string[] = [];
  for (const registro of input.layerRecords) {
    const capa = capas.get(registro.layerRef);
    if (!capa) {
      issues.push(`capa de Done desconocida: ${registro.layerRef}`);
      continue;
    }
    if (!registro.completed) continue;
    if (capa.requiresEvidence && (registro.evidenceIds ?? []).length === 0) {
      sinEvidencia.push(capa.id);
      continue;
    }
    completadas.push(capa.id);
  }
  const criterios = patron.doneCriteria ?? [];
  const cumplidos = new Set(input.doneCriteriaRecords.filter((r) => r.met).map((r) => r.position));
  input.doneCriteriaRecords.forEach((r) => {
    if (r.position < 1 || r.position > criterios.length) issues.push(`Done Criterion inexistente: posición ${r.position}`);
  });
  const noCumplidos = criterios.map((_, i) => i + 1).filter((pos) => !cumplidos.has(pos));

  const implementado = modelo.executionStates.find((e) => e.implemented) ?? null;
  const requeridas = implementado?.requiresDoneLayerRefs ?? [];
  const faltantes = requeridas.filter((ref) => !completadas.includes(ref));
  // Sin Done Criteria explícitos, "todos los criterios" no es verificable:
  // nunca se da por cumplido de forma vacía.
  const criteriosNoExplicitos = Boolean(implementado?.requiresAllDoneCriteria) && criterios.length === 0;
  if (criteriosNoExplicitos) issues.push("DONE_CRITERIA_NOT_EXPLICIT: el patrón no declara Done Criteria");
  const criteriosOk =
    !implementado?.requiresAllDoneCriteria || (!criteriosNoExplicitos && noCumplidos.length === 0);
  const alcanzaImplementado = Boolean(implementado) && faltantes.length === 0 && criteriosOk && issues.length === 0;
  const noImplementados = modelo.executionStates.filter((e) => !e.implemented).map((e) => e.id);

  const declarado = input.assertedExecutionStateRef ?? null;
  if (declarado) {
    const estado = modelo.executionStates.find((e) => e.id === declarado);
    if (!estado) issues.push(`estado de ejecución desconocido: ${declarado}`);
    else if (estado.implemented && !alcanzaImplementado) {
      issues.push(`${declarado} declarado sin cumplir sus requisitos: capas o Done Criteria pendientes`);
    }
  }

  if (alcanzaImplementado && implementado) {
    return {
      ...vacio,
      executionStateRef: implementado.id,
      implemented: true,
      stateSelection: "DETERMINISTIC",
      candidateExecutionStateRefs: [implementado.id],
      completedLayerRefs: completadas,
      layersMissingEvidence: sinEvidencia,
      issues,
      reason: `requisitos de ${implementado.id} cumplidos. Done no implica CRV satisfecho ni efectividad.`,
    };
  }
  // Por debajo del estado implementado la fuente no declara requisitos
  // evaluables: el estado exacto es juicio gobernado (se acepta el declarado).
  const declaradoValido =
    declarado && noImplementados.includes(declarado) && issues.length === 0 ? declarado : null;
  return {
    ...vacio,
    executionStateRef: declaradoValido,
    candidateExecutionStateRefs: noImplementados,
    completedLayerRefs: completadas,
    missingLayerRefs: faltantes,
    layersMissingEvidence: sinEvidencia,
    unmetDoneCriteriaPositions: noCumplidos,
    issues,
    reason: implementado
      ? `${implementado.id} no alcanzado; el estado anterior se registra por juicio gobernado`
      : "el pack no declara un estado implementado",
  };
}

function evaluarValidacion(pack: KnowledgePack, input: ValidationAssessmentInput): ValidationAssessment {
  const issues: string[] = [];
  const efectividad = pack.effectivenessModel;
  const estados = efectividad?.states ?? [];
  const estado = estados.find((e) => e.id === input.effectivenessStateRef) ?? null;
  const crv = (pack.validationRequirements ?? []).find((v) => v.id === input.requirementRef);
  if (!crv) issues.push("VALIDATION_REQUIREMENT_NOT_EXPLICIT");
  if (!efectividad) issues.push("EFFECTIVENESS_MODEL_NOT_EXPLICIT");
  else if (!estado) issues.push(`estado de efectividad desconocido: ${input.effectivenessStateRef}`);

  const implementado = pack.implementationModel?.executionStates.find((e) => e.implemented) ?? null;
  if (estado?.presupposesImplementation && input.implementationStateRef !== implementado?.id) {
    issues.push(
      `${estado.id} presupone implementación (${implementado?.id ?? "estado implementado no declarado"})` +
        (efectividad?.implementationRuleRef ? ` · ${efectividad.implementationRuleRef}` : ""),
    );
  }
  if (estado?.requiresValidationRequirement === "SATISFIED" && input.validationRequirementStatus !== "SATISFIED") {
    issues.push(`${estado.id} exige un juicio de CRV satisfecho`);
  }
  if (estado?.requiresValidationRequirement === "NOT_SATISFIED" && input.validationRequirementStatus === "SATISFIED") {
    issues.push(`${estado.id} es incompatible con un CRV satisfecho`);
  }
  if (estado?.requiresEvidence && input.evidenceIds.length === 0) {
    issues.push(
      (input.kpiRefs ?? []).length > 0
        ? "un KPI no sustituye evidencia: CRV ≠ KPI"
        : `${estado.id} es un juicio concluyente y exige evidencia registrada`,
    );
  }
  const noEvaluado = estado !== null && !estado.presupposesImplementation && !estado.requiresEvidence && estados[0]?.id === estado.id;
  if (!noEvaluado && !input.validatedBy) issues.push("una validación exige una persona responsable (validatedBy)");
  const niveles = (pack.attributionModel?.levels ?? []).map((l) => l.id);
  if (input.attributionConfidenceRef && !niveles.includes(input.attributionConfidenceRef)) {
    issues.push(`nivel de atribución desconocido: ${input.attributionConfidenceRef}`);
  }
  if (
    input.unintendedNegativeOutcome &&
    efectividad?.negativeOutcomeStateRef &&
    estado &&
    estado.id !== efectividad.negativeOutcomeStateRef &&
    estado.requiresValidationRequirement === "SATISFIED"
  ) {
    issues.push(
      `efecto negativo material registrado: ${estado.id} exige revisión; la fuente lo registra como ${efectividad.negativeOutcomeStateRef}`,
    );
  }

  const admissible = issues.length === 0;
  const modeloValidacion = pack.validationModel;
  const decisiones = admissible
    ? (modeloValidacion?.decisions ?? [])
        .filter(
          (d) =>
            (d.whenEffectivenessStateRef && d.whenEffectivenessStateRef === input.effectivenessStateRef) ||
            (d.whenNegativeUnintendedOutcome && input.unintendedNegativeOutcome),
        )
        .map((d) => ({ decision: d.decision, action: d.action ?? null, selection: d.selection }))
    : [];

  const reglasSeguimiento = (pack.followUp?.rules ?? []).filter((r) =>
    (r.triggerEffectivenessStateRefs ?? []).includes(input.effectivenessStateRef),
  );
  const seguimientoActivado = admissible && reglasSeguimiento.length > 0;
  const reglasReassessment = (pack.reassessment?.rules ?? []).filter((r) =>
    r.triggerEffectivenessStateRefs.includes(input.effectivenessStateRef),
  );
  const reassessmentActivado = admissible && reglasReassessment.length > 0;

  return {
    requirementRef: input.requirementRef,
    admissible,
    issues,
    effectivenessStateRef: input.effectivenessStateRef,
    attributionConfidenceRef: input.attributionConfidenceRef,
    decisions: decisiones,
    followUp: {
      triggered: seguimientoActivado,
      ruleRefs: seguimientoActivado ? reglasSeguimiento.map((r) => r.id) : [],
      status: !seguimientoActivado
        ? "NOT_TRIGGERED"
        : reglasSeguimiento.some((r) => r.conditionClassification === "GOVERNED_JUDGMENT")
          ? "REVIEW_REQUIRED"
          : "REQUIRED",
      frequencyFormula: pack.followUp?.frequencyFormula ?? "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
    },
    reassessment: {
      triggered: reassessmentActivado,
      status: !reassessmentActivado
        ? "NOT_TRIGGERED"
        : reglasReassessment.some((r) => r.conditionClassification === "GOVERNED_JUDGMENT")
          ? "REVIEW_REQUIRED"
          : "REQUIRED",
      loop: reassessmentActivado ? (reglasReassessment[0]?.loop ?? null) : null,
      createsNewAssessment: true,
      distinctFromFollowUp: true,
    },
    isMaturity: false,
    isScore: false,
  };
}

function evaluarConsolidacion(
  pack: KnowledgePack,
  findingRef: string,
  input: FindingConsolidationInput,
): FindingConsolidationAssessment {
  const issues: string[] = [];
  if (!(pack.findings ?? []).some((f) => f.id === findingRef)) issues.push(`finding desconocido: ${findingRef}`);
  const sev = (pack.severity?.levels ?? []).map((l) => l.id);
  const conf = (pack.confidence?.levels ?? []).map((l) => l.id);
  if (input.severityRef && !sev.includes(input.severityRef)) issues.push(`severidad desconocida: ${input.severityRef}`);
  if (input.confidenceRef && !conf.includes(input.confidenceRef)) issues.push(`confianza desconocida: ${input.confidenceRef}`);
  const contextual = pack.severity?.resolution === "CONTEXTUAL" || pack.confidence?.resolution === "CONTEXTUAL";
  if (contextual && (input.severityRef || input.confidenceRef) && !input.judgedBy) {
    issues.push("severidad/confianza contextuales exigen juicio gobernado registrado (judgedBy)");
  }
  if (issues.length > 0) {
    return { findingRef, status: "INVALID_INPUT", blockedByGuardIds: [], requiredActions: [], issues };
  }
  const bloqueos = (pack.severity?.consolidationGuards ?? []).filter(
    (g) =>
      (g.appliesToClaim === "ANY" || (g.appliesToClaim === "CAUSAL" && input.claim === "CAUSAL")) &&
      input.severityRef !== null &&
      input.confidenceRef !== null &&
      g.severityRefs.includes(input.severityRef) &&
      g.confidenceRefs.includes(input.confidenceRef),
  );
  return {
    findingRef,
    status: bloqueos.length > 0 ? "BLOCKED" : "ADMISSIBLE",
    blockedByGuardIds: bloqueos.map((g) => g.id),
    requiredActions: bloqueos.map((g) => g.action).filter((a): a is string => Boolean(a)),
    issues,
  };
}

/* ------------------------------------------------------------------ */
/* Comparación de estados gobernados (Baseline vs Reassessment)        */
/* ------------------------------------------------------------------ */

const INTERPRETACION: Record<StateTransition, string> = {
  UNCHANGED: "Sin cambio de estado gobernado.",
  MORE_INFORMATION: "Mayor información disponible. NO significa mejora empresarial.",
  LESS_INFORMATION: "Menor información disponible que en la línea base.",
  CONTRADICTION_RESOLVED: "Contradicción resuelta. NO significa mejora empresarial.",
  CONTRADICTION_INTRODUCED: "Aparece una contradicción entre fuentes.",
  CHANGED: "El estado gobernado cambió.",
  NEW: "Variable evaluada por primera vez.",
  REMOVED: "Variable sin evaluación en la reevaluación.",
};

function transicion(previo: string | null, actual: string | null): StateTransition {
  if (previo === null) return "NEW";
  if (actual === null) return "REMOVED";
  if (previo === actual) return "UNCHANGED";
  if (previo === "CONTRADICTORY") return actual === "KNOWN" ? "CONTRADICTION_RESOLVED" : "CHANGED";
  if (actual === "CONTRADICTORY") return "CONTRADICTION_INTRODUCED";
  if (previo === "UNKNOWN" && actual === "KNOWN") return "MORE_INFORMATION";
  if (previo === "KNOWN" && actual === "UNKNOWN") return "LESS_INFORMATION";
  return "CHANGED";
}

function compararEstados(
  baseline: { variableRef: string; state: string }[],
  current: { variableRef: string; state: string }[],
): StateComparison[] {
  const previos = new Map(baseline.map((b) => [b.variableRef, b.state]));
  const actuales = new Map(current.map((c) => [c.variableRef, c.state]));
  const refs = [...new Set([...previos.keys(), ...actuales.keys()])].sort();
  return refs.map((variableRef) => {
    const previo = previos.get(variableRef) ?? null;
    const actual = actuales.get(variableRef) ?? null;
    const kind = transicion(previo, actual);
    return {
      variableRef,
      baselineState: previo,
      currentState: actual,
      transition: kind,
      // No existe algoritmo aprobado para etiquetar mejora empresarial.
      improvement: null,
      interpretation: INTERPRETACION[kind],
    };
  });
}
