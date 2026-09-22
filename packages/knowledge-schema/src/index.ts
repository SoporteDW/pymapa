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

/* ------------------------------------------------------------------ */
/* Extensiones genéricas M2 runtime closure (capability-neutral)               */
/* ------------------------------------------------------------------ */

/**
 * Modo de resolución de una propiedad gobernada (criticidad, requisito de
 * evidencia, severidad, confianza, contexto).
 * - FIXED: la fuente fija el valor; el runtime lo usa tal cual.
 * - CONTEXTUAL: la fuente declara la propiedad como dependiente del caso; el
 *   runtime NUNCA la resuelve ni la adivina (ni él ni un LLM): exige juicio
 *   gobernado registrado.
 * - NOT_EXPLICIT: la fuente guarda silencio; el runtime lo preserva.
 */
export const PROPERTY_RESOLUTION_MODES = ["FIXED", "CONTEXTUAL", "NOT_EXPLICIT"] as const;
export const propertyResolutionModeSchema = z.enum(PROPERTY_RESOLUTION_MODES);
export type PropertyResolutionMode = (typeof PROPERTY_RESOLUTION_MODES)[number];

/** Nivel gobernado (S0–S3, C0–C3, AC0–AC3…). Estado cualitativo, nunca número. */
const governedLevelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  definition: z.string().min(1).optional(),
});

/** Regla gobernada enunciada. `id` null cuando la fuente no le asigna identificador. */
const governedStatementSchema = z.object({
  id: z.string().min(1).nullable(),
  name: z.string().min(1).optional(),
  statement: z.string().min(1),
});

/** Dueño gobernado de un CRV: no todo CRV pertenece a una Activity. */
export const VALIDATION_REQUIREMENT_OWNER_KINDS = [
  "ACTIVITY",
  "INTERVENTION_PATTERN",
  "DELIVERABLE",
] as const;

/**
 * Condiciones de CRV. Las tres primeras son determinísticas (M1-KL). Las dos
 * últimas (M2 runtime closure) expresan condiciones cuyo cumplimiento exige juicio
 * humano registrado: el runtime nunca las da por satisfechas.
 */
export const VALIDATION_CONDITION_KINDS = [
  "DISTINCT_SECOND_EXECUTOR",
  "CONSECUTIVE_CORRECT_CASES",
  "NO_CRITICAL_ASSISTANCE",
  "GOVERNED_STATEMENT",
  "JUSTIFYING_CONDITION_REFERENCE",
] as const;
export const DETERMINISTIC_VALIDATION_CONDITION_KINDS = [
  "DISTINCT_SECOND_EXECUTOR",
  "CONSECUTIVE_CORRECT_CASES",
  "NO_CRITICAL_ASSISTANCE",
] as const;

export const interventionPatternSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  objective: z.string().min(1).optional(),
  purpose: z.string().min(1).optional(),
  instruments: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).optional(),
  deliverables: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        instrumentRef: z.string().min(1).optional(),
      }),
    )
    .optional(),
  /** Actividades mínimas literales. Sin IDs cuando la fuente no los da. */
  minimumActivities: z.array(z.string().min(1)).optional(),
  /**
   * Done Criteria del patrón. `id` null cuando la fuente no los identifica: el
   * runtime los direcciona por posición (1..n), nunca inventa un identificador.
   */
  doneCriteria: z
    .array(z.object({ id: z.string().min(1).nullable(), statement: z.string().min(1) }))
    .optional(),
  identifierNote: z.string().optional(),
});

export const implementationModelSchema = z.object({
  doneLayers: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        definition: z.string().min(1),
        /** La definición literal exige evidencia de uso real (p. ej. adopción). */
        requiresEvidence: z.boolean().optional(),
      }),
    )
    .min(1),
  executionStates: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        definition: z.string().min(1),
        /** Estado que la fuente denomina "implementado". */
        implemented: z.boolean(),
        /** Capas de Done que la fuente exige para este estado. */
        requiresDoneLayerRefs: z.array(z.string().min(1)).optional(),
        /** La fuente exige cumplir todos los Done Criteria del patrón. */
        requiresAllDoneCriteria: z.boolean().optional(),
        basis: z.string().min(1).optional(),
      }),
    )
    .min(1),
  rules: z.array(governedStatementSchema).optional(),
  /** Invariantes: Done ≠ CRV ≠ Validation ≠ Effectiveness. */
  doneImpliesValidationRequirement: z.literal(false),
  doneImpliesEffectiveness: z.literal(false),
});

