/**
 * Knowledge Factory por lotes (M2-FACTORY-01 · B1/B4/B6 + A3).
 *
 *   RAW_SOURCE → REGISTERED → EXTRACTED_CANDIDATE → CANONICAL_REVIEW_REQUIRED
 *   → VALIDATED → READY_FOR_PUBLICATION → PUBLISHED
 *
 * Cada capacidad avanza de forma independiente: su evaluación está aislada
 * (try/catch propio) y su resultado nunca altera el de otra capacidad del lote.
 * Cada capacidad se clasifica PASS / REVIEW_REQUIRED / FAIL con motivos exactos
 * y accionables (código, check, líneas de fuente, objeto y acción siguiente).
 *
 * La Factory NO publica, NO aprueba y NO fabrica identidad humana: solo
 * produce evidencia técnica y el estado derivado de artefactos del repo.
 */
import { computeChecksum, computeSelfChecksum, verifySelfChecksum } from "./checksum.ts";
import { validateCanonicalBaseline, type CanonicalBaselineValidation } from "./canonical-baseline.ts";
import {
  promoteCandidateToCanonicalBaseline,
  validateExtractionCandidate,
  type CandidateValidation,
} from "./candidate.ts";
import { AUTHORITATIVE_SOURCE_REQUIRED, type MasterIndex } from "./master.ts";
import { runBatch, type CapabilityPipelineInput, type CapabilityPipelineResult } from "./pipeline.ts";
import { verifyRawSourceRegistration, type PdfTextRunner, type RawRegistrationVerification } from "./raw-source.ts";
import {
  compareSemver,
  resolveCapabilityExtensions,
  validateRuntimeExtensionRegistry,
  type CapabilityExtensionOccurrence,
  type RuntimeExtensionRegistry,
} from "./runtime-extensions.ts";

export const FACTORY_VERSION = "pymapa-knowledge-factory/0.1.0";

export const FACTORY_STATES = [
  "RAW_SOURCE",
  "REGISTERED",
  "EXTRACTED_CANDIDATE",
  "CANONICAL_REVIEW_REQUIRED",
  "VALIDATED",
  "READY_FOR_PUBLICATION",
  "PUBLISHED",
] as const;
export type FactoryState = (typeof FACTORY_STATES)[number];
export type FactoryOutcome = "PASS" | "REVIEW_REQUIRED" | "FAIL";

export const FACTORY_CHECKS = [
  "RAW_REGISTRATION",
  "CANDIDATE_BOUNDARY",
  "STRUCTURAL",
  "REFERENTIAL",
  "SOURCE_TO_CANONICAL",
  "PROVENANCE",
  "CANONICAL_TO_PACK",
  "RUNTIME_COMPATIBILITY",
  "FIXTURES",
  "SOURCE_SILENCE",
  "CAPABILITY_BRANCHING",
  "GOLDEN_REGRESSION",
  "PUBLICATION_GATE",
  "GOVERNANCE_EVIDENCE",
] as const;
export type FactoryCheck = (typeof FACTORY_CHECKS)[number];
export type FactoryCheckStatus = "PASS" | "REVIEW_REQUIRED" | "FAIL" | "NOT_APPLICABLE" | "NOT_RUN";

export interface FactoryReason {
  check: FactoryCheck;
  code: string;
  severity: "FAIL" | "REVIEW" | "INFO";
  message: string;
  action: string;
  sourceLines: [number, number] | null;
  objectKey: string | null;
}

export interface FactoryCheckResult {
  check: FactoryCheck;
  status: FactoryCheckStatus;
  reasons: FactoryReason[];
}

export interface FactoryMetrics {
  rawOriginalBytes: number | null;
  rawTextBytes: number | null;
  rawTextLines: number | null;
  candidateItems: number | null;
  canonicalObjects: number | null;
  executableSections: number | null;
  checksAutoPassed: number;
  humanReviewItems: number;
  notExplicit: number;
  sourceContentNotRecovered: number;
  transcriptionIssues: number;
  runtimeExtensionsRequired: number;
  runtimeExtensionsClosed: number;
  testFailures: number;
  publicationBlockers: number;
}

export interface FactoryCapabilityEntry {
  capabilityId: string;
  domainId: string | null;
  state: FactoryState;
  outcome: FactoryOutcome;
  sourcePath: "MASTER" | "INTAKE";
  rawSource: {
    availability: "IN_REPOSITORY" | "CHECKSUM_ONLY" | "NOT_IN_REPOSITORY";
    ref: string | null;
    textSha256: string | null;
    originalFilename: string | null;
    originalSha256: string | null;
    extractor: string | null;
    registrationId: string | null;
  };
  extraction: {
    status: "NOT_STARTED" | "CANDIDATE" | "CANONICAL";
    candidateId: string | null;
    producedBy: string | null;
  };
  canonical: { status: "NONE" | "ACCEPTED"; baselineId: string | null; checksum: string | null; objectCount: number | null };
  provenance: {
    sourceReference: string | null;
    derivation: string | null;
    extractionStatus: string | null;
    historicalClosure: string | null;
  };
  gaps: { total: number; notExplicit: string[]; sourceContentNotRecovered: string[]; runtimeExtension: string[]; publicationBlocking: string[] };
  transcriptionCorrections: string[];
  runtimeCompatibility: {
    requiredEngineVersion: string;
    engineVersion: string;
    compatible: boolean;
    extensions: CapabilityExtensionOccurrence[];
  };
  fixtures: { count: number; pass: number; governedJudgment: number; fail: number };
  governance: { reviewStatus: string; evidence: "NOT_APPLICABLE" | "CURRENT" | "MISSING" | "OUTDATED" };
  publication: { status: string; packId: string | null; packVersion: string | null; packChecksum: string | null };
  checks: FactoryCheckResult[];
  reasons: FactoryReason[];
  metrics: FactoryMetrics;
}

export interface FactoryIntakeInput {
  registration: unknown;
  originalBytes: Uint8Array | null;
  textBytes: Uint8Array | null;
  candidate?: unknown;
  acceptance?: unknown;
}

export interface FactoryCapabilityInput {
  capabilityId: string;
  intake?: FactoryIntakeInput;
  master?: {
    pipelineInput: CapabilityPipelineInput | null;
    canonical?: { baseline: unknown; rawText: string; rawBytes: Uint8Array };
  };
  governanceEvidenceOnDisk?: unknown;
}

export interface FactoryBatchInput {
  master: MasterIndex;
  capabilities: FactoryCapabilityInput[];
  extensionRegistry: unknown;
  /** Código genérico (engine, schema, pipeline, caso de uso) para detectar branching. */
  codeCorpus: { path: string; content: string }[];
  engine: { semver: string; version: string; changeIds: readonly string[]; baselineSemver: string };
  pdfRunner?: PdfTextRunner | null;
  /** Reloj inyectable para medir duración (no se escribe en artefactos). */
  now?: () => number;
}

