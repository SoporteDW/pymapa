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
 * - No convierte estados semánticos en números.
 * - UNKNOWN se preserva: nunca se transforma en ausencia, falla ni respuesta
 *   negativa, y nunca deriva automáticamente en conclusión adversa.
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
  /** Requerido por el Knowledge Master cuando el estado es NOT_APPLICABLE. */
  notApplicableReason?: string | null;
  /** Requerido cuando el estado es CONTRADICTORY: fuentes/observaciones en conflicto. */
  conflictingObservationIds?: string[];
  recordedAt: string;
}

/** Bookkeeping del runtime sobre una Information Need (no es semántica del Master). */
export type InformationNeedRuntimeState =
  | "PENDING"
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
    mappingStatus: string;
  };
}

export interface PendingJudgment {
  ruleRef: string;
  classification: "GOVERNED_JUDGMENT" | "UNIMPLEMENTED_GAP";
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
  /** M1-D no produce findings: no se fabrican para demostrar el vertical. */
  findings: never[];
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
}

const NO_FORMULA =
  "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER: no existe fórmula aprobada; el runtime no la infiere.";

const LEVEL_ORDER = ["P1", "P2", "P3", "P4", "P5"];

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
  getNextAcquisition(evaluation: EvaluationResult): NextAcquisition | null;
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
      classification: "DETERMINISTIC" as const,
    };

    if (own.length === 0) {
      return {
        variableRef,
        state: "UNKNOWN",
        semanticValue: null,
        detail: { ...base, note: "sin observación registrada; ausencia de dato, no conclusión adversa" },
      };
    }

    const declaredContradiction = own.some((o) => o.knowledgeState === "CONTRADICTORY");
    const knownValues = new Set(
      own.filter((o) => o.knowledgeState === "KNOWN" && o.semanticValue).map((o) => o.semanticValue as string),
    );
    if (declaredContradiction || knownValues.size > 1) {
      return {
        variableRef,
        state: "CONTRADICTORY",
        semanticValue: null,
        detail: { ...base, note: "estados en conflicto: no se promedian ni se resuelven automáticamente" },
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
        detail: { ...base, note: "UNKNOWN explícito preservado; no equivale a negativo ni a ausencia" },
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
              mappingStatus: need.mappingStatus,
            },
          };
        }
        const pending = need.variableRefs.filter((ref) => sinObservacion.has(ref));
        const explicitUnknown = need.variableRefs.filter(
          (ref) => !sinObservacion.has(ref) && stateByVariable.get(ref) === "UNKNOWN",
        );
        const contradictory = need.variableRefs.some((ref) => stateByVariable.get(ref) === "CONTRADICTORY");
        const state: InformationNeedRuntimeState = contradictory
          ? "AWAITING_CLARIFICATION"
          : pending.length > 0
            ? "PENDING"
            : "COLLECTED";
        return {
          needRef: need.id,
          state,
          detail: {
            variableRefs: need.variableRefs.slice(),
            pendingVariableRefs: pending,
            explicitUnknownVariableRefs: explicitUnknown,
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

      return {
        variableEvaluations,
        informationNeedStates,
        pendingJudgments,
        findings: [],
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

    getNextAcquisition(evaluation) {
      // Solo se vuelve a preguntar lo que aún no tiene observación.
      // Un UNKNOWN explícito YA es información: no se re-pregunta en bucle.
      const sinObservacion = new Set(
        evaluation.variableEvaluations
          .filter((v) => v.detail.observationIds.length === 0)
          .map((v) => v.variableRef),
      );
      const ordered = pack.acquisitions
        .slice()
        .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));

      const next = ordered.find((acq) => acq.variableRefs.some((ref) => sinObservacion.has(ref)));
      if (!next) return null;

      return {
        acquisitionId: next.id,
        capabilityId: pack.capability.id,
        level: next.level,
        informationNeedRef: next.informationNeedRef ?? null,
        variableRefs: next.variableRefs.slice(),
        question: next.question,
        purpose: next.purpose ?? null,
        allowedKnowledgeStates: next.responseModel.knowledgeStates.slice(),
        allowedSemanticValues: semanticValuesFor(next),
        optionSetStatus: next.responseModel.optionSetStatus ?? null,
      };
    },
  };
}
