/**
 * @pymapa/knowledge-schema
 *
 * Schema ejecutable mínimo para cargar y validar un Knowledge Pack.
 *
 * REGLAS:
 * - Valida ESTRUCTURA e integridad referencial interna del pack.
 * - NO define ni interpreta semántica diagnóstica: no hay scoring, sufficiency,
 *   confidence, severidad, priority ni findings en este paquete.
 * - No inventa propiedades: cada campo proviene del paquete gobernado AT-04.
 */
import { z } from "zod";

/** Estados de conocimiento aprobados (Knowledge Master). */
export const KNOWLEDGE_STATES = ["KNOWN", "UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"] as const;
export const knowledgeStateSchema = z.enum(KNOWLEDGE_STATES);
export type KnowledgeState = (typeof KNOWLEDGE_STATES)[number];

/** Marca explícita para semántica ausente en el material gobernado. */
export const NOT_EXPLICIT = "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER" as const;

export const criticalitySchema = z.enum(["CRITICAL", "IMPORTANT", "COMPLEMENTARY"]);
export const evidenceLevelSchema = z.enum(["E0", "E1", "E2", "E3"]);
export const acquisitionLevelSchema = z.enum(["P1", "P2", "P3", "P4", "P5"]);
export const ruleClassificationSchema = z.enum([
  "DETERMINISTIC",
  "GOVERNED_JUDGMENT",
  "UNIMPLEMENTED_GAP",
]);

const identifiedStatement = z.object({ id: z.string().min(1), statement: z.string().min(1) });

export const variableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  criticality: criticalitySchema,
  minimumEvidence: evidenceLevelSchema,
  minimumEvidenceNote: z.string().optional(),
  /**
   * true cuando el material gobernado expresa el requisito de forma condicional
   * (p. ej. "E1/E2 depending on risk") y NO existe fórmula aprobada.
   */
  minimumEvidenceConditional: z.boolean().optional(),
  /** Niveles admisibles declarados cuando el requisito es condicional. */
  minimumEvidenceOptions: z.array(evidenceLevelSchema).min(1).optional(),
  /** Estados semánticos aprobados; null cuando el Knowledge Master no los enumera. */
  semanticStates: z.array(z.string().min(1)).min(1).nullable(),
});

export const informationNeedSchema = z.object({
  id: z.string().min(1),
  variableRefs: z.array(z.string()),
  acquisitionRefs: z.array(z.string()),
  mappingStatus: z.string().min(1),
});

export const responseModelSchema = z.object({
  kind: z.string().min(1),
  /** Un pack no puede eliminar la preservación de UNKNOWN. */
  preservesUnknown: z.literal(true),
  knowledgeStates: z.array(knowledgeStateSchema).min(1),
  semanticValuesFromVariable: z.string().optional(),
  optionSet: z.array(z.unknown()).nullable().optional(),
  optionSetStatus: z.string().optional(),
  notes: z.array(z.string()).optional(),
});

/**
 * Condición declarativa de activación. "*" significa "cualquier variable del
 * pack". El runtime la evalúa genéricamente: no conoce ninguna capacidad.
 */
export const triggerConditionSchema = z.object({
  variableRef: z.string().min(1),
  /** true exige observación registrada; false exige ausencia de observación. */
  observed: z.boolean().optional(),
  states: z.array(knowledgeStateSchema).min(1).optional(),
  semanticValues: z.array(z.string().min(1)).min(1).optional(),
});

export const triggerSchema = z.object({
  /** Transcripción del trigger aprobado. */
  statement: z.string().min(1),
  /**
   * DETERMINISTIC: el runtime lo evalúa y puede servir la adquisición.
   * NOT_DETERMINISTIC: el trigger aprobado no es expresable sobre estados de
   * variables; la adquisición queda disponible pero nunca se sirve por inferencia.
   */
  classification: z.enum(["DETERMINISTIC", "NOT_DETERMINISTIC"]),
  mode: z.enum(["ALL", "ANY"]).optional(),
  conditions: z.array(triggerConditionSchema).optional(),
});

export const acquisitionSchema = z.object({
  id: z.string().min(1),
  level: acquisitionLevelSchema,
  informationNeedRef: z.string().optional(),
  variableRefs: z.array(z.string().min(1)).min(1),
  purpose: z.string().optional(),
  question: z.string().min(1),
  /** Procedencia del enunciado cuando no es transcripción literal. */
  questionSource: z.string().optional(),
  trigger: triggerSchema.optional(),
  responseModel: responseModelSchema,
});

export const ruleSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  classification: ruleClassificationSchema,
  implemented: z.boolean(),
});

