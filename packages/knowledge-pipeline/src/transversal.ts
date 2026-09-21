/**
 * Núcleo transversal del Knowledge Master (S1–S5).
 *
 * Materialización, NO rediseño. Estos contratos representan el contenido
 * recuperado del artefacto autoritativo:
 *
 *   M2-SOURCE Consolidated Authoritative Recovery Repository · S1–S5
 *
 * INVARIANTES:
 * - La clase de recuperación es dato de primera clase: VERBATIM,
 *   STRUCTURED/HIGH-FIDELITY y SOURCE_CONTENT_NOT_RECOVERED se preservan.
 * - Un elemento marcado SOURCE_CONTENT_NOT_RECOVERED nunca se completa por
 *   inferencia, analogía, OP-01 ni por el código existente.
 * - La provenance de cada etapa (S1…S5) se mantiene separada. Las diferencias
 *   cross-stage son metadatos de evolución, no errores a corregir.
 * - Ningún registro transversal es runtime: no ejecuta ni altera el engine.
 */
import { z } from "zod";
import { gapSchema, MASTER_IDENTITY, BASELINE_STATUS, type SourceValidation } from "./master.ts";

/** Clases de recuperación declaradas por el repositorio autoritativo. */
export const RECOVERY_CLASSES = [
  "RECOVERED_VERBATIM",
  "RECOVERED_STRUCTURED_HIGH_FIDELITY",
  "SOURCE_CONTENT_NOT_RECOVERED",
] as const;
export type RecoveryClass = (typeof RECOVERY_CLASSES)[number];

/** Etapas de ingeniería de conocimiento de Fase 2. */
export const STAGE_IDS = ["S1", "S2", "S3", "S4", "S5", "CONSOLIDATED"] as const;
export type StageId = (typeof STAGE_IDS)[number];

export const TRANSVERSAL_SOURCE_REFERENCE =
  "M2-SOURCE Consolidated Authoritative Recovery Repository · S1–S5";
/** Única derivación admitida: transcripción del artefacto de recuperación. */
export const TRANSVERSAL_DERIVATION = "AUTHORITATIVE_RECOVERY_TRANSCRIPTION" as const;

/**
 * Estado histórico de una capacidad. K4-VALIDATED describe el cierre histórico
 * aprobado y NO equivale a disponer de la fuente materializada.
 */
export const CAPABILITY_HISTORY_STATUSES = ["SOURCE_READY", "APPROVED_HISTORY_CONFIRMED"] as const;
export type CapabilityHistoryStatus = (typeof CAPABILITY_HISTORY_STATUSES)[number];

/** Registros exigidos por la materialización transversal. */
export const REQUIRED_TRANSVERSAL_REGISTRIES = [
  "S1-TRANSVERSAL-RECONCILIATION",
  "S1-CROSS-CAPABILITY-RELATIONSHIP-REGISTRY",
  "S1-TRANSVERSAL-CONTRACTS",
  "S1-COMMON-STATES",
  "S2-LOGICAL-ENGINE-REGISTRY",
  "S3-OBJECT-REGISTRY",
  "S3-RELATIONSHIP-REGISTRY",
  "S3-LOGICAL-KNOWLEDGE-GRAPH",
  "S3-KNOWLEDGE-PACK-LOGICAL-CONTRACT",
  "S3-CASE-SNAPSHOT-LOGICAL-CONTRACT",
  "S3-MASTER-KNOWLEDGE-REGISTRY",
  "S4-KNOWLEDGE-GOVERNANCE",
  "S4-SOURCE-GOVERNANCE",
  "S5-GLOBAL-QUALITY-GATES",
  "TAXONOMY-REGISTRY-6X31",
  "RECOVERY-GAPS",
  "CROSS-STAGE-DIFFERENCES",
] as const;

export const transversalRegistrySchema = z.object({
  $schema: z.string().optional(),
  registryId: z.string().min(1),
  title: z.string().min(1),
  master: z.object({
    identity: z.string().min(1),
    version: z.string().min(1),
    baselineStatus: z.string().min(1),
  }),
  stage: z.enum(STAGE_IDS),
  /** Cierres autoritativos de la etapa, preservados tal como se recuperaron. */
  stageArtifacts: z.array(z.string().min(1)).min(1),
  recoveryClass: z.enum(RECOVERY_CLASSES),
  provenance: z.object({
    sourceReference: z.string().min(1),
    derivation: z.literal(TRANSVERSAL_DERIVATION),
    approvedBy: z.string().min(1),
    approvedAt: z.string().min(1),
    note: z.string().optional(),
  }),
  /** IDs recuperados que este registro preserva literalmente. */
  recoveredIds: z.array(z.string().min(1)),
  sections: z.record(z.string(), z.unknown()),
  gaps: z.array(gapSchema),
  checksum: z.string().min(1),
});
export type TransversalRegistry = z.infer<typeof transversalRegistrySchema>;

