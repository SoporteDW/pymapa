/**
 * Extensión ADITIVA y exclusiva de staging (KNOW-EXEC-08-B · Gate 02).
 *
 * Contratos D1–D4 GENÉRICOS para la representación estructural NO ejecutable
 * de una regla diagnóstica histórica en staging. No contienen literales de
 * capacidad: los valores concretos viven en los artefactos de staging
 * (`knowledge/staging/<capacidad>/`) y se verifican en las pruebas del
 * pipeline. No modifica `knowledgePackSchema`, `ruleSchema` ni el contrato de
 * candidatos de KNOW-EXEC-03: los 31 packs v1.0.0 y los candidatos existentes
 * siguen validando exactamente igual.
 *
 * Invariantes de este Build:
 * - Ninguna condición se evalúa: todo resultado diagnóstico permanece en el
 *   control técnico `NOT_EVALUATED` y los seis estados semánticos de
 *   KNOW-EXEC-05-D no se calculan.
 * - La autorización Regla–Hallazgo es un descriptor versionado con
 *   autorización y emisión INACTIVAS; los datos de autoridad pendientes se
 *   representan explícitamente como `null`, nunca inventados.
 */
import { z } from "zod";

export const STRUCTURAL_RULE_CONTRACT = "PYMAPA-STRUCTURAL-RULE-CANDIDATE" as const;
export const STRUCTURAL_RULE_CONTRACT_VERSION = "0.1.0" as const;

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
    questionId: z.string().min(1),
    /**
     * Relación documental pregunta–variables. El foco declarado NO implica
     * un binding operativo aprobado.
     */
    variableRefs: z.array(z.string().min(1)).min(1),
    focusVariableRef: z.string().min(1),
    bindingApproved: z.literal(false),
    responses: z.array(diagnosticResponseSchema),
  })
  .strict()
  .refine((e) => e.variableRefs.includes(e.focusVariableRef), {
    message: "la variable de foco debe estar entre las variables relacionadas",
  });

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

/** La suficiencia individual de una variable permanece pendiente. */
export const sufficiencyDescriptorSchema = z
  .object({
    variableRef: z.string().min(1),
    status: z.literal("PENDING"),
    note: z.string().min(1),
  })
  .strict();

export const conditionsContractSchema = z
  .object({
    ruleId: z.string().min(1),
    /** Condiciones históricas como descriptores declarativos no ejecutables. */
    conditions: z.array(conditionDescriptorSchema).min(1),
    /** Guardrail histórico asociado, preservado como no ejecutable. */
    guardrail: z.object({
      ruleId: z.string().min(1),
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
    ruleId: z.string().min(1),
    technicalState: z.literal(TECHNICAL_CONTROL_STATE),
    semanticState: z.null(),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* D4 · Autorización Regla–Hallazgo                                    */
/* ------------------------------------------------------------------ */

/**
 * Descriptor versionado de una referencia histórica Regla–Hallazgo.
 * Autorización y emisión INACTIVAS. Los datos pendientes o no autorizados
 * se representan explícitamente como `null`; nunca se inventan identidad de
 * autoridad, fecha de aprobación, versión concedida ni criterios aprobados.
 */
export const findingAuthorizationDescriptorSchema = z
  .object({
    descriptorId: z.string().min(1),
    descriptorVersion: z.string().min(1),
    ruleId: z.string().min(1),
    findingRef: z.string().min(1),
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

export const structuralRuleArtifactSchema = z
  .object({
    contract: z.literal(STRUCTURAL_RULE_CONTRACT),
    contractVersion: z.literal(STRUCTURAL_RULE_CONTRACT_VERSION),
    capabilityId: z.string().min(1),
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
export type StructuralRuleArtifact = z.infer<typeof structuralRuleArtifactSchema>;
