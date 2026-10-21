import { z } from "zod";

export const CONTRACT_ID = "PRESC-OP01-H04";
export const CONTRACT_VERSION = "0.3.0";
export const CONDITION_IDS = ["C1", "C2", "C3", "C4", "C5", "C6"] as const;
export const RECOMMENDATION_ID = "PRESC-OP01-H04-REC-01";
/** Approved content is retained internally; it is never an end-user emission. */
export const RECOMMENDATION = {
  id: RECOMMENDATION_ID,
  title: "Asegurar la continuidad del proceso mediante transferencia focalizada del conocimiento crítico y respaldo operativo mínimo.",
  template: "En [proceso], la continuidad o calidad depende materialmente de [rol o función clave] para [actividad/decisión]. La evidencia [referencias] indica [consecuencia]. Como la causa predominante es una dependencia de conocimiento transferible y existe respaldo viable, se propone transferir únicamente los pasos, decisiones y excepciones indispensables a un ejecutor alterno autorizado y comprobar su ejecución independiente mediante [criterio ajustado al riesgo]. Registrar responsable, incertidumbre residual y fecha de revisión. No adoptar software ni documentación extensa sin necesidad demostrada",
};
export const ACTIVITIES = [
  ["ACT-01", "Delimitar punto crítico, caso representativo, titular y suplente.", "Ficha con impacto y responsables."],
  ["ACT-02", "Capturar secuencia mínima, decisiones, excepciones, criterios de calidad y requisitos de acceso.", "Guía breve validada, sin compartir credenciales."],
  ["ACT-03", "Transferir con demostración y práctica supervisada a persona legítimamente autorizada.", "Registro de práctica, competencia y permisos."],
  ["ACT-04", "Probar ejecución autónoma de casos representativos y excepción relevante, según criticidad.", "Evidencia de resultado, errores y correcciones; independencia de asistencia crítica."],
  ["ACT-05", "Asignar custodia y revisión ante rotación, cambios o incidentes.", "Responsable, disparadores y registro de vigencia."],
].map(([id, title, acceptance]) => ({ id: `${CONTRACT_ID}-${id}`, title, acceptance }));

export const CONDITION_DEFINITIONS = {
  C1: "Proceso relevante delimitado: nombre, resultado, ejecución habitual, actividad crítica y contexto.",
  C2: "Dependencia concentrada y sustitución difícil: tareas/decisiones no cubiertas, ejecutor clave, prueba de respaldo o incidente/ausencia.",
  C3: "Impacto material plausible u observado con nexo causal sobre continuidad, calidad, cliente, plazo, seguridad o cumplimiento.",
  C4: "Diagnóstico diferencial suficiente: accesos, dotación, competencias, diseño, documentación y coordinación examinados.",
  C5: "Evidencia suficiente, vigente y no contradictoria: E1 histórico y corroboración proporcional al riesgo, fecha, procedencia y calidad.",
  C6: "Transferencia y suplencia factibles, legítimas y mínimamente suficientes: suplente viable, permisos, confidencialidad y prueba realizable.",
};
const condition = z.object({
  state: z.enum(["TRUE", "FALSE", "UNKNOWN", "CONTRADICTORY", "NOT_APPLICABLE"]),
  evidenceRefs: z.array(z.string().uuid()),
  justification: z.string().trim().min(1),
}).strict();
export const prescriptionInputSchema = z.object({
  requestId: z.string().uuid(), assessmentId: z.string().uuid(), findingId: z.string().uuid(),
  priorDecisionRef: z.string().uuid().nullable(),
  trigger: z.enum(["INITIAL_REVIEW", "NEW_EVIDENCE", "ROLE_CHANGE", "PROCESS_CHANGE", "INCIDENT", "SCHEDULED_REVIEW", "VALIDATION_FAILED", "SUSPEND"]),
  conditions: z.object({ C1: condition, C2: condition, C3: condition, C4: condition, C5: condition, C6: condition }).strict(),
  processContext: z.object({ processId: z.string().min(1), name: z.string().min(1), dependency: z.string().min(1),
    impact: z.string().min(1), validUntil: z.string().datetime(), substituteRole: z.string().min(1),
    proposedActivity: z.string().min(1), validationCriterion: z.string().min(1), uncertainty: z.string().min(1) }).partial().strict(),
  causalAssessment: z.enum(["TRANSFERABLE_KNOWLEDGE", "CONTINUITY_COVERED", "ACCESS", "STAFFING", "PROCESS_ROLES", "COMPETENCE", "OUTDATED_DOCUMENT", "MIXED", "UNKNOWN"]),
  differential: z.object({ access: z.string().min(1), staffing: z.string().min(1), competence: z.string().min(1),
    design: z.string().min(1), documentation: z.string().min(1), coordination: z.string().min(1) }).partial().strict(),
  contraindications: z.array(z.enum(["CONFIDENTIALITY_REGULATION", "ILLEGITIMATE_ACCESS", "UNQUALIFIED_SUBSTITUTE", "UNRESOLVED_CONFLICT", "OUT_OF_SCOPE_CAUSE", "STALE_H04", "IMMEDIATE_DANGER"])),
}).strict();
export type PrescriptionInput = z.infer<typeof prescriptionInputSchema>;
export type SemanticDecision = "RECOMMEND_CANDIDATE" | "REQUEST_INFO" | "ABSTAIN_ESCALATE" | "PRESERVE_MONITOR";
export interface VerifiedContext {
  actor: string; now: string; findingSupported: boolean; admittedEvidenceIds: string[];
  previous?: { id: string; lifecycleState: string; emissionDecision: string };
  contentApproval?: { state: "DRAFT" | "GOVERNMENT_APPROVED"; id: string | null };
}