export const effectivenessModelSchema = z.object({
  states: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        definition: z.string().min(1),
        /** El estado solo es admisible si la intervención alcanzó el estado implementado. */
        presupposesImplementation: z.boolean(),
        /** Juicio de CRV que la definición literal del estado exige. */
        requiresValidationRequirement: z.enum(["SATISFIED", "NOT_SATISFIED"]).optional(),
        /** Estado concluyente: exige evidencia registrada (no basta el tiempo transcurrido). */
        requiresEvidence: z.boolean().optional(),
        basis: z.string().min(1).optional(),
      }),
    )
    .min(1),
  /** Regla que prohíbe atribuir efectividad sin implementación suficiente. */
  implementationRuleRef: z.string().min(1).optional(),
  /** Estado que la fuente asigna cuando el resultado empeora materialmente. */
  negativeOutcomeStateRef: z.string().min(1).optional(),
  negativeOutcomeBasis: z.string().min(1).optional(),
  rules: z.array(governedStatementSchema).optional(),
  /** Efectividad ≠ madurez. */
  isMaturity: z.literal(false),
});

export const attributionModelSchema = z.object({
  levels: z.array(governedLevelSchema).min(1),
  /** Resultado observado ≠ atribución: nunca se deriva de la efectividad. */
  independentOfEffectiveness: z.literal(true),
  formula: z.string().min(1),
  rules: z.array(governedStatementSchema).optional(),
});

export const validationModelSchema = z.object({
  /** Campos del objeto Validation declarados por la fuente. */
  recordFields: z.array(z.string().min(1)).min(1),
  decisions: z
    .array(
      z.object({
        decision: z.string().min(1),
        action: z.string().min(1).optional(),
        whenEffectivenessStateRef: z.string().min(1).optional(),
        whenNegativeUnintendedOutcome: z.boolean().optional(),
        /** GOVERNED_JUDGMENT cuando la fuente condiciona la decisión (p. ej. "según riesgo"). */
        selection: z.enum(["DETERMINISTIC", "GOVERNED_JUDGMENT"]),
      }),
    )
    .min(1),
  rules: z.array(governedStatementSchema).optional(),
});

export const followUpModelSchema = z.object({
  rules: z
    .array(
      z.object({
        id: z.string().min(1).nullable(),
        statement: z.string().min(1),
        triggerEffectivenessStateRefs: z.array(z.string().min(1)).optional(),
        /** GOVERNED_JUDGMENT cuando la condición exige juicio (riesgo, variabilidad…). */
        conditionClassification: z.enum(["DETERMINISTIC", "GOVERNED_JUDGMENT"]),
      }),
    )
    .min(1),
  recordFields: z.array(z.string().min(1)).optional(),
  frequencyFormula: z.string().min(1),
});

export const reassessmentModelSchema = z.object({
  rules: z
    .array(
      z.object({
        id: z.string().min(1).nullable(),
        statement: z.string().min(1),
        triggerEffectivenessStateRefs: z.array(z.string().min(1)).min(1),
        conditionClassification: z.enum(["DETERMINISTIC", "GOVERNED_JUDGMENT"]),
        loop: z.string().min(1).optional(),
      }),
    )
    .min(1),
  /** Reassessment = nuevo Assessment; nunca sobrescribe el histórico. */
  createsNewAssessment: z.literal(true),
  distinctFromFollowUp: z.literal(true),
});

export const severityModelSchema = z.object({
  levels: z.array(governedLevelSchema).min(1),
  resolution: propertyResolutionModeSchema,
  formula: z.string().min(1),
  /** Guardas de consolidación (comportamiento, nunca scoring). */
  consolidationGuards: z
    .array(
      z.object({
        id: z.string().min(1),
        statement: z.string().min(1),
        action: z.string().min(1).optional(),
        severityRefs: z.array(z.string().min(1)).min(1),
        confidenceRefs: z.array(z.string().min(1)).min(1),
        appliesToClaim: z.enum(["CAUSAL", "ANY"]),
        effect: z.literal("BLOCK_CONFIRMATION"),
      }),
    )
    .optional(),
});

