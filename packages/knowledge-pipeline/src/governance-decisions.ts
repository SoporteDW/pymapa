/**
 * Decisiones humanas de gobierno sobre una fuente registrada (M2-BATCH-01R).
 *
 * Un registro de decisiones NO es conocimiento ni aceptación canónica: fija,
 * con criterios literales verificables contra la fuente, (1) qué aparición del
 * cierre histórico rige, (2) qué conteos finales aprobó la revisión humana y
 * (3) qué ítems de backlog gobernado deben materializarse aunque la fuente no
 * los estructure como headings. El extractor aplica los criterios y falla si
 * no se cumplen literalmente; nunca completa ni interpreta.
 */
import { z } from "zod";
import { computeSelfChecksum, verifySelfChecksum } from "./checksum.ts";

export const GOVERNANCE_DECISIONS_FILE = "governance-decisions.json";

export const governanceDecisionsSchema = z.object({
  $schema: z.string().optional(),
  decisionSetId: z.string().min(1),
  capabilityId: z.string().regex(/^[A-Z]{2}-\d{2}$/),
  decidedBy: z.string().min(1),
  decidedByIdentity: z.string().min(1),
  decidedAt: z.string().min(1),
  authorizationSource: z.string().min(1),
  statement: z.string().min(1),
  historicalClosure: z
    .object({
      marker: z.string().min(1),
      /** Heading literal de la sección que contiene la aparición que rige. */
      sectionHeading: z.string().min(1).optional(),
      /** Literales que deben aparecer en las líneas previas a la aparición que rige. */
      precedingLiterals: z.array(z.string().min(1)).optional(),
      precedingWindowLines: z.number().int().positive().optional(),
      otherOccurrences: z.literal("CONFIRMATION_OR_NON_FINAL"),
      rejectedStates: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  approvedCounts: z
    .array(
      z.object({
        label: z.string().min(1),
        declared: z.number().int().nonnegative(),
        /** Línea literal de la fuente que declara el conteo. */
        sourceLiteral: z.string().min(1),
        /** Si existe, solo cuentan los FINAL_APPROVED con este rol semántico gobernado. */
        role: z
          .string()
          .regex(/^[A-Z][A-Z0-9_]*$/)
          .optional(),
        /**
         * M2-FINAL-MASS-BATCH · la fuente declara el conteo pero no enumera los
         * objetos individualmente; se preserva sin inventar IDs.
         */
        enumeration: z.literal("DECLARED_NOT_ENUMERATED").optional(),
      }),
    )
    .default([]),
  governedBacklog: z
    .array(
      z.object({
        sourceId: z.string().min(1),
        title: z.string().min(1),
        /** Número de líneas literales de descripción que siguen al título. */
        bodyLineCount: z.number().int().nonnegative(),
        publicationBlocking: z.literal(false),
      }),
    )
    .default([]),
  /**
   * M2-BATCH-02 · resolución gobernada de colisiones de identificador. Cada
   * decisión se verifica literalmente: el rango [fromLiteral, toLiteral] se
   * delimita por líneas completas únicas de la fuente y debe contener
   * exactamente una aparición del identificador; canonicalLiteral, si existe,
   * debe figurar en esa aparición. Ninguna aparición se borra.
   *  - SELECT_OCCURRENCE: la aparición seleccionada es canónica; las demás
   *    quedan SUPERSEDED (provenance histórica/de apoyo).
   *  - GENUINE_COLLISION: colisión real entre conceptos distintos; la
   *    seleccionada ocupa el identificador canónico, las demás conservan su
   *    texto como HISTORICAL_DRAFT con el rol semántico declarado.
   *  - NOT_A_KNOWLEDGE_OBJECT: el identificador designa un estado de Quality
   *    Gate, etapa o categoría; ninguna aparición es objeto canónico.
   */
  collisionResolutions: z
    .array(
      z.object({
        sourceIds: z.array(z.string().min(1)).min(1),
        resolution: z.enum(["SELECT_OCCURRENCE", "GENUINE_COLLISION", "NOT_A_KNOWLEDGE_OBJECT"]),
        within: z.object({ fromLiteral: z.string().min(1), toLiteral: z.string().min(1) }).optional(),
        canonicalLiteral: z.string().min(1).optional(),
        otherOccurrencesRole: z
          .string()
          .regex(/^[A-Z][A-Z0-9_]*$/)
          .optional(),
        role: z
          .string()
          .regex(/^[A-Z][A-Z0-9_]*$/)
          .optional(),
        rationale: z.string().min(1),
      }),
    )
    .default([]),
  /**
   * Tipado semántico gobernado sin renombrar identificadores. aliasOf marca una
   * referencia abreviada (no objeto propio): pasa a HISTORICAL_DRAFT y no cuenta.
   * bodyLiterals exige que el cuerpo de cada identificador contenga el literal.
   */
  semanticTypes: z
    .array(
      z.object({
        sourceIds: z.array(z.string().min(1)).min(1),
        role: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
        within: z.object({ fromLiteral: z.string().min(1), toLiteral: z.string().min(1) }).optional(),
        aliasOf: z.record(z.string(), z.string()).optional(),
        bodyLiterals: z.record(z.string(), z.string()).optional(),
        rationale: z.string().min(1),
      }),
    )
    .default([]),
  /**
   * Vocabulario de provenance nativo de la fuente (sin normalizar entre
   * capacidades). anchorLiteral es una línea completa única; cada código debe
   * aparecer como línea completa dentro de las windowLines siguientes.
   */
  provenanceVocabulary: z
    .array(
      z.object({
        scheme: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
        anchorLiteral: z.string().min(1),
        windowLines: z.number().int().positive().default(16),
        codes: z.array(z.string().min(1)).min(1),
      }),
    )
    .default([]),
  checksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});
export type GovernanceDecisions = z.infer<typeof governanceDecisionsSchema>;

export function parseGovernanceDecisions(
  value: unknown,
  capabilityId: string,
): { ok: true; value: GovernanceDecisions } | { ok: false; reasons: string[] } {
  const p = governanceDecisionsSchema.safeParse(value);
  if (!p.success) return { ok: false, reasons: p.error.issues.map((i) => i.message) };
  const reasons: string[] = [];
  if (p.data.capabilityId !== capabilityId)
    reasons.push(`decisiones de ${p.data.capabilityId}, esperado ${capabilityId}`);
  const self = verifySelfChecksum(value as Record<string, unknown>);
  if (!self.ok) reasons.push(`checksum de decisiones inválido (esperado ${self.expected})`);
  return reasons.length ? { ok: false, reasons } : { ok: true, value: p.data };
}

export function sealGovernanceDecisions(
  body: Omit<GovernanceDecisions, "checksum">,
): GovernanceDecisions {
  return {
    ...body,
    checksum: computeSelfChecksum(body as unknown as Record<string, unknown>),
  } as GovernanceDecisions;
}