export interface GovernanceEvidenceDossier {
  dossierType: "PRE_PUBLICATION_GOVERNANCE_EVIDENCE";
  statement: string;
  capabilityId: string;
  factoryVersion: string;
  readiness: "READY_FOR_HUMAN_PUBLICATION_AUTHORIZATION" | "NOT_READY";
  blockers: string[];
  humanAuthorization: { present: false; required: true; artifact: string; statement: string };
  historicalClosure: { marker: string | null; sourceLines: [number, number] | null; statement: string };
  identity: {
    rawOriginal: { filename: string | null; sha256: string | null };
    rawText: { ref: string | null; sha256: string | null };
    canonicalBaselineChecksum: string | null;
    executableSourceChecksum: string | null;
    packCandidate: { packId: string | null; packVersion: string | null; checksum: string | null };
  };
  transcriptionCorrections: { id: string; kind: string; detectedIn: string; correctedIn: string; objectKey: string }[];
  runtimeExtensions: { gapId: string; extensionId: string | null; semanticCapability: string | null; status: string; closedInEngineVersion: string | null }[];
  notExplicit: string[];
  governedBacklog: string[];
  transversalCandidates: number;
  engine: { current: string; required: string; semanticChangesCovered: string[] };
  checks: { check: FactoryCheck; status: FactoryCheckStatus }[];
  fixtures: { count: number; pass: number; governedJudgment: number; fail: number };
  referenceRegression: { capabilityId: string; goldenStatus: FactoryCheckStatus }[];
  checksum: string;
}

export interface FactoryBatchResult {
  entries: FactoryCapabilityEntry[];
  manifest: FactoryBatchManifest;
  dossiers: Map<string, GovernanceEvidenceDossier>;
  durationsMs: Map<string, number>;
  batchIssues: string[];
}

export interface FactoryBatchManifest {
  factoryVersion: string;
  masterIdentity: string;
  masterVersion: string;
  engineVersion: string;
  expectedCapabilityCount: number;
  registeredCapabilityCount: number;
  unregisteredSlotCount: number;
  signal: typeof AUTHORITATIVE_SOURCE_REQUIRED | "SOURCE_COMPLETE";
  domains: { domainId: string; declaredCapabilityCount: number; registered: string[]; unregisteredSlots: number }[];
  counts: { byState: Record<FactoryState, number>; byOutcome: Record<FactoryOutcome, number> };
  extensionRegistry: { checksum: string | null; open: number; closed: number; issues: string[] };
  batchIssues: string[];
  entries: FactoryCapabilityEntry[];
  checksum: string;
}

/* ------------------------------------------------------------------ */
/* Branching capability-specific                                       */
/* ------------------------------------------------------------------ */

