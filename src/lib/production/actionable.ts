/**
 * PKG-02 · Trabajo de adquisición accionable, derivado en el servidor.
 *
 * Reglas:
 * - Las adquisiciones con pregunta literal conservan el orden adaptativo del
 *   Engine 0.2.0 (getNextAcquisition / getEligibleAcquisitions, triggers).
 * - Las adquisiciones SIN pregunta (INFORMATION_NEED, GOVERNED_STRUCTURAL_
 *   CORRESPONDENCE) no tienen orden gobernado: se devuelven como conjunto de
 *   tareas pendientes, en el orden declarado del pack (orden de lectura, no
 *   prioridad). Nunca se fabrica una pregunta a partir de ellas.
 * - `getNextAcquisition() === null` nunca implica capacidad completa.
 * - No existe fórmula de suficiencia gobernada: no hay SUFFICIENT ni %.
 *
 * Todo texto devuelto es copia literal del pack publicado.
 */
import type { EvaluationResult, KnowledgeEngine, NextAcquisition } from "@pymapa/knowledge-engine";

export type CapabilityInteractionState =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "AWAITING_INFORMATION"
  | "NEEDS_CLARIFICATION"
  | "ACQUISITION_EXHAUSTED";

export type AcquisitionMode =
  | "QUESTION"
  | "CAPABILITY_PROGRESSIVE"
  | "INFORMATION_NEED"
  | "GOVERNED_STRUCTURAL_CORRESPONDENCE";

export interface LinkedVariable {
  variableRef: string;
  /** Nombre canónico del pack, o null si el pack no lo declara. */
  name: string | null;
}

export interface ActionableAcquisition {
  acquisitionId: string;
  mode: AcquisitionMode;
  level: string | null;
  /** Pregunta literal del pack; null cuando la fuente no la declara. */
  question: string | null;
  purpose: string | null;
  triggerStatement: string | null;
  informationNeedRef: string | null;
  /** `informationNeeds[].statement` literal. */
  informationNeedStatement: string | null;
  /** `correspondenceStatement` literal (modo de correspondencia estructural). */
  correspondenceStatement: string | null;
  /** Núcleo literal declarado para adquisición progresiva. */
  progressiveNuclear: string | null;
  variables: LinkedVariable[];
  allowedKnowledgeStates: string[];
  allowedSemanticValues: string[] | null;
  questionStatus: string | null;
}

export interface CapabilityWorkspace {
  capabilityId: string;
  interactionState: CapabilityInteractionState;
  /** Siguiente pregunta según el Engine (null no significa completa). */
  nextQuestion: ActionableAcquisition | null;
  /** Preguntas habilitadas ahora por el Engine (incluye nextQuestion). */
  eligibleQuestions: ActionableAcquisition[];
  /** Tareas de información sin pregunta literal aún no respondidas. */
  pendingInformationTasks: ActionableAcquisition[];
  clarifications: ActionableAcquisition[];
  counts: {
    totalAcquisitions: number;
    answered: number;
    eligibleQuestions: number;
    questionsNotYetEnabled: number;
    pendingInformationTasks: number;
    contradictions: number;
  };
}

type RawAcq = {
  id: string;
  level?: string;
  acquisitionMode?: string;
  informationNeedRef?: string;
  variableRefs: string[];
  question?: unknown;
  purpose?: string;
  questionStatus?: string;
  correspondenceStatement?: string;
  progressiveContext?: { nuclear?: { text?: string } };
  responseModel?: { knowledgeStates?: string[]; semanticValuesFromVariable?: string };
};
type RawPack = {
  acquisitions?: RawAcq[];
  informationNeeds?: { id: string; statement?: string }[];
  variables?: { id: string; name?: string; semanticStates?: unknown }[];
};

function modoDe(acq: RawAcq): AcquisitionMode {
  const m = acq.acquisitionMode;
  if (m === "INFORMATION_NEED" || m === "GOVERNED_STRUCTURAL_CORRESPONDENCE" || m === "CAPABILITY_PROGRESSIVE") return m;
  // OP-01/OP-02 no declaran modo: son preguntas literales.
  return "QUESTION";
}

