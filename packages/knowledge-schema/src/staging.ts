/**
 * Extensión ADITIVA y opcional (KNOW-EXEC-03 · Bloque A).
 *
 * Contrato de "candidato de traducción diagnóstica" para staging. No modifica
 * `knowledgePackSchema` ni `ruleSchema`: los 31 packs v1.0.0 siguen validando
 * exactamente igual. Un candidato NUNCA es ejecutable: los literales
 * `executable: false`, `emissionApproved: false` y `bindingApproved: false`
 * son obligatorios, de modo que un artefacto que pretenda lo contrario falla.
 */
import { z } from "zod";

export const STAGING_CANDIDATE_CONTRACT = "PYMAPA-DIAGNOSTIC-TRANSLATION-CANDIDATE" as const;
export const STAGING_CANDIDATE_CONTRACT_VERSION = "0.1.0" as const;

export const RULE_ROLES = ["DIAGNOSTIC_HISTORICAL", "GUARDRAIL"] as const;
export const HF_LINK_KINDS = ["DOCUMENTAL_REFERENCE", "NONE_IDENTIFIED"] as const;

const sourceRefSchema = z.object({
  baselinePath: z.string().min(1),
  objectKey: z.string().min(1),
  sourceLines: z.tuple([z.number().int(), z.number().int()]),
});

export const stagingRuleCandidateSchema = z
  .object({
    ruleId: z.string().min(1),
    role: z.enum(RULE_ROLES),
    title: z.string().min(1),
    /** Texto histórico íntegro, copiado literal del baseline canónico. */
    historicalText: z.string().min(1),
    sourceRef: sourceRefSchema,
    /** Referencias documentales (no binding): CE/VA/HF tal como las declara la matriz. */
    conditionRefs: z.array(z.string()),
    variableRefs: z.array(z.string()),
    hfReferences: z.array(z.string()),
    hfLinkKind: z.enum(HF_LINK_KINDS),
    composite: z.boolean(),
    restrictions: z.string(),
    exceptionRefs: z.array(z.string()),
    /** Invariantes: nunca ejecutable en staging. */
    predicate: z.null(),
    executable: z.literal(false),
    bindingApproved: z.literal(false),
    emissionApproved: z.literal(false),
  })
  .strict();

export const stagingExceptionSchema = z
  .object({
    exceptionId: z.string().min(1),
    scope: z.string(),
    kind: z.enum(["PATTERN", "PARTICULAR", "TEXT_DIVERGENCE", "MISSING_SOURCE", "ACQUISITION"]),
    ruleIds: z.array(z.string()),
    description: z.string(),
    authority: z.string(),
    status: z.literal("PENDING"),
  })
  .strict();

export const stagingCandidateSchema = z
  .object({
    contract: z.literal(STAGING_CANDIDATE_CONTRACT),
    contractVersion: z.literal(STAGING_CANDIDATE_CONTRACT_VERSION),
    capabilityId: z.string().min(1),
    status: z.literal("STAGING_CANDIDATE_NOT_EXECUTABLE"),
    publicationAuthorized: z.literal(false),
    provenance: z.object({
      baselinePath: z.string(),
      baselineChecksum: z.string(),
      historicalVersion: z.string(),
      semanticInputId: z.string(),
      semanticInputSha256: z.string(),
      publishedPackPath: z.string(),
      publishedPackChecksum: z.string(),
    }),
    rules: z.array(stagingRuleCandidateSchema),
    exceptions: z.array(stagingExceptionSchema),
    counts: z.object({
      rules: z.number().int(),
      diagnostic: z.number().int(),
      guardrails: z.number().int(),
      withHfReference: z.number().int(),
      composite: z.number().int(),
      exceptions: z.number().int(),
      executable: z.literal(0),
      emitted: z.literal(0),
    }),
    checksum: z.string(),
  })
  .strict();

export type StagingRuleCandidate = z.infer<typeof stagingRuleCandidateSchema>;
export type StagingException = z.infer<typeof stagingExceptionSchema>;
export type StagingCandidate = z.infer<typeof stagingCandidateSchema>;
