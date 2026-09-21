/**
 * Contratos de la fuente gobernada (Knowledge Master) y de los estados
 * industriales del pipeline.
 *
 * REGLAS:
 * - El Master representa FUENTE gobernada; los Packs representan conocimiento
 *   EJECUTABLE derivado de esa fuente. El Master no contiene runtime.
 * - Una capacidad sin fuente autorizada se declara SOURCE_MISSING. Jamás se
 *   reconstruye desde prompts, memoria, código MVP, OP-01 ni inferencia.
 */
import { z } from "zod";

export const MASTER_IDENTITY = "PYMAPA-KNOWLEDGE-MASTER";
export const BASELINE_STATUS = "BASELINE-APPROVED";
/** Total declarado por el Master v1.0. No implica que la fuente esté disponible. */
export const EXPECTED_CAPABILITY_COUNT = 31;
/** Señal de cierre cuando la fuente autorizada completa no está en el repositorio. */
export const AUTHORITATIVE_SOURCE_REQUIRED = "AUTHORITATIVE_SOURCE_REQUIRED" as const;

/** Estados industriales por capacidad. */
export const CAPABILITY_PIPELINE_STATES = [
  "SOURCE_MISSING",
  "SOURCE_READY",
  "EXTRACTED",
  "PACK_CANDIDATE",
  "VALIDATION_FAILED",
  "NEEDS_GOVERNANCE_REVIEW",
  "VALIDATED",
  "PUBLISHED",
  "SUPERSEDED",
] as const;
export type CapabilityPipelineState = (typeof CAPABILITY_PIPELINE_STATES)[number];

/** Clases de vacío tratadas como dato de primera clase. */
export const GAP_KINDS = [
  "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
  "KNOWLEDGE_CHANGE_CANDIDATE",
  "GOVERNED_JUDGMENT",
  "UNIMPLEMENTED_GAP",
  "ARCHITECTURE_GAP",
  "GENERIC_RUNTIME_EXTENSION_REQUIRED",
] as const;
export type GapKind = (typeof GAP_KINDS)[number];

export const gapSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(GAP_KINDS),
  statement: z.string().min(1),
  /** Clasificación explícita: no todo gap bloquea publicación. */
  publicationBlocking: z.boolean(),
  sourceReference: z.string().optional(),
});
export type KnowledgeGap = z.infer<typeof gapSchema>;

export const masterIndexSchema = z.object({
  identity: z.string().min(1),
  version: z.string().min(1),
  baselineStatus: z.string().min(1),
  provenance: z.object({
    sourceReference: z.string().min(1),
    custodian: z.string().min(1),
    approvedAt: z.string().min(1),
    note: z.string().optional(),
  }),
  publication: z.object({
    status: z.enum(["DRAFT", "BASELINE_APPROVED", "SUPERSEDED"]),
    publishedAt: z.string().min(1),
    publishedBy: z.string().min(1),
  }),
  /** Capacidades declaradas por el Master, disponibles o no. */
  expectedCapabilityCount: z.number().int().positive(),
  domains: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        status: z.enum(["draft", "review", "published", "deprecated"]),
      }),
    )
    .min(1),
  capabilities: z
    .array(
      z.object({
        id: z.string().min(1),
        domainId: z.string().min(1),
        name: z.string().min(1),
        sourceAvailability: z.enum(["SOURCE_MISSING", "SOURCE_READY"]),
        /** Ruta de la sección fuente; null cuando la fuente no está disponible. */
        sourceRef: z.string().nullable(),
        sourceVersion: z.string().nullable(),
      }),
    )
    .min(1),
  checksum: z.string().min(1),
});
export type MasterIndex = z.infer<typeof masterIndexSchema>;

