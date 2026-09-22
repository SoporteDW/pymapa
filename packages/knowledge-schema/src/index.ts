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

/**
 * CONTEXT_DEPENDENT (extensión genérica M2-OP02-01): la fuente declara la
 * criticidad como propiedad contextual del caso, sin valor fijo por variable.
 * El runtime no la resuelve: no es un nivel ordenable.
 */
export const criticalitySchema = z.enum(["CRITICAL", "IMPORTANT", "COMPLEMENTARY", "CONTEXT_DEPENDENT"]);
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
  /**
   * Nivel mínimo fijo o, cuando la fuente no fija ninguno (asignación dinámica),
   * la marca NOT_EXPLICIT_IN_KNOWLEDGE_MASTER. En ese caso el requisito debe
   * ser condicional y declarar sus niveles admisibles.
   */
  minimumEvidence: z.union([evidenceLevelSchema, z.literal(NOT_EXPLICIT)]),
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
  /**
   * Identidades de finding aprobadas (H01–H08). El pack declara polaridad,
   * reglas y variables involucradas; NUNCA severidad numérica ni priority.
   */
  findings: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        polarity: z.enum(["ADVERSE", "STRENGTH"]).optional(),
        ruleRefs: z.array(z.string().min(1)).optional(),
        variableRefs: z.array(z.string().min(1)).optional(),
        /** Severidad cualitativa o la marca explícita de ausencia. */
        severity: z.string().optional(),
        mappingStatus: z.string().optional(),
      }),
    )
    .optional(),
  findingsNote: z.string().optional(),
  /** Identidades R01–R09. El contenido puede no estar explícito. */
  recommendations: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().nullable().optional(),
        contentStatus: z.string().min(1),
        findingRefs: z.array(z.string().min(1)).optional(),
        mappingStatus: z.string().min(1),
      }),
    )
    .optional(),
  recommendationsNote: z.string().optional(),
  /** Identidades A01–A09. Los mapeos Finding→Activity son candidatos. */
  activities: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().nullable().optional(),
        contentStatus: z.string().min(1),
        mappingStatus: z.string().min(1),
      }),
    )
    .optional(),
  activitiesNote: z.string().optional(),
  /**
   * CRV (ValidationRequirement): requisitos de validación explícitamente
   * aprobados. Solo existen los que el Knowledge Master enuncia; una Activity
   * sin CRV explícito queda como gap trazable, jamás con un CRV inventado.
   * `formula` es literal NOT_A_SCORE: un CRV no es un KPI ni un maturity score.
   */
  validationRequirements: z
    .array(
      z.object({
        id: z.string().min(1),
        activityRef: z.string().min(1),
        definition: z.string().min(1),
        definitionSource: z.string().min(1),
        formula: z.literal("NOT_A_SCORE"),
        conditions: z
          .array(
            z.object({
              id: z.string().min(1),
              kind: z.enum([
                "DISTINCT_SECOND_EXECUTOR",
                "CONSECUTIVE_CORRECT_CASES",
                "NO_CRITICAL_ASSISTANCE",
              ]),
              statement: z.string().min(1),
              requiredCount: z.number().int().positive().optional(),
            }),
          )
          .min(1),
        notes: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  validationRequirementsNote: z.string().optional(),
  /** Minimum Sufficient Intervention: principio, nunca fórmula. */
  interventionPrinciple: z
    .object({
      id: z.string().min(1),
      statement: z.string().min(1),
      formula: z.string().min(1),
      ruleRefs: z.array(z.string().min(1)).optional(),
      notes: z.array(z.string()).optional(),
    })
    .optional(),
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
    if (acq.trigger) {
      const conditions = acq.trigger.conditions ?? [];
      if (acq.trigger.classification === "DETERMINISTIC" && conditions.length === 0) {
        issues.push({
          path: `acquisitions.${index}.trigger.conditions`,
          message: "un trigger DETERMINISTIC exige al menos una condición evaluable",
        });
      }
      conditions.forEach((cond, ci) => {
        if (cond.variableRef !== "*" && !variableIds.has(cond.variableRef)) {
          issues.push({
            path: `acquisitions.${index}.trigger.conditions.${ci}.variableRef`,
            message: `variable desconocida: ${cond.variableRef}`,
          });
        }
      });
    }
  });

  pack.variables.forEach((variable, index) => {
    if (variable.minimumEvidenceConditional && !variable.minimumEvidenceOptions) {
      issues.push({
        path: `variables.${index}.minimumEvidenceOptions`,
        message: "un requisito de evidencia condicional debe declarar sus niveles admisibles",
      });
    }
    if (variable.minimumEvidence === NOT_EXPLICIT && !variable.minimumEvidenceConditional) {
      issues.push({
        path: `variables.${index}.minimumEvidenceConditional`,
        message:
          "un nivel mínimo de evidencia no explícito debe declararse como requisito condicional con niveles admisibles",
      });
    }
  });

  (pack.contradictionHandling?.clarificationAcquisitionRefs ?? []).forEach((ref, index) => {
    if (!acquisitionIds.has(ref)) {
      issues.push({
        path: `contradictionHandling.clarificationAcquisitionRefs.${index}`,
        message: `adquisición desconocida: ${ref}`,
      });
    }
  });

  const ruleIds = new Set((pack.rules ?? []).map((r) => r.id));
  (pack.findings ?? []).forEach((finding, index) => {
    (finding.ruleRefs ?? []).forEach((ref) => {
      if (!ruleIds.has(ref)) {
        issues.push({ path: `findings.${index}.ruleRefs`, message: `regla desconocida: ${ref}` });
      }
    });
    (finding.variableRefs ?? []).forEach((ref) => {
      if (!variableIds.has(ref)) {
        issues.push({ path: `findings.${index}.variableRefs`, message: `variable desconocida: ${ref}` });
      }
    });
    // Ninguna severidad puede ser numérica: no existe algoritmo aprobado.
    if (finding.severity && /^\d+(\.\d+)?$/.test(finding.severity)) {
      issues.push({
        path: `findings.${index}.severity`,
        message: "la severidad no puede ser numérica: no existe algoritmo aprobado",
      });
    }
  });

  const findingIds = new Set((pack.findings ?? []).map((f) => f.id));
  (pack.recommendations ?? []).forEach((rec, index) => {
    (rec.findingRefs ?? []).forEach((ref) => {
      if (!findingIds.has(ref)) {
        issues.push({ path: `recommendations.${index}.findingRefs`, message: `finding desconocido: ${ref}` });
      }
    });
  });

  (pack.interventionPrinciple?.ruleRefs ?? []).forEach((ref, index) => {
    if (!ruleIds.has(ref)) {
      issues.push({
        path: `interventionPrinciple.ruleRefs.${index}`,
        message: `regla desconocida: ${ref}`,
      });
    }
  });

  // CRV: identidad única, actividad conocida y condiciones bien formadas.
  const activityIds = new Set((pack.activities ?? []).map((a) => a.id));
  const crvIds = new Set<string>();
  (pack.validationRequirements ?? []).forEach((crv, index) => {
    if (crvIds.has(crv.id)) {
      issues.push({ path: `validationRequirements.${index}.id`, message: `CRV duplicado: ${crv.id}` });
    }
    crvIds.add(crv.id);
    if (!activityIds.has(crv.activityRef)) {
      issues.push({
        path: `validationRequirements.${index}.activityRef`,
        message: `actividad desconocida: ${crv.activityRef}`,
      });
    }
    crv.conditions.forEach((condicion, i) => {
      if (condicion.kind === "CONSECUTIVE_CORRECT_CASES" && !condicion.requiredCount) {
        issues.push({
          path: `validationRequirements.${index}.conditions.${i}.requiredCount`,
          message: "una condición de casos consecutivos debe declarar cuántos exige",
        });
      }
    });
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
