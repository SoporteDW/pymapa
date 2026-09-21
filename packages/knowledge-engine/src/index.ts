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
  validateKnowledgePack,
  type KnowledgePack,
  type KnowledgePackAcquisition,
  type KnowledgeState,
} from "@pymapa/knowledge-schema";

export const ENGINE_VERSION = "pymapa-knowledge-engine/0.1.0";

export type { KnowledgePack, KnowledgeState };
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
  severity: { state: string | null; reason: string };
  ruleRefs: string[];
  variableRefs: string[];
  /** Lineage: observaciones y evidencias que lo sostienen. */
  supportingObservationIds: string[];
  supportingEvidenceIds: string[];
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
  /** Referencias a otras capacidades. Nunca ejecutan la capacidad destino. */
  derivedDependencyReferences: DerivedDependencyReferenceResult[];
  /** Sufficiency/Confidence no tienen fórmula aprobada. */
  sufficiency: { state: null; reason: string };
  confidence: { state: null; reason: string };
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
  /** Comparación Baseline vs Reassessment: cambios de estado, nunca mejora. */
  compareVariableStates(
    baseline: { variableRef: string; state: string }[],
    current: { variableRef: string; state: string }[],
  ): StateComparison[];
}

export interface ValidationRequirementCondition {
  id: string;
  kind: "DISTINCT_SECOND_EXECUTOR" | "CONSECUTIVE_CORRECT_CASES" | "NO_CRITICAL_ASSISTANCE";
  statement: string;
  requiredCount: number | null;
}

export interface ValidationRequirementIdentity {
  requirementRef: string;
  activityRef: string;
  definition: string;
  definitionSource: string;
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
  status: "SATISFIED" | "NOT_SATISFIED" | "IN_PROGRESS";
  metConditionIds: string[];
  unmetConditionIds: string[];
  reason: string;
  consecutiveCorrectCount: number;
  requiredCaseCount: number | null;
  secondExecutorRespondentId: string | null;
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
      level: acq.level,
      informationNeedRef: acq.informationNeedRef ?? null,
      variableRefs: acq.variableRefs.slice(),
      question: acq.question,
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
    return pack.acquisitions
      .slice()
      .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
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
        return {
          variableRef: v.id,
          requiredLevel: v.minimumEvidence,
          options: v.minimumEvidenceOptions ? v.minimumEvidenceOptions.slice() : null,
          resolution:
            condicional && sinFormula ? "EVIDENCE_REQUIREMENT_REVIEW_REQUIRED" : "RESOLVED",
          provenance: {
            knowledgePackId: pack.packId,
            knowledgePackVersion: pack.packVersion,
            note: condicional && sinFormula ? NO_EVIDENCE_FORMULA : (v.minimumEvidenceNote ?? "requisito declarado"),
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
      const ruleById = new Map(rules.map((r) => [r.id, r]));
      const evaluacionPorVariable = new Map(variableEvaluations.map((v) => [v.variableRef, v]));
      const findingCandidates: FindingCandidateResult[] = (pack.findings ?? [])
        .map((finding): FindingCandidateResult | null => {
          const ruleRefs = finding.ruleRefs ?? [];
          const variableRefs = finding.variableRefs ?? [];
          const involucradas = variableRefs
            .map((ref) => evaluacionPorVariable.get(ref))
            .filter((v): v is VariableEvaluationResult => Boolean(v));
          const conDato = involucradas.filter((v) => v.detail.observationIds.length > 0);
          if (conDato.length === 0) return null;
          const reglas = ruleRefs.map((ref) => ruleById.get(ref));
          const confirmable =
            ruleRefs.length > 0 &&
            reglas.every((r) => r?.classification === "DETERMINISTIC" && r.implemented);
          return {
            findingRef: finding.id,
            name: finding.name,
            polarity: (finding.polarity ?? "ADVERSE") as "ADVERSE" | "STRENGTH",
            lifecycleState: confirmable ? ("CANDIDATE" as const) : ("NEEDS_REVIEW" as const),
            deterministicallyConfirmable: confirmable,
            severity: {
              state: null,
              reason:
                "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER: no existe algoritmo de severidad ni de priority; la severidad no se infiere.",
            },
            ruleRefs: ruleRefs.slice(),
            variableRefs: variableRefs.slice(),
            supportingObservationIds: [...new Set(conDato.flatMap((v) => v.detail.observationIds))],
            supportingEvidenceIds: [...new Set(conDato.flatMap((v) => v.detail.evidenceIds))],
            reason: confirmable
              ? "reglas determinísticas implementadas: candidato evaluable"
              : (finding.polarity ?? "ADVERSE") === "STRENGTH"
                ? "fortaleza posible: no existe gate formal de evidencia positiva (KCC-AT04-03); requiere revisión gobernada"
                : "depende de juicio gobernado (GOVERNED_JUDGMENT): no se confirma automáticamente",
          };
        })
        .filter((f): f is FindingCandidateResult => f !== null);

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
        derivedDependencyReferences,
        sufficiency: { state: null, reason: NO_FORMULA },
        confidence: { state: null, reason: NO_FORMULA },
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
      const crv = (pack.validationRequirements ?? []).find((v) => v.activityRef === activityRef);
      return crv ? aIdentidadCrv(crv) : null;
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
      return evaluarCrv(crv, input);
    },

    compareVariableStates(baseline, current) {
      return compararEstados(baseline, current);
    },
  };
}

/* ------------------------------------------------------------------ */
/* CRV: identidad y evaluación determinística de condiciones           */
/* ------------------------------------------------------------------ */

type CrvPack = NonNullable<KnowledgePack["validationRequirements"]>[number];

function aIdentidadCrv(crv: CrvPack): ValidationRequirementIdentity {
  const consecutiva = crv.conditions.find((c) => c.kind === "CONSECUTIVE_CORRECT_CASES");
  return {
    requirementRef: crv.id,
    activityRef: crv.activityRef,
    definition: crv.definition,
    definitionSource: crv.definitionSource,
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