export const contextualizationSchema = z.object({
  rules: z.array(governedStatementSchema).min(1),
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
      /** Niveles cualitativos (C0–C3…) cuando la fuente los declara. */
      levels: z.array(governedLevelSchema).optional(),
      /** Por defecto NOT_EXPLICIT (retrocompatible). */
      resolution: propertyResolutionModeSchema.optional(),
      rules: z.array(governedStatementSchema).optional(),
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
        /** Retrocompatible (M1-KL): CRV propiedad de una Activity. */
        activityRef: z.string().min(1).optional(),
        /** Dueño gobernado genérico. Si coexiste con activityRef deben coincidir. */
        owner: z
          .object({ kind: z.enum(VALIDATION_REQUIREMENT_OWNER_KINDS), ref: z.string().min(1) })
          .optional(),
        name: z.string().min(1).optional(),
        definition: z.string().min(1),
        definitionSource: z.string().min(1),
        formula: z.literal("NOT_A_SCORE"),
        /**
         * DETERMINISTIC_CONDITIONS (por defecto): el runtime evalúa condiciones
         * determinísticas. GOVERNED_JUDGMENT: el cumplimiento exige juicio humano
         * registrado; el runtime solo verifica su admisibilidad.
         */
        evaluation: z.enum(["DETERMINISTIC_CONDITIONS", "GOVERNED_JUDGMENT"]).optional(),
        conditions: z.array(
          z.object({
            id: z.string().min(1),
            kind: z.enum(VALIDATION_CONDITION_KINDS),
            statement: z.string().min(1),
            requiredCount: z.number().int().positive().optional(),
          }),
        ),
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
  /* ---- Extensiones genéricas M2 runtime closure (todas opcionales) ---- */
  interventionPatterns: z.array(interventionPatternSchema).optional(),
  implementationModel: implementationModelSchema.optional(),
  effectivenessModel: effectivenessModelSchema.optional(),
  attributionModel: attributionModelSchema.optional(),
  validationModel: validationModelSchema.optional(),
  followUp: followUpModelSchema.optional(),
  reassessment: reassessmentModelSchema.optional(),
  severity: severityModelSchema.optional(),
  contextualization: contextualizationSchema.optional(),
  engineActions: z
    .array(z.object({ id: z.string().min(1), meaning: z.string().min(1) }))
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
export type KnowledgePackValidationRequirement = NonNullable<KnowledgePack["validationRequirements"]>[number];
export type KnowledgePackInterventionPattern = z.infer<typeof interventionPatternSchema>;

/**
 * Dueño gobernado de un CRV: `owner` explícito o, retrocompatible, la
 * Activity declarada en `activityRef`. null si la fuente no declara ninguno.
 */
export function resolveValidationRequirementOwner(crv: {
  activityRef?: string | undefined;
  owner?: { kind: (typeof VALIDATION_REQUIREMENT_OWNER_KINDS)[number]; ref: string } | undefined;
}): { kind: (typeof VALIDATION_REQUIREMENT_OWNER_KINDS)[number]; ref: string } | null {
  if (crv.owner) return crv.owner;
  if (crv.activityRef) return { kind: "ACTIVITY", ref: crv.activityRef };
  return null;
}

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

  // CRV: identidad única, dueño gobernado conocido y condiciones bien formadas.
  const activityIds = new Set((pack.activities ?? []).map((a) => a.id));
  const patternIds = new Set((pack.interventionPatterns ?? []).map((p) => p.id));
  const deliverableIds = new Set(
    (pack.interventionPatterns ?? []).flatMap((p) => (p.deliverables ?? []).map((d) => d.id)),
  );
  const crvIds = new Set<string>();
  (pack.validationRequirements ?? []).forEach((crv, index) => {
    const base = `validationRequirements.${index}`;
    if (crvIds.has(crv.id)) {
      issues.push({ path: `${base}.id`, message: `CRV duplicado: ${crv.id}` });
    }
    crvIds.add(crv.id);
    const owner = resolveValidationRequirementOwner(crv);
    if (!owner) {
      issues.push({ path: `${base}.owner`, message: "un CRV debe declarar su dueño gobernado" });
    } else {
      if (crv.activityRef && crv.owner && (crv.owner.kind !== "ACTIVITY" || crv.owner.ref !== crv.activityRef)) {
        issues.push({ path: `${base}.owner`, message: "owner y activityRef se contradicen" });
      }
      const universo =
        owner.kind === "ACTIVITY" ? activityIds : owner.kind === "INTERVENTION_PATTERN" ? patternIds : deliverableIds;
      if (!universo.has(owner.ref)) {
        const campo = crv.owner ? "owner.ref" : "activityRef";
        const etiqueta =
          owner.kind === "ACTIVITY" ? "actividad" : owner.kind === "INTERVENTION_PATTERN" ? "patrón" : "deliverable";
        issues.push({ path: `${base}.${campo}`, message: `${etiqueta} desconocida: ${owner.ref}` });
      }
    }
    const evaluation = crv.evaluation ?? "DETERMINISTIC_CONDITIONS";
    const deterministas = new Set<string>(DETERMINISTIC_VALIDATION_CONDITION_KINDS);
    if (evaluation === "DETERMINISTIC_CONDITIONS") {
      if (crv.conditions.length === 0) {
        issues.push({ path: `${base}.conditions`, message: "un CRV determinístico exige al menos una condición" });
      }
      crv.conditions.forEach((c, i) => {
        if (!deterministas.has(c.kind)) {
          issues.push({
            path: `${base}.conditions.${i}.kind`,
            message: `condición ${c.kind} exige evaluation GOVERNED_JUDGMENT`,
          });
        }
      });
    } else if (!crv.conditions.some((c) => c.kind === "GOVERNED_STATEMENT")) {
      issues.push({
        path: `${base}.conditions`,
        message: "un CRV GOVERNED_JUDGMENT debe declarar su enunciado gobernado (GOVERNED_STATEMENT)",
      });
    }
    crv.conditions.forEach((condicion, i) => {
      if (condicion.kind === "CONSECUTIVE_CORRECT_CASES" && !condicion.requiredCount) {
        issues.push({
          path: `${base}.conditions.${i}.requiredCount`,
          message: "una condición de casos consecutivos debe declarar cuántos exige",
        });
      }
    });
  });

  // Modelos de ciclo de vida: integridad referencial interna, sin semántica.
  const im = pack.implementationModel;
  if (im) {
    const layerIds = new Set(im.doneLayers.map((l) => l.id));
    const implementados = im.executionStates.filter((e) => e.implemented);
    if (implementados.length > 1) {
      issues.push({ path: "implementationModel.executionStates", message: "solo un estado puede ser implementado" });
    }
    im.executionStates.forEach((estado, i) => {
      (estado.requiresDoneLayerRefs ?? []).forEach((ref) => {
        if (!layerIds.has(ref)) {
          issues.push({
            path: `implementationModel.executionStates.${i}.requiresDoneLayerRefs`,
            message: `capa de Done desconocida: ${ref}`,
          });
        }
      });
    });
  }
  const effIds = new Set((pack.effectivenessModel?.states ?? []).map((e) => e.id));
  const neg = pack.effectivenessModel?.negativeOutcomeStateRef;
  if (neg && !effIds.has(neg)) {
    issues.push({ path: "effectivenessModel.negativeOutcomeStateRef", message: `estado de efectividad desconocido: ${neg}` });
  }
  const implRule = pack.effectivenessModel?.implementationRuleRef;
  if (implRule && !(pack.validationModel?.rules ?? []).some((r) => r.id === implRule)) {
    issues.push({ path: "effectivenessModel.implementationRuleRef", message: `regla de validación desconocida: ${implRule}` });
  }
  if (pack.effectivenessModel?.states.some((e) => e.presupposesImplementation) && !im) {
    issues.push({
      path: "effectivenessModel.states",
      message: "un estado de efectividad que presupone implementación exige implementationModel",
    });
  }
  const checkEffRefs = (refs: string[] | undefined, path: string) =>
    (refs ?? []).forEach((ref) => {
      if (!effIds.has(ref)) issues.push({ path, message: `estado de efectividad desconocido: ${ref}` });
    });
  (pack.validationModel?.decisions ?? []).forEach((d, i) =>
    checkEffRefs(d.whenEffectivenessStateRef ? [d.whenEffectivenessStateRef] : [], `validationModel.decisions.${i}`),
  );
  (pack.followUp?.rules ?? []).forEach((r, i) =>
    checkEffRefs(r.triggerEffectivenessStateRefs, `followUp.rules.${i}.triggerEffectivenessStateRefs`),
  );
  (pack.reassessment?.rules ?? []).forEach((r, i) =>
    checkEffRefs(r.triggerEffectivenessStateRefs, `reassessment.rules.${i}.triggerEffectivenessStateRefs`),
  );
  const sevIds = new Set((pack.severity?.levels ?? []).map((l) => l.id));
  const confIds = new Set((pack.confidence?.levels ?? []).map((l) => l.id));
  (pack.severity?.consolidationGuards ?? []).forEach((g, i) => {
    g.severityRefs.forEach((ref) => {
      if (!sevIds.has(ref)) issues.push({ path: `severity.consolidationGuards.${i}`, message: `severidad desconocida: ${ref}` });
    });
    g.confidenceRefs.forEach((ref) => {
      if (!confIds.has(ref)) issues.push({ path: `severity.consolidationGuards.${i}`, message: `confianza desconocida: ${ref}` });
    });
  });
  if (pack.severity) {
    for (const l of pack.severity.levels) {
      if (/^\d+(\.\d+)?$/.test(l.id)) {
        issues.push({ path: "severity.levels", message: "un nivel de severidad no puede ser numérico" });
      }
    }
  }

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
