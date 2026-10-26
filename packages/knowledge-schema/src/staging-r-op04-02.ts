/**
 * Extensión ADITIVA y exclusiva de staging (KNOW-EXEC-08-B · Gate 02).
 *
 * Contratos D1–D4 para la representación estructural NO ejecutable de
 * R-OP04-02 (OP-04). No modifica `knowledgePackSchema`, `ruleSchema` ni el
 * contrato de candidatos de KNOW-EXEC-03: los 31 packs v1.0.0 y los
 * candidatos existentes siguen validando exactamente igual.
 *
 * Invariantes de este Build:
 * - Ninguna condición se evalúa: todo resultado diagnóstico permanece en el
 *   control técnico `NOT_EVALUATED` y los seis estados semánticos de
 *   KNOW-EXEC-05-D no se calculan.
 * - La autorización Regla–Hallazgo R-OP04-02 → OP04-HF02 es un descriptor
 *   versionado con autorización y emisión INACTIVAS; los datos de autoridad
 *   pendientes se representan explícitamente como `null`, nunca inventados.
 */
import { z } from "zod";

export const R_OP04_02_STRUCTURAL_CONTRACT = "PYMAPA-R-OP04-02-STRUCTURAL" as const;
export const R_OP04_02_STRUCTURAL_CONTRACT_VERSION = "0.1.0" as const;

/* ------------------------------------------------------------------ */
/* D1 · Entrada diagnóstica                                            */
/* ------------------------------------------------------------------ */

/** Estados de conocimiento vigentes; su semántica no se altera. */
export const KNOWLEDGE_STATES = ["KNOWN", "UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"] as const;
export const knowledgeStateSchema = z.enum(KNOWLEDGE_STATES);

export const diagnosticResponseSchema = z
  .object({
    questionId: z.string().min(1),
    knowledgeState: knowledgeStateSchema,
    /** Referencias de evidencia aportadas; pueden estar vacías. */
    evidenceRefs: z.array(z.string()),
    /** Procedencia de la respuesta (fuente y localizador). */
    provenance: z.object({
      sourceId: z.string().min(1),
      locator: z.string().min(1),
    }),
  })
  .strict();

