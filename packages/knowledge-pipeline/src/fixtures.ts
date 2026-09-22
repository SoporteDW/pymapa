/**
 * Fixtures por capacidad.
 *
 * Un fixture declara entradas (observaciones admisibles) y el resultado
 * esperado. NUNCA se fabrica un resultado semántico que el Knowledge Master no
 * permita determinar: en ese caso el resultado esperado legítimo es
 * NEEDS_REVIEW / UNKNOWN / CONTRADICTORY / NOT_APPLICABLE.
 */
import { z } from "zod";

export const FIXTURE_KINDS = [
  /** Derivado de la fuente gobernada (wording y estados aprobados). */
  "SOURCE_DERIVED",
  /** Comprueba arquitectura o runtime, no semántica de negocio. */
  "ARCHITECTURE_RUNTIME",
  /** Caso definido y aprobado manualmente por gobierno editorial. */
  "MANUALLY_GOVERNED",
] as const;
export type FixtureKind = (typeof FIXTURE_KINDS)[number];

export const EXPECTED_OUTCOMES = ["PASS", "NEEDS_GOVERNANCE_REVIEW"] as const;
export type ExpectedOutcome = (typeof EXPECTED_OUTCOMES)[number];

const knowledgeStateSchema = z.enum(["KNOWN", "UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"]);

export const fixtureObservationSchema = z.object({
  id: z.string().min(1),
  variableRef: z.string().min(1),
  acquisitionRef: z.string().min(1),
  knowledgeState: knowledgeStateSchema,
  semanticValue: z.string().nullable(),
  sourceResponseId: z.string().nullable(),
  respondentId: z.string().nullable().optional(),
  evidenceIds: z.array(z.string()).optional(),
  notApplicableReason: z.string().nullable().optional(),
  conflictingObservationIds: z.array(z.string()).optional(),
  recordedAt: z.string().min(1),
});

export const fixtureSchema = z.object({
  $schema: z.string().optional(),
  fixtureId: z.string().min(1),
  capabilityId: z.string().min(1),
  packId: z.string().min(1),
  packVersion: z.string().min(1),
  kind: z.enum(FIXTURE_KINDS),
  description: z.string().min(1),
  /** Procedencia obligatoria en fixtures derivados de la fuente. */
  sourceReference: z.string().optional(),
  knowledgeVersionId: z.string().min(1),
  observations: z.array(fixtureObservationSchema),
  expected: z.object({
    outcome: z.enum(EXPECTED_OUTCOMES),
    variableStates: z
      .array(
        z.object({
          variableRef: z.string().min(1),
          state: knowledgeStateSchema,
          semanticValue: z.string().nullable().optional(),
        }),
      )
      .default([]),
    needsReview: z.boolean().optional(),
    contradictionVariableRefs: z.array(z.string()).optional(),
    findingCandidateRefs: z.array(z.string()).optional(),
    /**
     * M2-OP02-02: findings con observaciones vinculadas pero sin soporte KNOWN.
     * UNKNOWN / NOT_APPLICABLE / CONTRADICTORY nunca sostienen un candidato.
     */
    findingsAwaitingResolution: z
      .array(
        z.object({
          findingRef: z.string().min(1),
          status: z.enum(["AWAITING_INFORMATION", "EXCLUDED_NOT_APPLICABLE", "BLOCKED_BY_CONTRADICTION"]),
        }),
      )
      .optional(),
    /** Referencias de finding que NUNCA deben confirmarse automáticamente. */
    noConfirmedFindings: z.boolean().optional(),
    note: z.string().optional(),
  }),
});
export type CapabilityFixture = z.infer<typeof fixtureSchema>;

export interface FixtureValidationIssue {
  path: string;
  message: string;
}

export function validateFixture(
  raw: unknown,
): { ok: true; fixture: CapabilityFixture } | { ok: false; issues: FixtureValidationIssue[] } {
  const parsed = fixtureSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  const fixture = parsed.data;
  const issues: FixtureValidationIssue[] = [];
  if (fixture.kind === "SOURCE_DERIVED" && !fixture.sourceReference) {
    issues.push({
      path: "sourceReference",
      message: "un fixture derivado de la fuente debe declarar su referencia",
    });
  }
  fixture.observations.forEach((obs, i) => {
    if (obs.knowledgeState === "NOT_APPLICABLE" && !obs.notApplicableReason) {
      issues.push({
        path: `observations.${i}.notApplicableReason`,
        message: "NOT_APPLICABLE exige razón contextual",
      });
    }
    if (
      obs.knowledgeState === "CONTRADICTORY" &&
      (obs.conflictingObservationIds ?? []).length === 0
    ) {
      issues.push({
        path: `observations.${i}.conflictingObservationIds`,
        message: "CONTRADICTORY exige referencias a las fuentes en conflicto",
      });
    }
    if (obs.knowledgeState !== "KNOWN" && obs.semanticValue !== null) {
      issues.push({
        path: `observations.${i}.semanticValue`,
        message: "solo KNOWN aporta valor semántico",
      });
    }
  });
  return issues.length > 0 ? { ok: false, issues } : { ok: true, fixture };
}