const GLOBAL_BRANCH_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\b(?:capabilityId|packId|capability\.id|pack\.id)\s*[!=]==?\s*["'`]/, label: "comparación literal de identidad de capacidad" },
  { re: /\bcase\s+["'`][A-Z]{2}-\d{2}["'`]\s*:/, label: "switch sobre identificador de capacidad" },
];

export function detectCapabilitySpecificBranching(
  corpus: { path: string; content: string }[],
  identifiers: string[],
): { path: string; line: number; label: string; identifier: string | null }[] {
  const hits: { path: string; line: number; label: string; identifier: string | null }[] = [];
  for (const file of corpus) {
    file.content.split("\n").forEach((l, i) => {
      for (const p of GLOBAL_BRANCH_PATTERNS) if (p.re.test(l)) hits.push({ path: file.path, line: i + 1, label: p.label, identifier: null });
      for (const id of identifiers) {
        if (!id) continue;
        const quoted = new RegExp(`["'\`]${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`);
        if (quoted.test(l)) hits.push({ path: file.path, line: i + 1, label: "literal de identidad de capacidad en código genérico", identifier: id });
      }
    });
  }
  return hits;
}

/* ------------------------------------------------------------------ */
/* Evaluación por capacidad                                            */
/* ------------------------------------------------------------------ */

function statusFrom(reasons: FactoryReason[]): FactoryCheckStatus {
  if (reasons.some((r) => r.severity === "FAIL")) return "FAIL";
  if (reasons.some((r) => r.severity === "REVIEW")) return "REVIEW_REQUIRED";
  return "PASS";
}

interface Ctx {
  checks: Map<FactoryCheck, FactoryCheckResult>;
  reason(check: FactoryCheck, severity: FactoryReason["severity"], code: string, message: string, action: string, extra?: { sourceLines?: [number, number] | null; objectKey?: string | null }): void;
  set(check: FactoryCheck, status: FactoryCheckStatus): void;
}

function newCtx(): Ctx {
  const checks = new Map<FactoryCheck, FactoryCheckResult>();
  FACTORY_CHECKS.forEach((c) => checks.set(c, { check: c, status: "NOT_RUN", reasons: [] }));
  return {
    checks,
    reason(check, severity, code, message, action, extra) {
      const c = checks.get(check) as FactoryCheckResult;
      c.reasons.push({ check, code, severity, message, action, sourceLines: extra?.sourceLines ?? null, objectKey: extra?.objectKey ?? null });
      c.status = statusFrom(c.reasons);
    },
    set(check, status) {
      const c = checks.get(check) as FactoryCheckResult;
      c.status = c.reasons.length > 0 ? statusFrom(c.reasons) : status;
    },
  };
}

function emptyMetrics(): FactoryMetrics {
  return {
    rawOriginalBytes: null,
    rawTextBytes: null,
    rawTextLines: null,
    candidateItems: null,
    canonicalObjects: null,
    executableSections: null,
    checksAutoPassed: 0,
    humanReviewItems: 0,
    notExplicit: 0,
    sourceContentNotRecovered: 0,
    transcriptionIssues: 0,
    runtimeExtensionsRequired: 0,
    runtimeExtensionsClosed: 0,
    testFailures: 0,
    publicationBlockers: 0,
  };
}

interface EvalShared {
  registry: RuntimeExtensionRegistry | null;
  engine: FactoryBatchInput["engine"];
  codeCorpus: FactoryBatchInput["codeCorpus"];
  pdfRunner: PdfTextRunner | null;
  masterDomains: Set<string>;
}

function registrationChecks(ctx: Ctx, v: RawRegistrationVerification) {
  for (const i of v.issues) {
    const action =
      i.code === "ORIGINAL_INTEGRITY" || i.code === "TEXT_INTEGRITY"
        ? "restaurar el artefacto registrado; un cambio de fuente exige un registro nuevo"
        : i.code === "EXTRACTOR_UNAVAILABLE"
          ? "instalar el extractor y re-registrar"
          : i.code === "EXTRACTION_WARNING"
            ? "considerar en la extracción de candidatos"
            : "corregir el registro con knowledge:factory register";
    ctx.reason("RAW_REGISTRATION", i.severity, i.code, i.message, action);
  }
  if (!v.reextractionVerified && v.registration?.text && !v.issues.some((i) => i.severity === "FAIL"))
    ctx.reason("RAW_REGISTRATION", "INFO", "REEXTRACTION_NOT_VERIFIED", "el extractor externo no está disponible en este entorno; se verificaron solo checksums", "ejecutar la verificación donde el extractor esté instalado");
  ctx.set("RAW_REGISTRATION", "PASS");
}

function candidateChecks(ctx: Ctx, v: CandidateValidation) {
  for (const i of v.issues) {
    const action =
      i.code === "NOT_VERBATIM" || i.code === "LINE_RANGE"
        ? "corregir el texto o el rango del ítem para que sea literal"
        : i.code === "APPROVAL_EVIDENCE_MISSING"
          ? "citar la evidencia literal de aprobación o reclasificar"
          : i.code === "CONTROL_COUNT_MISMATCH"
            ? "contrastar el conteo de control con los ítems materializados"
            : i.code.startsWith("RUNTIME_EXTENSION")
              ? "registrar la ocurrencia en knowledge/factory/runtime-extensions.json"
              : i.code === "AI_ASSISTED_EXTRACTION"
                ? "revisión canónica humana del candidato"
                : "corregir el candidato";
    ctx.reason("CANDIDATE_BOUNDARY", i.severity === "FAIL" ? "FAIL" : "REVIEW", i.code, i.message, action, { sourceLines: i.sourceLines, objectKey: i.itemKey });
  }
  ctx.set("CANDIDATE_BOUNDARY", "PASS");
}

function evaluateCapability(
  input: FactoryCapabilityInput,
  pipeline: CapabilityPipelineResult | null,
  shared: EvalShared,
  onDiskEvidence: unknown,
): { entry: FactoryCapabilityEntry; dossier: GovernanceEvidenceDossier | null } {
  const ctx = newCtx();
  const metrics = emptyMetrics();
  const id = input.capabilityId;
  let state: FactoryState = "RAW_SOURCE";
  let domainId: string | null = null;

  const entry: Omit<FactoryCapabilityEntry, "state" | "outcome" | "checks" | "reasons" | "metrics"> = {
    capabilityId: id,
    domainId: null,
    sourcePath: input.master ? "MASTER" : "INTAKE",
    rawSource: { availability: "NOT_IN_REPOSITORY", ref: null, textSha256: null, originalFilename: null, originalSha256: null, extractor: null, registrationId: null },
    extraction: { status: "NOT_STARTED", candidateId: null, producedBy: null },
    canonical: { status: "NONE", baselineId: null, checksum: null, objectCount: null },
    provenance: { sourceReference: null, derivation: null, extractionStatus: null, historicalClosure: null },
    gaps: { total: 0, notExplicit: [], sourceContentNotRecovered: [], runtimeExtension: [], publicationBlocking: [] },
    transcriptionCorrections: [],
    runtimeCompatibility: { requiredEngineVersion: shared.engine.baselineSemver, engineVersion: shared.engine.semver, compatible: true, extensions: [] },
    fixtures: { count: 0, pass: 0, governedJudgment: 0, fail: 0 },
    governance: { reviewStatus: "NOT_REQUESTED", evidence: "NOT_APPLICABLE" },
    publication: { status: "UNPUBLISHED", packId: null, packVersion: null, packChecksum: null },
  };

  /* ---------------- intake ---------------- */
  let registrationOk = false;
  if (input.intake) {
    const v = verifyRawSourceRegistration({
      registration: input.intake.registration,
      expectedCapabilityId: id,
      originalBytes: input.intake.originalBytes,
      textBytes: input.intake.textBytes,
      pdfRunner: shared.pdfRunner,
    });
    registrationChecks(ctx, v);
    const reg = v.registration;
    if (reg) {
      domainId = reg.domainId;
      metrics.rawOriginalBytes = reg.original.byteLength;
      metrics.rawTextBytes = reg.text?.byteLength ?? null;
      metrics.rawTextLines = reg.text?.lineCount ?? null;
      entry.rawSource = {
        availability: input.intake.originalBytes ? "IN_REPOSITORY" : "CHECKSUM_ONLY",
        ref: reg.text?.ref ?? null,
        textSha256: reg.text?.sha256 ?? null,
        originalFilename: reg.original.filename,
        originalSha256: reg.original.sha256,
        extractor: `${reg.extraction.extractorId}@${reg.extraction.extractorVersion}`,
        registrationId: reg.registrationId,
      };
      if (!shared.masterDomains.has(reg.domainId))
        ctx.reason("RAW_REGISTRATION", "FAIL", "UNKNOWN_DOMAIN", `dominio ${reg.domainId} no declarado en master.json`, "corregir domainId del registro");
    }
    registrationOk = v.ok && !ctx.checks.get("RAW_REGISTRATION")?.reasons.some((r) => r.severity === "FAIL");
    if (registrationOk) state = "REGISTERED";

    if (registrationOk && reg && !input.master) {
      if (input.intake.candidate === undefined) {
        ctx.reason("CANDIDATE_BOUNDARY", "REVIEW", "CANDIDATE_EXTRACTION_REQUIRED", "fuente registrada sin candidato de extracción", "producir intake/<id>/candidate.json anclado a text.sha256 (herramienta, humano o IA: siempre CANDIDATE)");
      } else {
        const rawText = new TextDecoder("utf-8").decode(input.intake.textBytes ?? new Uint8Array());
        const cv = validateExtractionCandidate({ candidate: input.intake.candidate, registration: reg, rawText, extensionRegistry: shared.registry });
        candidateChecks(ctx, cv);
        state = "EXTRACTED_CANDIDATE";
        if (cv.candidate) {
          entry.extraction = { status: "CANDIDATE", candidateId: cv.candidate.candidateId, producedBy: cv.candidate.producedBy.method };
          metrics.candidateItems = cv.summary?.itemCount ?? null;
          metrics.notExplicit = cv.summary?.notExplicitCount ?? 0;
          metrics.sourceContentNotRecovered = cv.summary?.sourceContentNotRecoveredCount ?? 0;
          metrics.transcriptionIssues = cv.summary?.potentialTranscriptionDefectCount ?? 0;
          metrics.runtimeExtensionsRequired = cv.summary?.runtimeExtensionCount ?? 0;
          entry.gaps.notExplicit = cv.candidate.items.filter((i) => i.classification === "NOT_EXPLICIT").map((i) => i.key);
          entry.gaps.sourceContentNotRecovered = cv.candidate.items.filter((i) => i.classification === "SOURCE_CONTENT_NOT_RECOVERED").map((i) => i.key);
          entry.gaps.runtimeExtension = cv.candidate.items.filter((i) => i.classification === "GENERIC_RUNTIME_EXTENSION_REQUIRED").map((i) => i.key);
          entry.gaps.total = entry.gaps.notExplicit.length + entry.gaps.sourceContentNotRecovered.length + entry.gaps.runtimeExtension.length;
          entry.provenance.historicalClosure = cv.candidate.historicalStatus?.marker ?? null;
        }
        if (cv.ok) {
          state = "CANONICAL_REVIEW_REQUIRED";
          if (input.intake.acceptance === undefined) {
            ctx.reason("SOURCE_TO_CANONICAL", "REVIEW", "CANONICAL_ACCEPTANCE_REQUIRED", "el candidato no tiene aceptación canónica humana", "revisar los motivos REVIEW del candidato y registrar intake/<id>/canonical-acceptance.json con candidateChecksum vigente");
          } else {
            const prom = promoteCandidateToCanonicalBaseline({ validation: cv, acceptance: input.intake.acceptance, registration: reg, rawRef: "raw/<text>", sourceRef: "source.json" });
            if (prom.ok)
              ctx.reason("SOURCE_TO_CANONICAL", "REVIEW", "PROMOTION_PENDING", "aceptación canónica vigente; la baseline aún no está materializada en knowledge/master", "ejecutar bun run knowledge:factory -- promote <id>");
            else prom.reasons.forEach((r) => ctx.reason("SOURCE_TO_CANONICAL", "REVIEW", "PROMOTION_BLOCKED", r, "resolver antes de promover"));
          }
        }
      }
    }
  }

  /* ---------------- master ---------------- */
  let dossier: GovernanceEvidenceDossier | null = null;
  let baselineValidation: CanonicalBaselineValidation | null = null;
  let baseline: Record<string, unknown> | null = null;
  if (input.master) {
    const canonical = input.master.canonical;
    if (canonical) {
      baseline = canonical.baseline as Record<string, unknown>;
      const self = verifySelfChecksum(baseline);
      if (!self.ok) ctx.reason("SOURCE_TO_CANONICAL", "FAIL", "BASELINE_CHECKSUM", `checksum de baseline inválido (esperado ${self.expected})`, "no editar la baseline sin registrar corrección; re-sellar con knowledge:seal");
      baselineValidation = validateCanonicalBaseline({
        baseline,
        rawText: canonical.rawText,
        rawBytes: canonical.rawBytes,
        source: (input.master.pipelineInput?.source ?? undefined) as Parameters<typeof validateCanonicalBaseline>[0]["source"],
      });
      baselineValidation.issues.forEach((i) =>
        ctx.reason(i.code === "RAW_INTEGRITY" ? "RAW_REGISTRATION" : "SOURCE_TO_CANONICAL", "FAIL", i.code, `${i.path}: ${i.message}`, "restaurar la literalidad baseline↔raw o registrar una corrección de transcripción"),
      );
      const raw = (baseline["rawSource"] ?? {}) as { ref?: string; sha256?: string; byteLength?: number; lineCount?: number; transcription?: { tool?: string }; originalDocument?: { filename?: string; sha256?: string; byteLength?: number } };
      if (!input.intake) {
        entry.rawSource = {
          availability: "IN_REPOSITORY",
          ref: raw.ref ?? null,
          textSha256: raw.sha256 ?? null,
          originalFilename: raw.originalDocument?.filename ?? null,
          originalSha256: raw.originalDocument?.sha256 ?? null,
          extractor: raw.transcription?.tool ?? null,
          registrationId: null,
        };
        metrics.rawOriginalBytes = raw.originalDocument?.byteLength ?? null;
        metrics.rawTextBytes = raw.byteLength ?? null;
        metrics.rawTextLines = raw.lineCount ?? null;
        ctx.reason("RAW_REGISTRATION", "INFO", "ORIGINAL_CHECKSUM_ONLY", "el original histórico está anclado por SHA-256 en la baseline; la transcripción raw está en el repositorio", "ninguna");
        ctx.set("RAW_REGISTRATION", baselineValidation.issues.some((i) => i.code === "RAW_INTEGRITY") ? "FAIL" : "PASS");
      }
      const hs = baseline["historicalStatus"] as { marker?: string } | undefined;
      entry.provenance.historicalClosure = hs?.marker ?? null;
      entry.canonical = {
        status: "ACCEPTED",
        baselineId: (baseline["baselineId"] as string | undefined) ?? null,
        checksum: (baseline["checksum"] as string | undefined) ?? null,
        objectCount: baselineValidation.summary?.objectCount ?? null,
      };
      metrics.canonicalObjects = baselineValidation.summary?.objectCount ?? null;
      entry.transcriptionCorrections = ((baseline["transcriptionCorrections"] as { id: string }[] | undefined) ?? []).map((t) => t.id);
      metrics.transcriptionIssues = entry.transcriptionCorrections.length;
      entry.extraction.status = "CANONICAL";
      if (!ctx.checks.get("SOURCE_TO_CANONICAL")?.reasons.length) ctx.set("SOURCE_TO_CANONICAL", "PASS");
    }

    if (!input.master.pipelineInput) {
      state = "CANONICAL_REVIEW_REQUIRED";
      ctx.reason("CANONICAL_TO_PACK", "REVIEW", "EXECUTABLE_PROJECTION_MISSING", "baseline canónica aceptada sin proyección ejecutable (source.json)", "proyectar literalmente la baseline a source.json (claves verbatim) y añadir fixtures");
    }
  }

  if (pipeline) {
    const src = input.master?.pipelineInput?.source as
      | {
          capability?: { domainId?: string };
          provenance?: { sourceReference?: string; derivation?: string; extractionStatus?: string; approvedBy?: string };
          gaps?: { id: string; kind: string; publicationBlocking: boolean; resolution?: { status: string } }[];
          sections?: Record<string, unknown>;
        }
      | undefined;
    domainId = src?.capability?.domainId ?? domainId;
    const prov = src?.provenance;
    entry.provenance = {
      sourceReference: prov?.sourceReference ?? null,
      derivation: prov?.derivation ?? null,
      extractionStatus: prov?.extractionStatus ?? null,
      historicalClosure: entry.provenance.historicalClosure,
    };
    metrics.executableSections = src?.sections ? Object.keys(src.sections).length : null;
    const gaps = src?.gaps ?? [];
    entry.gaps = {
      total: gaps.length,
      notExplicit: gaps.filter((g) => g.kind === "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER").map((g) => g.id),
      sourceContentNotRecovered: gaps.filter((g) => g.kind === "SOURCE_CONTENT_NOT_RECOVERED").map((g) => g.id),
      runtimeExtension: gaps.filter((g) => g.kind === "GENERIC_RUNTIME_EXTENSION_REQUIRED").map((g) => g.id),
      publicationBlocking: gaps.filter((g) => g.publicationBlocking).map((g) => g.id),
    };
    metrics.notExplicit = entry.gaps.notExplicit.length;
    metrics.sourceContentNotRecovered = entry.gaps.sourceContentNotRecovered.length;

    // Estructural / referencial
    pipeline.sourceIssues.forEach((i) => ctx.reason("STRUCTURAL", "FAIL", "SOURCE_CONTRACT", `${i.path}: ${i.message}`, "corregir source.json"));
    if (!pipeline.candidate) pipeline.errors.forEach((e) => ctx.reason("STRUCTURAL", "FAIL", "PACK_CANDIDATE_NOT_GENERATED", e, "corregir source.json"));
    for (const stage of pipeline.validation?.stages ?? []) {
      const check: FactoryCheck | null =
        stage.stage === "STRUCTURAL" ? "STRUCTURAL" : stage.stage === "REFERENTIAL" ? "REFERENTIAL" : stage.stage === "GOVERNANCE" ? "CANONICAL_TO_PACK" : stage.stage === "RUNTIME_COMPATIBILITY" ? "RUNTIME_COMPATIBILITY" : null;
      if (!check) continue;
      stage.issues.forEach((i) =>
        ctx.reason(check, i.code === "GENERIC_RUNTIME_EXTENSION_REQUIRED" ? "REVIEW" : "FAIL", i.code, `${i.path}: ${i.message}`, check === "RUNTIME_COMPATIBILITY" ? "registrar la extensión genérica requerida" : "corregir la proyección ejecutable"),
      );
      ctx.set(check, "PASS");
    }

    // Provenance
    if (prov) {
      if (prov.extractionStatus !== "APPROVED")
        ctx.reason("PROVENANCE", "REVIEW", "EXTRACTION_NOT_APPROVED", `extractionStatus ${prov.extractionStatus}`, "completar la revisión de extracción");
      if (!prov.approvedBy) ctx.reason("PROVENANCE", "FAIL", "APPROVAL_ATTRIBUTION_MISSING", "provenance sin approvedBy", "declarar la autoridad de extracción");
      if (prov.derivation === "MASTER_TRANSCRIPTION" && !baseline)
        ctx.reason("PROVENANCE", "REVIEW", "CANONICAL_BASELINE_MISSING", "transcripción de Master sin baseline canónica anclada al raw", "materializar canonical-baseline.json");
      const marker = entry.provenance.historicalClosure;
      if (marker && !(prov.sourceReference ?? "").includes(marker))
        ctx.reason("PROVENANCE", "REVIEW", "HISTORICAL_MARKER_NOT_CITED", `sourceReference no cita el cierre histórico ${marker}`, "citar el marcador literal en provenance.sourceReference");
      if (marker)
        ctx.reason("PROVENANCE", "INFO", "HISTORICAL_CLOSURE_IS_NOT_PUBLICATION", `cierre histórico ${marker}: provenance del conocimiento, no publicación técnica`, "ninguna");
    }
    ctx.set("PROVENANCE", "PASS");
    if (!baseline) {
      ctx.set("SOURCE_TO_CANONICAL", prov?.derivation === "GOLDEN_PACK_TRANSCRIPTION" ? "NOT_APPLICABLE" : "REVIEW_REQUIRED");
      if (prov?.derivation === "GOLDEN_PACK_TRANSCRIPTION" && !input.intake) {
        ctx.reason("RAW_REGISTRATION", "INFO", "GOLDEN_TRANSCRIPTION", "fuente ejecutable transcrita de un pack publicado; el raw histórico no está en el repositorio", "ninguna");
        ctx.set("RAW_REGISTRATION", "NOT_APPLICABLE");
        entry.rawSource.availability = "NOT_IN_REPOSITORY";
      }
    }

    // Canonical → pack
    const diff = pipeline.diff;
    if (diff) {
      diff.addedContent.forEach((d) => ctx.reason("CANONICAL_TO_PACK", "FAIL", "ADDED_CONTENT", `contenido añadido sin fuente: ${d.path}`, "eliminar del pack o anclar en la fuente"));
      diff.missingSourceContent.forEach((d) => ctx.reason("CANONICAL_TO_PACK", "FAIL", "MISSING_SOURCE_CONTENT", `contenido de fuente ausente en el pack: ${d.path}`, "proyectar el contenido"));
      diff.semanticChanges.forEach((d) => ctx.reason("CANONICAL_TO_PACK", "FAIL", "SEMANTIC_CHANGE", `cambio semántico: ${d.path}`, "restaurar el texto literal"));
      diff.provenanceLoss.forEach((d) => ctx.reason("CANONICAL_TO_PACK", "FAIL", "PROVENANCE_LOSS", `pérdida de provenance: ${d.path}`, "restaurar provenance"));
    }
    (pipeline.knowledgeTests?.checks ?? [])
      .filter((k) => !k.ok)
      .forEach((k) => ctx.reason("CANONICAL_TO_PACK", "FAIL", `KNOWLEDGE_TEST_${k.id}`, k.detail, "corregir la fuente ejecutable"));
    if (pipeline.candidate) ctx.set("CANONICAL_TO_PACK", "PASS");

    // Runtime compatibility + extensiones
    const ext = resolveCapabilityExtensions({ capabilityId: id, gaps, registry: shared.registry, baselineEngineVersion: shared.engine.baselineSemver });
    entry.runtimeCompatibility = {
      requiredEngineVersion: ext.requiredEngineVersion,
      engineVersion: shared.engine.semver,
      compatible: compareSemver(ext.requiredEngineVersion, shared.engine.semver) <= 0,
      extensions: ext.occurrences,
    };
    metrics.runtimeExtensionsRequired = ext.occurrences.filter((o) => o.status !== "CLOSED").length;
    metrics.runtimeExtensionsClosed = ext.occurrences.filter((o) => o.status === "CLOSED").length;
    for (const o of ext.occurrences) {
      if (o.status === "UNREGISTERED")
        ctx.reason("RUNTIME_COMPATIBILITY", "REVIEW", "RUNTIME_EXTENSION_UNREGISTERED", `${o.gapId} no está registrado en runtime-extensions.json`, "vincular la ocurrencia a una capacidad semántica genérica", { objectKey: o.gapId });
      if (o.status === "OPEN")
        ctx.reason("RUNTIME_COMPATIBILITY", o.blocksPublication ? "REVIEW" : "INFO", "RUNTIME_EXTENSION_OPEN", `${o.gapId} → ${o.extensionId} (${o.semanticCapability}) abierta`, "extensión genérica del engine; nunca branching por capacidad", { objectKey: o.gapId });
    }
    ext.inconsistencies.forEach((m) => ctx.reason("RUNTIME_COMPATIBILITY", "FAIL", "EXTENSION_STATE_INCONSISTENT", m, "alinear source.json y runtime-extensions.json"));
    ext.danglingGapIds.forEach((g) => ctx.reason("RUNTIME_COMPATIBILITY", "FAIL", "EXTENSION_OCCURRENCE_DANGLING", `runtime-extensions.json registra ${g} y la capacidad no lo declara`, "eliminar la ocurrencia o restaurar el gap"));
    if (!entry.runtimeCompatibility.compatible)
      ctx.reason("RUNTIME_COMPATIBILITY", "FAIL", "ENGINE_TOO_OLD", `requiere engine ${ext.requiredEngineVersion}, disponible ${shared.engine.semver}`, "actualizar el engine genérico");
    ctx.set("RUNTIME_COMPATIBILITY", "PASS");

    // Fixtures
    const rr = pipeline.runtimeResults;
    entry.fixtures = {
      count: rr.length,
      pass: rr.filter((r) => r.outcome === "PASS").length,
      governedJudgment: rr.filter((r) => r.outcome === "NEEDS_GOVERNANCE_REVIEW").length,
      fail: rr.filter((r) => r.outcome === "FAIL").length,
    };
    if (rr.length === 0) ctx.reason("FIXTURES", "REVIEW", "FIXTURES_MISSING", "sin fixtures de aceptación runtime", "añadir knowledge/fixtures/<packId>/ con casos UNKNOWN, NOT_APPLICABLE y CONTRADICTORY");
    rr.filter((r) => r.outcome === "FAIL").forEach((r) =>
      ctx.reason("FIXTURES", "FAIL", "FIXTURE_FAILED", `${r.fixtureId}: ${r.mismatches.map((m) => m.path).join(", ") || "sin detalle"}`, "corregir pack o fixture (nunca el engine por capacidad)"),
    );
    if (entry.fixtures.governedJudgment > 0)
      ctx.reason("FIXTURES", "INFO", "GOVERNED_JUDGMENT_EXPECTED", `${entry.fixtures.governedJudgment} fixture(s) coinciden con su resultado esperado de revisión gobernada`, "ninguna: el runtime difiere al juicio humano como declara la fuente");
    metrics.testFailures = entry.fixtures.fail + (pipeline.knowledgeTests?.checks.filter((k) => !k.ok).length ?? 0);
    ctx.set("FIXTURES", "PASS");

    // Silencio de la fuente
    const packGaps = new Set(((pipeline.candidate?.pack as { gaps?: { id: string }[] } | undefined)?.gaps ?? []).map((g) => g.id));
    for (const g of gaps) {
      if (g.kind === "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER" && g.resolution)
        ctx.reason("SOURCE_SILENCE", "FAIL", "SILENCE_RESOLVED_WITHOUT_SOURCE", `${g.id} NOT_EXPLICIT declara resolution`, "un silencio de la fuente solo se resuelve con nueva fuente gobernada", { objectKey: g.id });
      if (pipeline.candidate && !packGaps.has(g.id))
        ctx.reason("SOURCE_SILENCE", "FAIL", "GAP_NOT_IN_PACK", `${g.id} no llega al pack`, "preservar el gap en el pack", { objectKey: g.id });
    }
    if (baseline) {
      const srcIds = new Map(gaps.map((g) => [g.id, g.kind]));
      for (const g of (baseline["gaps"] as { id: string; kind: string }[] | undefined) ?? [])
        if (srcIds.get(g.id) !== g.kind)
          ctx.reason("SOURCE_SILENCE", "FAIL", "GAP_NOT_PRESERVED", `${g.id} (${g.kind}) de la baseline no se preserva en la fuente ejecutable`, "restaurar el gap", { objectKey: g.id });
    }
    ctx.set("SOURCE_SILENCE", "PASS");

    // Golden / regresión
    const gr = pipeline.goldenRegression;
    if (gr && gr.compared) {
      if (!gr.equivalent) ctx.reason("GOLDEN_REGRESSION", "FAIL", "GOLDEN_DIVERGENCE", `el candidato difiere del pack publicado en ${gr.differences.map((d) => d.path).join(", ")}`, "restaurar la fuente o publicar una versión nueva");
      if (!gr.immutability.ok) ctx.reason("GOLDEN_REGRESSION", "FAIL", "PUBLISHED_PACK_MUTATED", gr.immutability.message, "restaurar el pack publicado");
      ctx.set("GOLDEN_REGRESSION", "PASS");
    } else ctx.set("GOLDEN_REGRESSION", "NOT_APPLICABLE");

    // Publication gate
    const pub = pipeline.publication;
    entry.publication = {
      status: pipeline.state === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED",
      packId: pipeline.candidate?.packId ?? null,
      packVersion: pipeline.candidate?.packVersion ?? null,
      packChecksum: pipeline.candidate?.checksum ?? null,
    };
    entry.governance.reviewStatus = pipeline.manifestEntry.governanceReviewStatus;
    for (const b of pub?.blockers ?? []) {
      if (b.code === "GOVERNANCE_REVIEW_PENDING")
        ctx.reason("PUBLICATION_GATE", "REVIEW", "HUMAN_PUBLICATION_AUTHORIZATION_REQUIRED", "falta autorización humana de publicación", "la autoridad de gobierno registra governance-review.json (decision, reviewer, reviewedAt) tras revisar el dossier de evidencia");
      else if (b.code === "GOVERNANCE_REVIEW_REJECTED")
        ctx.reason("PUBLICATION_GATE", "FAIL", b.code, b.message, "resolver las objeciones de gobierno");
      else ctx.reason("PUBLICATION_GATE", "FAIL", b.code, b.message, "resolver el bloqueo técnico");
    }
    metrics.publicationBlockers = (pub?.blockers ?? []).length;
    ctx.set("PUBLICATION_GATE", "PASS");

    // Branching
    const hits = detectCapabilitySpecificBranching(shared.codeCorpus, [id, pipeline.candidate?.packId ?? ""]);
    hits.forEach((h) => ctx.reason("CAPABILITY_BRANCHING", "FAIL", "CAPABILITY_SPECIFIC_BRANCHING", `${h.path}:${h.line} ${h.label}${h.identifier ? ` (${h.identifier})` : ""}`, "sustituir por un contrato genérico del pack/engine"));
    ctx.set("CAPABILITY_BRANCHING", "PASS");

    // Estado
    const technicalFail = [...ctx.checks.values()].some((c) => c.status === "FAIL");
    if (pipeline.state === "PUBLISHED" && !technicalFail) {
      state = "PUBLISHED";
      ctx.set("GOVERNANCE_EVIDENCE", "NOT_APPLICABLE");
    } else if (!pipeline.candidate || technicalFail) {
      state = "CANONICAL_REVIEW_REQUIRED";
    } else {
      state = "VALIDATED";
      dossier = buildGovernanceEvidence({ entry: { ...entry, domainId }, checks: ctx.checks, baseline, pipeline, shared, readyCandidate: true });
      const onDisk = onDiskEvidence as { checksum?: string } | undefined;
      if (onDisk === undefined) {
        entry.governance.evidence = "MISSING";
        ctx.reason("GOVERNANCE_EVIDENCE", "REVIEW", "GOVERNANCE_EVIDENCE_MISSING", "no existe dossier de evidencia de gobierno", "bun run knowledge:factory -- --write");
      } else if (onDisk.checksum !== dossier.checksum || !verifySelfChecksum(onDisk as Record<string, unknown>).ok) {
        entry.governance.evidence = "OUTDATED";
        ctx.reason("GOVERNANCE_EVIDENCE", "REVIEW", "GOVERNANCE_EVIDENCE_OUTDATED", "el dossier en disco no corresponde al estado técnico actual", "bun run knowledge:factory -- --write");
      } else {
        entry.governance.evidence = "CURRENT";
        ctx.set("GOVERNANCE_EVIDENCE", "PASS");
        if (dossier.readiness === "READY_FOR_HUMAN_PUBLICATION_AUTHORIZATION") state = "READY_FOR_PUBLICATION";
      }
    }
  }

  // No se ejecutan checks que dependen de artefactos ausentes.
  if (!pipeline) {
    for (const c of FACTORY_CHECKS) {
      const r = ctx.checks.get(c) as FactoryCheckResult;
      if (r.status === "NOT_RUN" && r.reasons.length === 0) r.status = "NOT_RUN";
    }
  }

  const checks = [...ctx.checks.values()];
  const reasons = checks.flatMap((c) => c.reasons);
  const outcome: FactoryOutcome = reasons.some((r) => r.severity === "FAIL")
    ? "FAIL"
    : reasons.some((r) => r.severity === "REVIEW")
      ? "REVIEW_REQUIRED"
      : "PASS";
  metrics.checksAutoPassed = checks.filter((c) => c.status === "PASS").length;
  metrics.humanReviewItems = reasons.filter((r) => r.severity === "REVIEW").length;

  return {
    entry: { ...entry, domainId, state, outcome, checks, reasons, metrics },
    dossier,
  };
}

/* ------------------------------------------------------------------ */
/* Dossier de evidencia de gobierno (A3)                               */
/* ------------------------------------------------------------------ */

const DOSSIER_STATEMENT =
  "Evidencia técnica automatizada para la revisión humana de gobierno. NO constituye aprobación, firma ni publicación; no contiene identidad humana.";

function buildGovernanceEvidence(input: {
  entry: Omit<FactoryCapabilityEntry, "state" | "outcome" | "checks" | "reasons" | "metrics">;
  checks: Map<FactoryCheck, FactoryCheckResult>;
  baseline: Record<string, unknown> | null;
  pipeline: CapabilityPipelineResult;
  shared: EvalShared;
  readyCandidate: boolean;
}): GovernanceEvidenceDossier {
  const { entry, baseline, pipeline, shared } = input;
  const objects = (baseline?.["objects"] as { key: string; objectType: string }[] | undefined) ?? [];
  const hs = baseline?.["historicalStatus"] as { marker: string; sourceLines: [number, number] } | undefined;
  const tcs = (baseline?.["transcriptionCorrections"] as { id: string; kind: string; detectedIn: string; correctedIn: string; objectKey: string }[] | undefined) ?? [];
  const covered = new Set<string>();
  for (const o of entry.runtimeCompatibility.extensions) {
    const e = shared.registry?.entries.find((x) => x.extensionId === o.extensionId);
    e?.engineChangeRefs.forEach((r) => covered.add(r));
  }
  const technical = FACTORY_CHECKS.filter((c) => c !== "GOVERNANCE_EVIDENCE" && c !== "PUBLICATION_GATE");
  const blockers: string[] = [];
  for (const c of technical) {
    const r = input.checks.get(c) as FactoryCheckResult;
    r.reasons.filter((x) => x.severity !== "INFO").forEach((x) => blockers.push(`${c} ${x.code}: ${x.message}`));
  }
  (input.checks.get("PUBLICATION_GATE")?.reasons ?? [])
    .filter((x) => x.code !== "HUMAN_PUBLICATION_AUTHORIZATION_REQUIRED" && x.severity !== "INFO")
    .forEach((x) => blockers.push(`PUBLICATION_GATE ${x.code}: ${x.message}`));
  entry.runtimeCompatibility.extensions
    .filter((o) => o.status !== "CLOSED")
    .forEach((o) => blockers.push(`RUNTIME_EXTENSION ${o.gapId}: ${o.status}`));
  if (!entry.runtimeCompatibility.compatible) blockers.push("engine incompatible");

  const body: Omit<GovernanceEvidenceDossier, "checksum"> = {
    dossierType: "PRE_PUBLICATION_GOVERNANCE_EVIDENCE",
    statement: DOSSIER_STATEMENT,
    capabilityId: entry.capabilityId,
    factoryVersion: FACTORY_VERSION,
    readiness: blockers.length === 0 ? "READY_FOR_HUMAN_PUBLICATION_AUTHORIZATION" : "NOT_READY",
    blockers,
    humanAuthorization: {
      present: false,
      required: true,
      artifact: `knowledge/master/<version>/capabilities/${entry.capabilityId}/governance-review.json`,
      statement: "Solo una autoridad humana de gobierno puede registrar la decisión; la Factory nunca la genera.",
    },
    historicalClosure: {
      marker: hs?.marker ?? null,
      sourceLines: hs?.sourceLines ?? null,
      statement: "Cierre histórico del conocimiento (provenance). No equivale a publicación técnica actual.",
    },
    identity: {
      rawOriginal: { filename: entry.rawSource.originalFilename, sha256: entry.rawSource.originalSha256 },
      rawText: { ref: entry.rawSource.ref, sha256: entry.rawSource.textSha256 },
      canonicalBaselineChecksum: entry.canonical.checksum,
      executableSourceChecksum: ((): string | null => {
        const s = (pipeline.candidate ? (pipeline as { candidate: { sourceChecksum?: string } }).candidate.sourceChecksum : undefined) ?? null;
        return s;
      })(),
      packCandidate: { packId: entry.publication.packId, packVersion: entry.publication.packVersion, checksum: entry.publication.packChecksum },
    },
    transcriptionCorrections: tcs.map((t) => ({ id: t.id, kind: t.kind, detectedIn: t.detectedIn, correctedIn: t.correctedIn, objectKey: t.objectKey })),
    runtimeExtensions: entry.runtimeCompatibility.extensions.map((o) => ({
      gapId: o.gapId,
      extensionId: o.extensionId,
      semanticCapability: o.semanticCapability,
      status: o.status,
      closedInEngineVersion: o.closedInEngineVersion,
    })),
    notExplicit: entry.gaps.notExplicit,
    governedBacklog: objects.filter((o) => o.objectType === "GOVERNED_BACKLOG_ITEM").map((o) => o.key),
    transversalCandidates: objects.filter((o) => o.objectType === "TRANSVERSAL_CANDIDATE").length,
    engine: { current: shared.engine.semver, required: entry.runtimeCompatibility.requiredEngineVersion, semanticChangesCovered: [...covered].sort() },
    checks: FACTORY_CHECKS.filter((c) => c !== "GOVERNANCE_EVIDENCE").map((c) => ({ check: c, status: (input.checks.get(c) as FactoryCheckResult).status })),
    fixtures: entry.fixtures,
    referenceRegression: [],
  };
  return { ...body, checksum: computeSelfChecksum(body as unknown as Record<string, unknown>) };
}

/* ------------------------------------------------------------------ */
/* Lote                                                                */
/* ------------------------------------------------------------------ */

export function runFactoryBatch(input: FactoryBatchInput): FactoryBatchResult {
  const now = input.now ?? (() => 0);
  const regValidation = validateRuntimeExtensionRegistry({
    registry: input.extensionRegistry,
    engineSemver: input.engine.semver,
    engineChangeIds: input.engine.changeIds,
  });
  const shared: EvalShared = {
    registry: regValidation.registry,
    engine: input.engine,
    codeCorpus: input.codeCorpus,
    pdfRunner: input.pdfRunner ?? null,
    masterDomains: new Set(input.master.domains.map((d) => d.id)),
  };
  const batchIssues: string[] = regValidation.issues.map((i) => `runtime-extensions ${i.code}: ${i.message}`);

  const seen = new Set<string>();
  const entries: FactoryCapabilityEntry[] = [];
  const dossiers = new Map<string, GovernanceEvidenceDossier>();
  const durationsMs = new Map<string, number>();
  const sorted = input.capabilities.slice().sort((a, b) => (a.capabilityId < b.capabilityId ? -1 : 1));

  for (const cap of sorted) {
    if (seen.has(cap.capabilityId)) {
      batchIssues.push(`capacidad duplicada en el lote: ${cap.capabilityId}`);
      continue;
    }
    seen.add(cap.capabilityId);
    const t0 = now();
    try {
      const pipeline = cap.master?.pipelineInput ? (runBatch([cap.master.pipelineInput]).results[0] ?? null) : null;
      if (pipeline && pipeline.capabilityId !== cap.capabilityId)
        throw new Error(`source.json declara ${pipeline.capabilityId} en el directorio ${cap.capabilityId}`);
      const { entry, dossier } = evaluateCapability(cap, pipeline, shared, cap.governanceEvidenceOnDisk);
      entries.push(entry);
      if (dossier) dossiers.set(cap.capabilityId, dossier);
    } catch (error) {
      const metrics = emptyMetrics();
      entries.push({
        capabilityId: cap.capabilityId,
        domainId: null,
        state: "RAW_SOURCE",
        outcome: "FAIL",
        sourcePath: cap.master ? "MASTER" : "INTAKE",
        rawSource: { availability: "NOT_IN_REPOSITORY", ref: null, textSha256: null, originalFilename: null, originalSha256: null, extractor: null, registrationId: null },
        extraction: { status: "NOT_STARTED", candidateId: null, producedBy: null },
        canonical: { status: "NONE", baselineId: null, checksum: null, objectCount: null },
        provenance: { sourceReference: null, derivation: null, extractionStatus: null, historicalClosure: null },
        gaps: { total: 0, notExplicit: [], sourceContentNotRecovered: [], runtimeExtension: [], publicationBlocking: [] },
        transcriptionCorrections: [],
        runtimeCompatibility: { requiredEngineVersion: input.engine.baselineSemver, engineVersion: input.engine.semver, compatible: false, extensions: [] },
        fixtures: { count: 0, pass: 0, governedJudgment: 0, fail: 0 },
        governance: { reviewStatus: "NOT_REQUESTED", evidence: "NOT_APPLICABLE" },
        publication: { status: "UNPUBLISHED", packId: null, packVersion: null, packChecksum: null },
        checks: [],
        reasons: [
          {
            check: "STRUCTURAL",
            code: "ISOLATED_EXCEPTION",
            severity: "FAIL",
            message: `excepción aislada: ${(error as Error).message}`,
            action: "corregir los artefactos de esta capacidad; el resto del lote no se ve afectado",
            sourceLines: null,
            objectKey: null,
          },
        ],
        metrics,
      });
    }
    durationsMs.set(cap.capabilityId, Math.max(0, now() - t0));
  }

  // Regresión de referencia: capacidades publicadas con Golden PASS.
  const references = entries
    .filter((e) => e.state === "PUBLISHED")
    .map((e) => ({ capabilityId: e.capabilityId, goldenStatus: e.checks.find((c) => c.check === "GOLDEN_REGRESSION")?.status ?? "NOT_RUN" }));
  for (const [capId, d] of dossiers) {
    const { checksum: _c, ...rest } = d;
    const withRefs = { ...rest, referenceRegression: references };
    if (references.some((r) => r.goldenStatus !== "PASS")) withRefs.blockers = [...withRefs.blockers, "regresión de la capacidad de referencia no PASS"];
    withRefs.readiness = withRefs.blockers.length === 0 ? "READY_FOR_HUMAN_PUBLICATION_AUTHORIZATION" : "NOT_READY";
    dossiers.set(capId, { ...withRefs, checksum: computeSelfChecksum(withRefs as unknown as Record<string, unknown>) });
  }

  const vs = input.master.verticalStatus as { domainClosures?: { domainId: string; declaredCapabilityCount: number }[] } | undefined;
  const closures = vs?.domainClosures ?? input.master.domains.map((d) => ({ domainId: d.id, declaredCapabilityCount: 0 }));
  const domains = closures.map((d) => {
    const registered = entries.filter((e) => e.domainId === d.domainId).map((e) => e.capabilityId);
    if (registered.length > d.declaredCapabilityCount)
      batchIssues.push(`dominio ${d.domainId}: ${registered.length} capacidades registradas > ${d.declaredCapabilityCount} declaradas`);
    return { domainId: d.domainId, declaredCapabilityCount: d.declaredCapabilityCount, registered, unregisteredSlots: Math.max(0, d.declaredCapabilityCount - registered.length) };
  });
  const unregisteredSlotCount = Math.max(0, input.master.expectedCapabilityCount - entries.length);
  const byState = Object.fromEntries(FACTORY_STATES.map((s) => [s, 0])) as Record<FactoryState, number>;
  const byOutcome: Record<FactoryOutcome, number> = { PASS: 0, REVIEW_REQUIRED: 0, FAIL: 0 };
  entries.forEach((e) => {
    byState[e.state] += 1;
    byOutcome[e.outcome] += 1;
  });
  const body: Omit<FactoryBatchManifest, "checksum"> = {
    factoryVersion: FACTORY_VERSION,
    masterIdentity: input.master.identity,
    masterVersion: input.master.version,
    engineVersion: input.engine.version,
    expectedCapabilityCount: input.master.expectedCapabilityCount,
    registeredCapabilityCount: entries.length,
    unregisteredSlotCount,
    signal: unregisteredSlotCount > 0 ? AUTHORITATIVE_SOURCE_REQUIRED : "SOURCE_COMPLETE",
    domains,
    counts: { byState, byOutcome },
    extensionRegistry: {
      checksum: regValidation.registry?.checksum ?? null,
      open: regValidation.registry?.entries.filter((e) => e.status === "OPEN").length ?? 0,
      closed: regValidation.registry?.entries.filter((e) => e.status === "CLOSED").length ?? 0,
      issues: regValidation.issues.map((i) => `${i.code}: ${i.message}`),
    },
    batchIssues,
    entries,
  };
  return {
    entries,
    manifest: { ...body, checksum: computeChecksum(body) },
    dossiers,
    durationsMs,
    batchIssues,
  };
}

/* ------------------------------------------------------------------ */
/* Reportes                                                            */
/* ------------------------------------------------------------------ */

export function buildFactoryBenchmarkMarkdown(result: FactoryBatchResult, durations?: Map<string, number>): string {
  const m = result.manifest;
  const rows = result.entries.map((e) => {
    const x = e.metrics;
    const d = durations?.get(e.capabilityId);
    return `| ${e.capabilityId} | ${e.state} | ${e.outcome} | ${x.rawOriginalBytes ?? "—"} | ${x.rawTextLines ?? "—"} | ${x.candidateItems ?? "—"} | ${x.canonicalObjects ?? "—"} | ${x.checksAutoPassed} | ${x.humanReviewItems} | ${x.notExplicit} | ${x.sourceContentNotRecovered} | ${x.transcriptionIssues} | ${x.runtimeExtensionsRequired}/${x.runtimeExtensionsClosed} | ${x.testFailures} | ${x.publicationBlockers}${durations ? ` | ${d ?? "—"}` : ""} |`;
  });
  const lines = [
    `# Knowledge Factory · benchmark de lote`,
    "",
    `Factory ${m.factoryVersion} · engine ${m.engineVersion} · Master ${m.masterIdentity} ${m.masterVersion}`,
    "",
    `Registradas ${m.registeredCapabilityCount}/${m.expectedCapabilityCount} · slots sin fuente ${m.unregisteredSlotCount} · señal ${m.signal}`,
    "",
    `Por resultado: PASS=${m.counts.byOutcome.PASS} REVIEW_REQUIRED=${m.counts.byOutcome.REVIEW_REQUIRED} FAIL=${m.counts.byOutcome.FAIL}`,
    "",
    `| Capacidad | Estado | Resultado | Bytes original | Líneas raw | Candidatos | Canónicos | Checks auto PASS | Revisión humana | NOT_EXPLICIT | SCNR | Transcripción | Ext. runtime abiertas/cerradas | Fallos test | Bloqueos publicación${durations ? " | ms" : ""} |`,
    `|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---${durations ? "|---" : ""}|`,
    ...rows,
    "",
    "Coste en tokens/créditos: no expuesto programáticamente por la plataforma; no se estima.",
    "",
    "## Motivos accionables",
    "",
  ];
  for (const e of result.entries) {
    const rs = e.reasons.filter((r) => r.severity !== "INFO");
    lines.push(`### ${e.capabilityId} · ${e.outcome}`);
    if (rs.length === 0) lines.push("- sin motivos pendientes");
    rs.forEach((r) =>
      lines.push(`- **${r.severity}** \`${r.check}/${r.code}\`${r.objectKey ? ` [${r.objectKey}]` : ""}${r.sourceLines ? ` (líneas ${r.sourceLines[0]}–${r.sourceLines[1]})` : ""}: ${r.message} → ${r.action}`),
    );
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}