export const diagnosticEntrySchema = z
  .object({
    questionId: z.literal("P1-OP04-02"),
    /**
     * Relación documental con las cinco variables históricas
     * (VA01, VA02, VA04, VA05, VA07). El foco VA02 NO implica un binding
     * operativo aprobado.
     */
    variableRefs: z
      .array(z.string())
      .length(5)
      .refine((v) => [...v].sort().join(",") === ["VA01", "VA02", "VA04", "VA05", "VA07"].join(","), {
        message: "P1-OP04-02 se relaciona documentalmente con VA01, VA02, VA04, VA05 y VA07",
      }),
    focusVariableRef: z.literal("VA02"),
    bindingApproved: z.literal(false),
    responses: z.array(diagnosticResponseSchema),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* D2 · Condiciones y suficiencia                                      */
/* ------------------------------------------------------------------ */

/**
 * Descriptor declarativo NO ejecutable de una condición histórica.
 * Sin umbrales, predicados ni criterios inferidos.
 */
export const conditionDescriptorSchema = z
  .object({
    conditionId: z.string().min(1),
    historicalText: z.string().min(1),
    sourceRef: z.object({
      baselinePath: z.string().min(1),
      objectKey: z.string().min(1),
      sourceLines: z.tuple([z.number().int(), z.number().int()]),
    }),
    executable: z.literal(false),
    predicate: z.null(),
    threshold: z.null(),
  })
  .strict();

/** La suficiencia individual de VA02 permanece pendiente. */
export const sufficiencyDescriptorSchema = z
  .object({
    variableRef: z.literal("VA02"),
    status: z.literal("PENDING"),
    note: z.string().min(1),
  })
  .strict();

export const conditionsContractSchema = z
  .object({
    ruleId: z.literal("R-OP04-02"),
    /** Las cuatro condiciones históricas, en orden. */
    conditions: z.array(conditionDescriptorSchema).length(4),
    /** Guardrail histórico R-OP04-02A, preservado como no ejecutable. */
    guardrail: z.object({
      ruleId: z.literal("R-OP04-02A"),
      historicalText: z.string().min(1),
      executable: z.literal(false),
    }),
    sufficiency: sufficiencyDescriptorSchema,
  })
  .strict();

/* ------------------------------------------------------------------ */
/* D3 · Estados de decisión                                            */
/* ------------------------------------------------------------------ */

/** Los seis estados semánticos de KNOW-EXEC-05-D. */
export const SEMANTIC_DECISION_STATES = [
  "CONDITION_SATISFIED",
  "CONDITION_NOT_SATISFIED",
  "INSUFFICIENT_EVIDENCE",
  "CONFLICTING_INFORMATION",
  "NOT_APPLICABLE",
  "GOVERNED_REVIEW_REQUIRED",
] as const;
export const semanticDecisionStateSchema = z.enum(SEMANTIC_DECISION_STATES);

/** Control técnico adicional, separado conceptualmente de los seis estados. */
export const TECHNICAL_CONTROL_STATE = "NOT_EVALUATED" as const;

/**
 * Resultado estructural de este Build: la evaluación está prohibida, así que
 * el estado semántico es siempre `null` y el control técnico siempre
 * `NOT_EVALUATED`. Un artefacto que afirme un estado semántico falla.
 */
export const structuralDecisionResultSchema = z
  .object({
    ruleId: z.literal("R-OP04-02"),
    technicalState: z.literal(TECHNICAL_CONTROL_STATE),
    semanticState: z.null(),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* D4 · Autorización Regla–Hallazgo                                    */
/* ------------------------------------------------------------------ */

/**
 * Descriptor versionado de la referencia histórica R-OP04-02 → OP04-HF02.
 * Autorización y emisión INACTIVAS. Los datos pendientes o no autorizados
 * se representan explícitamente como `null`; nunca se inventan identidad de
 * autoridad, fecha de aprobación, versión concedida ni criterios aprobados.
 */
export const findingAuthorizationDescriptorSchema = z
  .object({
    descriptorId: z.string().min(1),
    descriptorVersion: z.string().min(1),
    ruleId: z.literal("R-OP04-02"),
    findingRef: z.literal("OP04-HF02"),
    linkKind: z.literal("DOCUMENTAL_REFERENCE"),
    authorizationActive: z.literal(false),
    emissionActive: z.literal(false),
    authority: z.null(),
    approvalDate: z.null(),
    grantedVersion: z.null(),
    approvedCriteria: z.null(),
    pendingReasons: z.array(z.string()).min(1),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* Artefacto estructural completo                                      */
/* ------------------------------------------------------------------ */

export const rOp0402StructuralArtifactSchema = z
  .object({
    contract: z.literal(R_OP04_02_STRUCTURAL_CONTRACT),
    contractVersion: z.literal(R_OP04_02_STRUCTURAL_CONTRACT_VERSION),
    capabilityId: z.literal("OP-04"),
    status: z.literal("STRUCTURAL_CANDIDATE_NOT_EXECUTABLE"),
    entry: diagnosticEntrySchema,
    conditions: conditionsContractSchema,
    decision: structuralDecisionResultSchema,
    findingAuthorization: findingAuthorizationDescriptorSchema,
    /** Invariantes globales del Build. */
    rulesExecuted: z.literal(0),
    findingsEmitted: z.literal(0),
  })
  .strict();

export type DiagnosticResponse = z.infer<typeof diagnosticResponseSchema>;
export type DiagnosticEntry = z.infer<typeof diagnosticEntrySchema>;
export type ConditionDescriptor = z.infer<typeof conditionDescriptorSchema>;
export type ConditionsContract = z.infer<typeof conditionsContractSchema>;
export type StructuralDecisionResult = z.infer<typeof structuralDecisionResultSchema>;
export type FindingAuthorizationDescriptor = z.infer<typeof findingAuthorizationDescriptorSchema>;
export type ROp0402StructuralArtifact = z.infer<typeof rOp0402StructuralArtifactSchema>;
