/**
 * KNOW-EXEC-14-B · Evaluador sintético AISLADO (Alcance A).
 *
 * Función pura en memoria: no importa el Engine, no lee ni escribe archivos,
 * no toca runtime, base de datos ni RLS. Opera solo sobre entradas sintéticas.
 *
 * Prohibición vinculante: los criterios cualitativos C1–C4 NUNCA se
 * convierten en predicados, umbrales ni heurísticas. El evaluador solo aplica
 * compuertas de integridad (estructura, evidencia, procedencia, estados de
 * conocimiento) y abstención. Toda conclusión sustantiva
 * (`CONDITION_SATISFIED` / `CONDITION_NOT_SATISFIED`) proviene exclusivamente
 * de una revisión D11 válida contra autoridad sintética preautorizada.
 *
 * Invariantes: D4 inactivo, `findingsEmitted: 0`, `productiveWrites: 0`,
 * atribución causal (CAUSE-0) separada de D3.
 */
import {
  diagnosticEntrySchema,
  governedReviewRecordSchema,
  isolatedEvaluationResultSchema,
  ISOLATED_EVALUATION_CONTRACT,
  ISOLATED_EVALUATION_CONTRACT_VERSION,
  SYNTHETIC_ENVIRONMENT,
  type DiagnosticEntry,
  type IsolatedEvaluationResult,
  type ReviewRejectionReason,
  type SyntheticAuthorityGrant,
} from "@pymapa/knowledge-schema";

type SemanticState = Exclude<IsolatedEvaluationResult["semanticState"], null>;

export interface IsolatedEvaluationContext {
  ruleId: string;
  /** Alcance esperado `<capacidad>:<regla>`. */
  scope: string;
  targetVersion: string;
  /** Instante de evaluación inyectado (pureza y repetibilidad). */
  now: string;
  grants: readonly SyntheticAuthorityGrant[];
}

export interface IsolatedEvaluationInput {
  entry: DiagnosticEntry;
  /** Control técnico: un registro no iniciado nunca produce un estado D3. */
  evaluationStarted?: boolean;
  /** Carencia discriminante declarada; no se infiere del texto ni de métricas. */
  informationGap?: string;
  /** Atribución causal declarada por la fuente; nunca entra en D3. */
  declaredCause?: string | null;
}

const REVIEWABLE: readonly SemanticState[] = ["GOVERNED_REVIEW_REQUIRED", "CONFLICTING_INFORMATION"];

function gate(entry: DiagnosticEntry, informationGap?: string): { state: SemanticState; reasons: string[] } {
  const rs = entry.responses.filter((r) => r.questionId === entry.questionId);
  if (rs.length === 0) return { state: "INSUFFICIENT_EVIDENCE", reasons: ["NO_RESPONSES"] };
  const states = new Set(rs.map((r) => r.knowledgeState));
  if (states.has("CONTRADICTORY"))
    return { state: "CONFLICTING_INFORMATION", reasons: ["CONTRADICTORY_RESPONSE_PRESERVED"] };
  if (states.size > 1)
    return {
      state: "CONFLICTING_INFORMATION",
      reasons: ["DIVERGENT_SOURCES_NO_PRECEDENCE_APPLIED"],
    };
  const [only] = [...states];
  if (only === "UNKNOWN") return { state: "INSUFFICIENT_EVIDENCE", reasons: ["UNKNOWN_RESPONSE"] };
  if (rs.some((r) => r.evidenceRefs.length === 0))
    return {
      state: "INSUFFICIENT_EVIDENCE",
      reasons: [only === "NOT_APPLICABLE" ? "APPLICABILITY_CONTEXT_NOT_SUBSTANTIATED" : "KNOWN_WITHOUT_EVIDENCE_IS_NOT_SUFFICIENCY", `FOCUS_SUFFICIENCY_PENDING:${entry.focusVariableRef}`],
    };
  if (informationGap?.trim())
    return { state: "INSUFFICIENT_EVIDENCE", reasons: ["DECLARED_DISCRIMINATING_INFORMATION_GAP", informationGap] };
  if (only === "NOT_APPLICABLE")
    return { state: "GOVERNED_REVIEW_REQUIRED", reasons: ["APPLICABILITY_EVIDENCE_REQUIRES_GOVERNED_VERIFICATION"] };
  return {
    state: "GOVERNED_REVIEW_REQUIRED",
    reasons: ["QUALITATIVE_CRITERIA_NOT_AUTOMATED", `FOCUS_SUFFICIENCY_PENDING:${entry.focusVariableRef}`],
  };
}

