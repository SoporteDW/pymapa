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

type SemanticState = IsolatedEvaluationResult["semanticState"];

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
  /** Atribución causal declarada por la fuente; nunca entra en D3. */
  declaredCause?: string | null;
}

const REVIEWABLE: readonly SemanticState[] = ["GOVERNED_REVIEW_REQUIRED", "CONFLICTING_INFORMATION"];

function gate(entry: DiagnosticEntry): { state: SemanticState; reasons: string[] } {
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
  if (only === "NOT_APPLICABLE")
    return { state: "NOT_APPLICABLE", reasons: ["DECLARED_NOT_APPLICABLE_KNOWLEDGE_STATE"] };
  if (rs.some((r) => r.evidenceRefs.length === 0))
    return {
      state: "INSUFFICIENT_EVIDENCE",
      reasons: ["KNOWN_WITHOUT_EVIDENCE_IS_NOT_SUFFICIENCY", `FOCUS_SUFFICIENCY_PENDING:${entry.focusVariableRef}`],
    };
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
  if (r.targetVersion !== ctx.targetVersion && !out.includes("VERSION_MISMATCH")) out.push("VERSION_MISMATCH");
  const now = Date.parse(ctx.now);
  if (Date.parse(r.validUntil) < now || Date.parse(r.reviewedAt) > Date.parse(r.validUntil)) out.push("EXPIRED");
  const evidence = new Set(entry.responses.flatMap((x) => x.evidenceRefs));
  if (r.evidenceReviewedRefs.some((e) => !evidence.has(e))) out.push("EVIDENCE_NOT_IN_INPUT");
  if (r.priorEvaluationState !== preReviewState) out.push("PRIOR_STATE_MISMATCH");
  return out;
}

export function evaluateIsolatedROp0402(
  input: IsolatedEvaluationInput,
  ctx: IsolatedEvaluationContext,
  reviewRecord?: unknown,
): IsolatedEvaluationResult {
  const entry = diagnosticEntrySchema.parse(input.entry);
  const { state: preReviewState, reasons } = gate(entry);

  let semanticState = preReviewState;
  let resolvedBy: IsolatedEvaluationResult["resolvedBy"] = "EVALUATOR_GATE";
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