/** Secciones fuente de una capacidad: transcripción gobernada, sin runtime. */
export const capabilitySourceSchema = z.object({
  $schema: z.string().optional(),
  master: z.object({
    identity: z.string().min(1),
    version: z.string().min(1),
    baselineStatus: z.string().min(1),
  }),
  capability: z.object({
    id: z.string().min(1),
    domainId: z.string().min(1),
    name: z.string().min(1),
    definition: z.string().min(1),
    centralQuestion: z.string().optional(),
  }),
  provenance: z.object({
    sourceReference: z.string().min(1),
    extractionStatus: z.enum(["APPROVED", "IN_REVIEW", "DRAFT"]),
    /** Cómo se obtuvo la transcripción. Nunca "INFERRED". */
    derivation: z.enum(["MASTER_TRANSCRIPTION", "GOLDEN_PACK_TRANSCRIPTION"]),
    derivationNote: z.string().optional(),
    approvedBy: z.string().min(1),
    approvedAt: z.string().min(1),
  }),
  targetPack: z.object({
    packId: z.string().min(1),
    packVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  }),
  /** Secciones gobernadas, con el wording del material aprobado. */
  sections: z.record(z.string(), z.unknown()),
  gaps: z.array(gapSchema),
  checksum: z.string().min(1),
});
export type CapabilitySource = z.infer<typeof capabilitySourceSchema>;

export interface SourceValidationIssue {
  path: string;
  message: string;
}
export type SourceValidation<T> =
  { ok: true; value: T } | { ok: false; issues: SourceValidationIssue[] };

function parse<T>(schema: z.ZodType<T>, raw: unknown): SourceValidation<T> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

export function validateMasterIndex(raw: unknown): SourceValidation<MasterIndex> {
  const base = parse(masterIndexSchema, raw);
  if (!base.ok) return base;
  const master = base.value;
  const issues: SourceValidationIssue[] = [];
  if (master.identity !== MASTER_IDENTITY) {
    issues.push({
      path: "identity",
      message: `identidad de Master no autorizada: ${master.identity}`,
    });
  }
  if (master.baselineStatus !== BASELINE_STATUS) {
    issues.push({
      path: "baselineStatus",
      message: `baseline no aprobada: ${master.baselineStatus}`,
    });
  }
  const domainIds = new Set(master.domains.map((d) => d.id));
  master.capabilities.forEach((c, i) => {
    if (!domainIds.has(c.domainId)) {
      issues.push({
        path: `capabilities.${i}.domainId`,
        message: `dominio desconocido: ${c.domainId}`,
      });
    }
    if (c.sourceAvailability === "SOURCE_READY" && !c.sourceRef) {
      issues.push({
        path: `capabilities.${i}.sourceRef`,
        message: "SOURCE_READY exige una referencia de fuente real",
      });
    }
    if (c.sourceAvailability === "SOURCE_MISSING" && c.sourceRef) {
      issues.push({
        path: `capabilities.${i}.sourceRef`,
        message: "SOURCE_MISSING no puede declarar fuente",
      });
    }
  });
  if (master.capabilities.length > master.expectedCapabilityCount) {
    issues.push({
      path: "capabilities",
      message: "hay más capacidades registradas que las declaradas por el Master",
    });
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: master };
}

export function validateCapabilitySource(raw: unknown): SourceValidation<CapabilitySource> {
  const base = parse(capabilitySourceSchema, raw);
  if (!base.ok) return base;
  const source = base.value;
  const issues: SourceValidationIssue[] = [];
  if (source.master.identity !== MASTER_IDENTITY) {
    issues.push({ path: "master.identity", message: "identidad de Master no autorizada" });
  }
  if (source.master.baselineStatus !== BASELINE_STATUS) {
    issues.push({ path: "master.baselineStatus", message: "la fuente no está BASELINE-APPROVED" });
  }
  if (Object.keys(source.sections).length === 0) {
    issues.push({ path: "sections", message: "la fuente no contiene secciones gobernadas" });
  }
  const gapIds = new Set<string>();
  source.gaps.forEach((gap, i) => {
    if (gapIds.has(gap.id))
      issues.push({ path: `gaps.${i}.id`, message: `gap duplicado: ${gap.id}` });
    gapIds.add(gap.id);
  });
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: source };
}