export function validateGovernedReview(
  raw: unknown,
  preReviewState: SemanticState,
  entry: DiagnosticEntry,
  ctx: IsolatedEvaluationContext,
): ReviewRejectionReason[] {
  const parsed = governedReviewRecordSchema.safeParse(raw);
  if (!parsed.success) return ["MALFORMED_RECORD"];
  const r = parsed.data;
  const out: ReviewRejectionReason[] = [];
  if (!REVIEWABLE.includes(preReviewState)) out.push("REVIEW_NOT_REQUESTED");
  const grant = ctx.grants.find(
    (g) => g.authorityRef === r.authorityRef && g.environment === SYNTHETIC_ENVIRONMENT && g.institutional === false,
  );
  if (!grant) out.push("UNKNOWN_AUTHORITY");
  else {
    if (!grant.allowedRoles.includes(r.reviewerRole)) out.push("ROLE_NOT_AUTHORIZED");
    if (grant.scope !== r.scope) out.push("OUT_OF_SCOPE");
    if (grant.targetVersion !== r.targetVersion) out.push("VERSION_MISMATCH");
  }
  if (r.scope !== ctx.scope && !out.includes("OUT_OF_SCOPE")) out.push("OUT_OF_SCOPE");
  if ((r.ruleId !== ctx.ruleId || r.variableRef !== entry.focusVariableRef) && !out.includes("OUT_OF_SCOPE")) out.push("OUT_OF_SCOPE");
  if (r.targetVersion !== ctx.targetVersion && !out.includes("VERSION_MISMATCH")) out.push("VERSION_MISMATCH");
  const now = Date.parse(ctx.now);
  if (Date.parse(r.validUntil) < now || Date.parse(r.reviewedAt) > now || Date.parse(r.reviewedAt) > Date.parse(r.validUntil)) out.push("EXPIRED");
  const relevant = entry.responses.filter((x) => x.questionId === entry.questionId);
  const evidence = new Set(relevant.flatMap((x) => x.evidenceRefs));
  if (r.evidenceReviewedRefs.some((e) => !evidence.has(e))) out.push("EVIDENCE_NOT_IN_INPUT");
  const sources = new Set(relevant.map((x) => x.provenance.sourceId));
  if (r.sourceRefs.some((s) => !sources.has(s)) && !out.includes("EVIDENCE_NOT_IN_INPUT")) out.push("EVIDENCE_NOT_IN_INPUT");
  if (r.priorEvaluationState !== preReviewState) out.push("PRIOR_STATE_MISMATCH");
  return out;
}

export function evaluateIsolatedROp0402(
  input: IsolatedEvaluationInput,
  ctx: IsolatedEvaluationContext,
  reviewRecord?: unknown,
): IsolatedEvaluationResult {
  const entry = diagnosticEntrySchema.parse(input.entry);
  if (input.evaluationStarted === false) {
    return isolatedEvaluationResultSchema.parse({
      contract: ISOLATED_EVALUATION_CONTRACT,
      contractVersion: ISOLATED_EVALUATION_CONTRACT_VERSION,
      environment: SYNTHETIC_ENVIRONMENT,
      ruleId: ctx.ruleId,
      technicalState: "NOT_EVALUATED",
      preReviewState: null,
      semanticState: null,
      resolvedBy: "NOT_STARTED",
      reasons: ["EVALUATION_NOT_STARTED"],
      reviewApplied: null,
      reviewRejections: reviewRecord === undefined ? [] : ["REVIEW_NOT_REQUESTED"],
      causeAttribution: { declared: input.declaredCause ?? null, affectsDecision: false },
      conditionsAutomated: 0,
      findingAuthorization: { authorizationActive: false, emissionActive: false },
      findingsEmitted: 0,
      productiveWrites: 0,
    });
  }
  const { state: preReviewState, reasons } = gate(entry, input.informationGap);

  let semanticState = preReviewState;
  let resolvedBy: "EVALUATOR_GATE" | "GOVERNED_REVIEW" = "EVALUATOR_GATE";
  let reviewApplied: string | null = null;
  let reviewRejections: ReviewRejectionReason[] = [];

  if (reviewRecord !== undefined) {
    reviewRejections = validateGovernedReview(reviewRecord, preReviewState, entry, ctx);
    if (reviewRejections.length === 0) {
      const r = governedReviewRecordSchema.parse(reviewRecord);
      semanticState = r.governedResolution;
      resolvedBy = "GOVERNED_REVIEW";
      reviewApplied = r.reviewRequestId;
    }
  }

  return isolatedEvaluationResultSchema.parse({
    contract: ISOLATED_EVALUATION_CONTRACT,
    contractVersion: ISOLATED_EVALUATION_CONTRACT_VERSION,
    environment: SYNTHETIC_ENVIRONMENT,
    ruleId: ctx.ruleId,
    preReviewState,
    semanticState,
    resolvedBy,
    reasons,
    reviewApplied,
    reviewRejections,
    causeAttribution: { declared: input.declaredCause ?? null, affectsDecision: false },
    conditionsAutomated: 0,
    findingAuthorization: { authorizationActive: false, emissionActive: false },
    findingsEmitted: 0,
    productiveWrites: 0,
  });
}