export const transversalIndexSchema = z.object({
  $schema: z.string().optional(),
  identity: z.literal("PYMAPA-KNOWLEDGE-MASTER-TRANSVERSAL-CORE"),
  master: z.object({
    identity: z.string().min(1),
    version: z.string().min(1),
    baselineStatus: z.string().min(1),
  }),
  phaseClosure: z.string().min(1),
  verticalMilestone: z.string().min(1),
  /** Cadena de cierre autoritativa, RECOVERED VERBATIM. */
  closureChain: z.array(z.string().min(1)).min(1),
  provenance: z.object({
    sourceReference: z.string().min(1),
    derivation: z.literal(TRANSVERSAL_DERIVATION),
    approvedBy: z.string().min(1),
    approvedAt: z.string().min(1),
  }),
  stages: z
    .array(
      z.object({
        id: z.enum(STAGE_IDS),
        artifacts: z.array(z.string().min(1)).min(1),
        owns: z.array(z.string().min(1)).min(1),
        recoveryStatus: z.string().min(1),
      }),
    )
    .min(5),
  registries: z
    .array(
      z.object({
        registryId: z.string().min(1),
        stage: z.enum(STAGE_IDS),
        ref: z.string().min(1),
        recoveryClass: z.enum(RECOVERY_CLASSES),
        checksum: z.string().min(1),
      }),
    )
    .min(1),
  checksum: z.string().min(1),
});
export type TransversalIndex = z.infer<typeof transversalIndexSchema>;

export interface TransversalIssue {
  path: string;
  message: string;
}

function parse<T>(schema: z.ZodType<T>, raw: unknown): SourceValidation<T> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