export function createActionableProjector(rawPack: unknown) {
  const pack = rawPack as RawPack;
  const acqById = new Map((pack.acquisitions ?? []).map((a) => [a.id, a]));
  const niById = new Map((pack.informationNeeds ?? []).map((n) => [n.id, n]));
  const varById = new Map((pack.variables ?? []).map((v) => [v.id, v]));

  function semanticos(acq: RawAcq): string[] | null {
    const ref = acq.responseModel?.semanticValuesFromVariable;
    if (!ref) return null;
    const estados = varById.get(ref)?.semanticStates;
    return Array.isArray(estados) && estados.every((e) => typeof e === "string") ? (estados as string[]) : null;
  }

  function proyectar(acq: RawAcq, next?: NextAcquisition): ActionableAcquisition {
    const ni = acq.informationNeedRef ? niById.get(acq.informationNeedRef) : undefined;
    return {
      acquisitionId: acq.id,
      mode: modoDe(acq),
      level: acq.level ?? null,
      question: typeof acq.question === "string" ? acq.question : null,
      purpose: acq.purpose ?? null,
      triggerStatement: next?.triggerStatement ?? null,
      informationNeedRef: acq.informationNeedRef ?? null,
      informationNeedStatement: ni?.statement ?? null,
      correspondenceStatement: acq.correspondenceStatement ?? null,
      progressiveNuclear: acq.progressiveContext?.nuclear?.text ?? null,
      variables: acq.variableRefs.map((ref) => ({ variableRef: ref, name: varById.get(ref)?.name ?? null })),
      allowedKnowledgeStates: next?.allowedKnowledgeStates ?? acq.responseModel?.knowledgeStates ?? [],
      allowedSemanticValues: next ? next.allowedSemanticValues : semanticos(acq),
      questionStatus: acq.questionStatus ?? null,
    };
  }

  function desdeNext(n: NextAcquisition): ActionableAcquisition {
    const acq = acqById.get(n.acquisitionId);
    if (!acq) throw new Error(`ACQUISITION_NOT_IN_PACK:${n.acquisitionId}`);
    return proyectar(acq, n);
  }

  return {
    derive(params: {
      engine: KnowledgeEngine;
      evaluation: EvaluationResult;
      answeredAcquisitionIds: string[];
    }): CapabilityWorkspace {
      const { engine, evaluation } = params;
      const respondidas = new Set(params.answeredAcquisitionIds);
      const next = engine.getNextAcquisition(evaluation);
      const elegibles = engine.getEligibleAcquisitions(evaluation);
      const aclaraciones = engine.getClarificationCandidates(evaluation);
      const todas = pack.acquisitions ?? [];

      const pendientes = todas
        .filter((a) => typeof a.question !== "string" && !respondidas.has(a.id))
        .map((a) => proyectar(a));
      const preguntasNoHabilitadas = todas.filter(
        (a) =>
          typeof a.question === "string" &&
          !respondidas.has(a.id) &&
          !elegibles.some((e) => e.acquisitionId === a.id),
      ).length;

      let interactionState: CapabilityInteractionState;
      if (respondidas.size === 0) interactionState = "NOT_STARTED";
      else if (evaluation.contradictions.length > 0) interactionState = "NEEDS_CLARIFICATION";
      else if (next) interactionState = "IN_PROGRESS";
      else if (pendientes.length > 0) interactionState = "AWAITING_INFORMATION";
      else interactionState = "ACQUISITION_EXHAUSTED";

      return {
        capabilityId: engine.pack.capability.id,
        interactionState,
        nextQuestion: next ? desdeNext(next) : null,
        eligibleQuestions: elegibles.map(desdeNext),
        pendingInformationTasks: pendientes,
        clarifications: aclaraciones.map(desdeNext),
        counts: {
          totalAcquisitions: todas.length,
          answered: todas.filter((a) => respondidas.has(a.id)).length,
          eligibleQuestions: elegibles.length,
          questionsNotYetEnabled: preguntasNoHabilitadas,
          pendingInformationTasks: pendientes.length,
          contradictions: evaluation.contradictions.length,
        },
      };
    },
  };
}