export const knowledgePackSchema = z.object({
  $schema: z.string().optional(),
  packId: z.string().min(1),
  packVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "packVersion debe ser semver x.y.z"),
  status: z.enum(["draft", "in_review", "approved", "published", "deprecated"]),
  knowledgeMaster: z.object({
    identifier: z.string().min(1),
    version: z.string().min(1),
    status: z.string().min(1),
    sourceReference: z.string().optional(),
  }),
  governanceNote: z.string().optional(),
  capability: z.object({
    id: z.string().min(1),
    domainId: z.string().min(1),
    name: z.string().min(1),
    definition: z.string().min(1),
    centralQuestion: z.string().optional(),
  }),
  conditionsOfExistence: z.array(identifiedStatement).optional(),
  conditionsNote: z.string().optional(),
  variables: z.array(variableSchema).min(1),
  criticalityNote: z.string().optional(),
  informationNeeds: z.array(informationNeedSchema).min(1),
  acquisitionLevels: z
    .array(z.object({ level: acquisitionLevelSchema, purpose: z.string() }))
    .optional(),
  acquisitions: z.array(acquisitionSchema).min(1),
  acquisitionsNote: z.string().optional(),
  evidence: z
    .object({
      levels: z.array(evidenceLevelSchema),
      escalationFactors: z.array(z.string()).optional(),
      escalationFormula: z.string().optional(),
      candidates: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            /** Referencias que el candidato puede respaldar, si el material las declara. */
            variableRefs: z.array(z.string()).optional(),
            informationNeedRefs: z.array(z.string()).optional(),
          }),
        )
        .optional(),
      candidatesNote: z.string().optional(),
    })
    .optional(),
  sufficiency: z
    .object({
      states: z.array(z.string()),
      /** Sin fórmula aprobada: debe declararse explícitamente. */
      formula: z.string(),
      closureConditions: z.array(z.string()).optional(),
      notes: z.array(z.string()).optional(),
    })
    .optional(),
  confidence: z
    .object({
      states: z.array(z.string()),
      formula: z.string(),
      factors: z.array(z.string()).optional(),
    })
    .optional(),
  rules: z.array(ruleSchema).optional(),
  contradictionHandling: z
    .object({
      referenceCase: z.unknown().optional(),
      /** Adquisiciones de aclaración declaradas por el material gobernado. */
      clarificationAcquisitionRefs: z.array(z.string()).optional(),
      /** Candidatos de evidencia admisibles para aclarar el conflicto. */
      evidenceCandidateRefs: z.array(z.string()).optional(),
      notes: z.array(z.string()).optional(),
    })
    .optional(),
  findings: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  findingsNote: z.string().optional(),
  crossCapabilityReferences: z
    .array(
      z.object({
        cause: z.string(),
        targetCapabilityId: z.string().optional(),
        targetDomainId: z.string().optional(),
        /** Una referencia cruzada nunca es ejecutable desde este pack. */
        executable: z.literal(false),
      }),
    )
    .optional(),
  knowledgeChangeCandidates: z.array(identifiedStatement).optional(),
});

export type KnowledgePack = z.infer<typeof knowledgePackSchema>;
export type KnowledgePackVariable = z.infer<typeof variableSchema>;
export type KnowledgePackAcquisition = z.infer<typeof acquisitionSchema>;
export type KnowledgePackRule = z.infer<typeof ruleSchema>;

export interface KnowledgePackValidationIssue {
  path: string;
  message: string;
}

export type KnowledgePackValidation =
  | { ok: true; pack: KnowledgePack }
  | { ok: false; issues: KnowledgePackValidationIssue[] };

/**
 * Valida estructura + integridad referencial interna del pack.
 * Genérico: no conoce OP-01 ni ninguna capacidad concreta.
 */
export function validateKnowledgePack(raw: unknown): KnowledgePackValidation {
  const parsed = knowledgePackSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }

  const pack = parsed.data;
  const issues: KnowledgePackValidationIssue[] = [];
  const variableIds = new Set(pack.variables.map((v) => v.id));
  const acquisitionIds = new Set(pack.acquisitions.map((a) => a.id));
  const needIds = new Set(pack.informationNeeds.map((n) => n.id));

  pack.acquisitions.forEach((acq, index) => {
    acq.variableRefs.forEach((ref) => {
      if (!variableIds.has(ref)) {
        issues.push({ path: `acquisitions.${index}.variableRefs`, message: `variable desconocida: ${ref}` });
      }
    });
    if (acq.informationNeedRef && !needIds.has(acq.informationNeedRef)) {
      issues.push({
        path: `acquisitions.${index}.informationNeedRef`,
        message: `information need desconocida: ${acq.informationNeedRef}`,
      });
    }
    const from = acq.responseModel.semanticValuesFromVariable;
    if (from && !variableIds.has(from)) {
      issues.push({
        path: `acquisitions.${index}.responseModel.semanticValuesFromVariable`,
        message: `variable desconocida: ${from}`,
      });
    }
    if (!acq.responseModel.knowledgeStates.includes("UNKNOWN")) {
      issues.push({
        path: `acquisitions.${index}.responseModel.knowledgeStates`,
        message: "UNKNOWN debe ser un estado registrable",
      });
    }
  });

  pack.informationNeeds.forEach((need, index) => {
    need.variableRefs.forEach((ref) => {
      if (!variableIds.has(ref)) {
        issues.push({ path: `informationNeeds.${index}.variableRefs`, message: `variable desconocida: ${ref}` });
      }
    });
    need.acquisitionRefs.forEach((ref) => {
      if (!acquisitionIds.has(ref)) {
        issues.push({
          path: `informationNeeds.${index}.acquisitionRefs`,
          message: `adquisición desconocida: ${ref}`,
        });
      }
    });
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, pack };
}

/** Lanza si el pack no es válido. Útil en el arranque del runtime. */
export function parseKnowledgePack(raw: unknown): KnowledgePack {
  const result = validateKnowledgePack(raw);
  if (!result.ok) {
    throw new Error(
      `Knowledge Pack inválido: ${result.issues.map((i) => `${i.path}: ${i.message}`).join(" | ")}`,
    );
  }
  return result.pack;
}