export function validateTransversalRegistry(raw: unknown): SourceValidation<TransversalRegistry> {
  const base = parse(transversalRegistrySchema, raw);
  if (!base.ok) return base;
  const registro = base.value;
  const issues: TransversalIssue[] = [];

  if (registro.master.identity !== MASTER_IDENTITY) {
    issues.push({ path: "master.identity", message: "identidad de Master no autorizada" });
  }
  if (registro.master.baselineStatus !== BASELINE_STATUS) {
    issues.push({ path: "master.baselineStatus", message: "el registro no está BASELINE-APPROVED" });
  }
  if (!registro.provenance.sourceReference.startsWith(TRANSVERSAL_SOURCE_REFERENCE)) {
    issues.push({
      path: "provenance.sourceReference",
      message: `la procedencia debe referir al artefacto autoritativo: ${TRANSVERSAL_SOURCE_REFERENCE}`,
    });
  }
  if (Object.keys(registro.sections).length === 0) {
    issues.push({ path: "sections", message: "el registro no materializa ninguna sección" });
  }

  const vistos = new Set<string>();
  registro.recoveredIds.forEach((id, i) => {
    if (vistos.has(id))
      issues.push({ path: `recoveredIds.${i}`, message: `ID recuperado duplicado: ${id}` });
    vistos.add(id);
  });

  const gapIds = new Set<string>();
  registro.gaps.forEach((gap, i) => {
    if (gapIds.has(gap.id))
      issues.push({ path: `gaps.${i}.id`, message: `gap duplicado: ${gap.id}` });
    gapIds.add(gap.id);
    if (gap.kind === "SOURCE_CONTENT_NOT_RECOVERED" && !gap.publicationBlocking) {
      issues.push({
        path: `gaps.${i}.publicationBlocking`,
        message: "SOURCE_CONTENT_NOT_RECOVERED bloquea publicación mientras no se recupere la fuente",
      });
    }
    if (gap.kind === "SOURCE_CONTENT_NOT_RECOVERED" && "resolution" in gap) {
      issues.push({
        path: `gaps.${i}.resolution`,
        message: "un gap no recuperado no puede declarar resolución",
      });
    }
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: registro };
}

export function validateTransversalIndex(raw: unknown): SourceValidation<TransversalIndex> {
  const base = parse(transversalIndexSchema, raw);
  if (!base.ok) return base;
  const indice = base.value;
  const issues: TransversalIssue[] = [];

  if (indice.master.identity !== MASTER_IDENTITY) {
    issues.push({ path: "master.identity", message: "identidad de Master no autorizada" });
  }
  if (indice.master.baselineStatus !== BASELINE_STATUS) {
    issues.push({ path: "master.baselineStatus", message: "el índice no está BASELINE-APPROVED" });
  }
  for (const etapa of ["S1", "S2", "S3", "S4", "S5"] as const) {
    if (!indice.stages.some((s) => s.id === etapa)) {
      issues.push({ path: "stages", message: `falta la provenance de la etapa ${etapa}` });
    }
  }
  const registrados = new Set(indice.registries.map((r) => r.registryId));
  for (const requerido of REQUIRED_TRANSVERSAL_REGISTRIES) {
    if (!registrados.has(requerido)) {
      issues.push({ path: "registries", message: `falta el registro requerido ${requerido}` });
    }
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: indice };
}

export interface TransversalStageSummary {
  stage: StageId;
  registryCount: number;
  recoveredIdCount: number;
  gapCount: number;
  notRecoveredGapCount: number;
}

export interface TransversalCoreSummary {
  registryCount: number;
  recoveredIdCount: number;
  gapCount: number;
  notRecoveredGapCount: number;
  genericRuntimeExtensionCount: number;
  crossStageDifferenceCount: number;
  stages: TransversalStageSummary[];
}

export interface TransversalCoreResult {
  ok: boolean;
  index: TransversalIndex | null;
  registries: TransversalRegistry[];
  issues: TransversalIssue[];
  summary: TransversalCoreSummary;
}

/**
 * Valida el núcleo transversal completo: índice, registros, correspondencia de
 * checksums declarados y preservación de los vacíos no recuperados.
 */
export function validateTransversalCore(input: {
  index: unknown;
  registries: { ref: string; raw: unknown; checksum: string }[];
}): TransversalCoreResult {
  const issues: TransversalIssue[] = [];
  const indiceValidado = validateTransversalIndex(input.index);
  const indice = indiceValidado.ok ? indiceValidado.value : null;
  if (!indiceValidado.ok) {
    indiceValidado.issues.forEach((i) =>
      issues.push({ path: `index.${i.path}`, message: i.message }),
    );
  }

  const registries: TransversalRegistry[] = [];
  for (const entrada of input.registries) {
    const validado = validateTransversalRegistry(entrada.raw);
    if (!validado.ok) {
      validado.issues.forEach((i) =>
        issues.push({ path: `${entrada.ref}.${i.path}`, message: i.message }),
      );
      continue;
    }
    registries.push(validado.value);
    const declarado = indice?.registries.find((r) => r.registryId === validado.value.registryId);
    if (!declarado) {
      issues.push({
        path: entrada.ref,
        message: `el registro ${validado.value.registryId} no está declarado en el índice`,
      });
      continue;
    }
    if (declarado.checksum !== entrada.checksum) {
      issues.push({
        path: `${entrada.ref}.checksum`,
        message: `checksum del índice desalineado con el registro (${declarado.checksum} ≠ ${entrada.checksum})`,
      });
    }
    if (declarado.recoveryClass !== validado.value.recoveryClass) {
      issues.push({
        path: `${entrada.ref}.recoveryClass`,
        message: "clase de recuperación del índice distinta de la del registro",
      });
    }
    if (declarado.stage !== validado.value.stage) {
      issues.push({ path: `${entrada.ref}.stage`, message: "etapa del índice distinta del registro" });
    }
  }

  const porEtapa = new Map<StageId, TransversalStageSummary>();
  for (const registro of registries) {
    const actual =
      porEtapa.get(registro.stage) ??
      ({
        stage: registro.stage,
        registryCount: 0,
        recoveredIdCount: 0,
        gapCount: 0,
        notRecoveredGapCount: 0,
      } satisfies TransversalStageSummary);
    actual.registryCount += 1;
    actual.recoveredIdCount += registro.recoveredIds.length;
    actual.gapCount += registro.gaps.length;
    actual.notRecoveredGapCount += registro.gaps.filter(
      (g) => g.kind === "SOURCE_CONTENT_NOT_RECOVERED",
    ).length;
    porEtapa.set(registro.stage, actual);
  }

  const diferencias = registries.find((r) => r.registryId === "CROSS-STAGE-DIFFERENCES");
  const crossStageDifferenceCount = Array.isArray(diferencias?.sections["differences"])
    ? (diferencias.sections["differences"] as unknown[]).length
    : 0;

  const summary: TransversalCoreSummary = {
    registryCount: registries.length,
    recoveredIdCount: registries.reduce((n, r) => n + r.recoveredIds.length, 0),
    gapCount: registries.reduce((n, r) => n + r.gaps.length, 0),
    notRecoveredGapCount: registries.reduce(
      (n, r) => n + r.gaps.filter((g) => g.kind === "SOURCE_CONTENT_NOT_RECOVERED").length,
      0,
    ),
    genericRuntimeExtensionCount: registries.reduce(
      (n, r) => n + r.gaps.filter((g) => g.kind === "GENERIC_RUNTIME_EXTENSION_REQUIRED").length,
      0,
    ),
    crossStageDifferenceCount,
    stages: [...porEtapa.values()].sort((a, b) => (a.stage < b.stage ? -1 : 1)),
  };

  return { ok: issues.length === 0, index: indice, registries, issues, summary };
}