/** Server-owned operation: human judgments are never inferred from document text. */
export function evaluatePrescription(input: PrescriptionInput, context: VerifiedContext) {
  const admitted = new Set(context.admittedEvidenceIds);
  const conditions = Object.fromEntries(CONDITION_IDS.map((id) => {
    const c = input.conditions[id];
    const verified = c.evidenceRefs.length > 0 && c.evidenceRefs.every((ref) => admitted.has(ref));
    return [id, { ...c, state: c.state === "TRUE" && !verified ? "UNKNOWN" : c.state,
      evaluatedBy: context.actor, evaluatedAt: context.now,
      evidenceVerified: verified }];
  })) as Record<typeof CONDITION_IDS[number], z.infer<typeof condition> & { evaluatedBy: string; evaluatedAt: string; evidenceVerified: boolean }>;
  const missingInfo = CONDITION_IDS.filter((id) => conditions[id].state === "UNKNOWN");
  const fields = ["processId", "name", "dependency", "impact", "validUntil", "substituteRole", "proposedActivity", "validationCriterion", "uncertainty"] as const;
  const missingFields = fields.filter((key) => !input.processContext[key]);
  const differentialMissing = ["access", "staffing", "competence", "design", "documentation", "coordination"].filter((key) => !input.differential[key as keyof typeof input.differential]);
  const reasons: string[] = [];
  let semanticDecision: SemanticDecision = "REQUEST_INFO";
  const conflict = CONDITION_IDS.some((id) => conditions[id].state === "CONTRADICTORY");
  const requiresReassessment = ["ROLE_CHANGE", "PROCESS_CHANGE", "VALIDATION_FAILED"].includes(input.trigger);
  const expired = Boolean(input.processContext.validUntil && Date.parse(input.processContext.validUntil) <= Date.parse(context.now));
  if (conflict || input.contraindications.length || expired || input.trigger === "SUSPEND" || requiresReassessment) {
    semanticDecision = "ABSTAIN_ESCALATE"; reasons.push(conflict ? "CONCILIATION_REQUIRED" : "CONTRAINDICATION_OR_SUSPENSION");
  } else if (conditions.C1.state === "TRUE" && (conditions.C3.state === "FALSE"
    || (input.causalAssessment === "CONTINUITY_COVERED" && conditions.C2.state === "FALSE"))) {
    semanticDecision = "PRESERVE_MONITOR"; reasons.push("CONTINUITY_COVERED_OR_MITIGATED");
  } else if (CONDITION_IDS.some((id) => ["FALSE", "NOT_APPLICABLE"].includes(conditions[id].state))
    || !["TRANSFERABLE_KNOWLEDGE", "UNKNOWN"].includes(input.causalAssessment)) {
    semanticDecision = "ABSTAIN_ESCALATE"; reasons.push("MANDATORY_CONDITION_OR_ALTERNATIVE_CAUSE");
  } else if (!context.findingSupported || missingInfo.length || missingFields.length || differentialMissing.length || input.causalAssessment === "UNKNOWN") {
    reasons.push("INFORMATION_OR_CURRENT_SUPPORT_REQUIRED");
  } else {
    semanticDecision = "RECOMMEND_CANDIDATE"; reasons.push("H04_AND_SIX_GOVERNED_CONDITIONS_SUPPORTED");
  }
  const invalidating = semanticDecision !== "RECOMMEND_CANDIDATE" || ["ROLE_CHANGE", "PROCESS_CHANGE", "VALIDATION_FAILED", "SUSPEND"].includes(input.trigger);
  const lifecycleState = (context.previous && invalidating) || requiresReassessment || input.trigger === "SUSPEND" ? "SUSPENDED" : "EVALUATED";
  return {
    contractId: CONTRACT_ID, contractVersion: CONTRACT_VERSION, findingId: input.findingId,
    semanticDecision, semanticReasonCodes: reasons, conditions,
    alternativeRoute: semanticDecision === "ABSTAIN_ESCALATE" ? ({ ACCESS: "ACCESS_CONTROL", STAFFING: "RESOURCE_PLANNING", PROCESS_ROLES: "PROCESS_ROLE_REVIEW", COMPETENCE: "COMPETENCE_REVIEW", OUTDATED_DOCUMENT: "DOCUMENT_REVIEW" } as Record<string,string>)[input.causalAssessment] ?? "COMPETENT_HUMAN_REVIEW" : null,
    reconciliationRequests: conflict ? CONDITION_IDS.filter(id=>conditions[id].state === "CONTRADICTORY").map(id=>({conditionId:id,evidenceRefs:conditions[id].evidenceRefs,request:"Conciliar fuentes contradictorias mediante revisión humana antes de reevaluar."})) : [],
    conditionEvidenceRefs: Object.fromEntries(CONDITION_IDS.map((id) => [id, conditions[id].evidenceRefs])),
    missingInfo: missingInfo.map((id) => ({ conditionId: id, request: CONDITION_DEFINITIONS[id] })), missingFields, differentialMissing,
    causalAssessment: input.causalAssessment, contraindications: input.contraindications, processContext: input.processContext,
    uncertainty: input.processContext.uncertainty ?? "Información pendiente de revisión humana",
    contentApprovalState: context.contentApproval?.state ?? "GOVERNMENT_APPROVED",
    contentApprovalId: context.contentApproval?.id === undefined ? "DEC-046" : context.contentApproval.id,
    technicalAuthorizationState: "VERIFIED", technicalVerificationRef: "DEC-046-T01-T12", implementationAuthorizationId: "DEC-046",
    activationApprovalId: null, publicationState: "UNPUBLISHED", emissionDecision: "BLOCKED" as const,
    gateFailures: ["ACTIVATION_EMISSION_NOT_AUTHORIZED", "UNPUBLISHED", "STAGE_EMISSION_LOCK"],
    recommendationId: semanticDecision === "RECOMMEND_CANDIDATE" ? RECOMMENDATION_ID : null,
    activityIds: semanticDecision === "RECOMMEND_CANDIDATE" ? ACTIVITIES.map((a) => a.id) : [],
    lifecycleState, oldState: context.previous?.lifecycleState ?? null, newState: lifecycleState,
    priorDecisionRef: context.previous?.id ?? null, trigger: input.trigger, actor: context.actor, timestamps: { evaluatedAt: context.now },
    versionRefs: { master: "1.0", pack: "OP-01/1.0.0", engine: "0.2.0", finding: "H04", variable: "VA07" },
  };
}

export function assertPrescriptionRole(role: string | null) {
  if (role !== "OWNER" && role !== "ADMIN") throw new Error("PRESCRIPTION_ROLE_FORBIDDEN");
}