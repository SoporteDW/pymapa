/**
 * Orquestación del pipeline industrial.
 *
 *   Governed Knowledge Source → Capability Source Extraction → Pack Candidate
 *   → Schema Validation → Semantic/Referential Validation → Fixtures
 *   → Knowledge Tests → Runtime Acceptance Tests → Human/Governance Review
 *   → VALIDATED → PUBLISHED
 *
 * Generar un Pack Candidate NO equivale a conocimiento aprobado.
 */
import { compareWithGoldenPack, generatePackCandidate, type PackCandidate } from "./generator.ts";
import { sourceToPackDiff, type SourceToPackDiff } from "./diff.ts";
import { runKnowledgeTests, type KnowledgeTestReport } from "./knowledge-tests.ts";
import {
  validateCapabilitySource,
  type CapabilitySource,
  type CapabilityPipelineState,
} from "./master.ts";
import type { CapabilityManifestEntry } from "./manifest.ts";
import {
  assertPublishedPackUnchanged,
  evaluatePublicationGate,
  type GovernanceReview,
  type PublicationGateResult,
  type PublishedPackRecord,
  type ImmutabilityResult,
} from "./publication.ts";
import { runRuntimeAcceptance, type RuntimeAcceptanceResult } from "./runtime-harness.ts";
import { runValidationPipeline, type ValidationPipelineResult } from "./validators.ts";

export type CapabilityOutcome = "PASS" | "FAIL" | "REVIEW_REQUIRED";

export interface CapabilityPipelineInput {
  /** Fuente gobernada sin validar (se valida dentro del pipeline). */
  source: unknown;
  fixtures?: unknown[];
  governanceReview?: GovernanceReview;
  /** Registro del pack publicado, si la capacidad ya está publicada. */
  publishedPack?: { record: PublishedPackRecord; pack: unknown };
}

export interface CapabilityPipelineResult {
  capabilityId: string;
  outcome: CapabilityOutcome;
  state: CapabilityPipelineState;
  /** Fuente rechazada: el pipeline se detiene sin generar candidato. */
  sourceIssues: { path: string; message: string }[];
  candidate: PackCandidate | null;
  validation: ValidationPipelineResult | null;
  knowledgeTests: KnowledgeTestReport | null;
  runtimeResults: RuntimeAcceptanceResult[];
  diff: SourceToPackDiff | null;
  publication: PublicationGateResult | null;
  /** Regresión Golden Pack: el candidato no altera el pack publicado. */
  goldenRegression:
    | {
        compared: true;
        equivalent: boolean;
        differences: { path: string }[];
        immutability: ImmutabilityResult;
      }
    | { compared: false }
    | null;
  manifestEntry: CapabilityManifestEntry;
  errors: string[];
}

function entradaVacia(
  capabilityId: string,
  state: CapabilityPipelineState,
): CapabilityManifestEntry {
  return {
    capabilityId,
    domainId: "",
    sourceAvailability: state === "SOURCE_MISSING" ? "SOURCE_MISSING" : "SOURCE_READY",
    sourceVersion: null,
    sourceReference: null,
    extractionStatus: "NOT_STARTED",
    packId: null,
    packVersion: null,
    packStatus: state,
    schemaValidation: "NOT_RUN",
    semanticValidation: "NOT_RUN",
    fixtureStatus: "NONE",
    runtimeTestStatus: "NOT_RUN",
    governanceReviewStatus: "NOT_REQUESTED",
    publicationStatus: "UNPUBLISHED",
    gapCount: 0,
    publicationBlockingGapCount: 0,
    checksum: null,
  };
}

export function runCapabilityPipeline(input: CapabilityPipelineInput): CapabilityPipelineResult {
  const validada = validateCapabilitySource(input.source);
  const idDeclarado =
    (input.source as { capability?: { id?: string } } | null)?.capability?.id ?? "desconocido";

  if (!validada.ok) {
    return {
      capabilityId: idDeclarado,
      outcome: "FAIL",
      state: "SOURCE_MISSING",
      sourceIssues: validada.issues,
      candidate: null,
      validation: null,
      knowledgeTests: null,
      runtimeResults: [],
      diff: null,
      publication: null,
      goldenRegression: null,
      manifestEntry: entradaVacia(idDeclarado, "SOURCE_MISSING"),
      errors: ["la fuente gobernada no cumple su contrato; no se genera Pack Candidate"],
    };
  }

  const source: CapabilitySource = validada.value;
  const generado = generatePackCandidate(source);
  if (!generado.ok) {
    const entry = entradaVacia(source.capability.id, "EXTRACTED");
    entry.domainId = source.capability.domainId;
    entry.sourceVersion = source.master.version;
    entry.sourceReference = source.provenance.sourceReference;
    entry.extractionStatus = source.provenance.extractionStatus;
    entry.gapCount = source.gaps.length;
    entry.publicationBlockingGapCount = source.gaps.filter((g) => g.publicationBlocking).length;
    return {
      capabilityId: source.capability.id,
      outcome: "FAIL",
      state: "VALIDATION_FAILED",
      sourceIssues: [],
      candidate: null,
      validation: null,
      knowledgeTests: null,
      runtimeResults: [],
      diff: null,
      publication: null,
      goldenRegression: null,
      manifestEntry: { ...entry, packStatus: "VALIDATION_FAILED" },
      errors: generado.issues.map((i) => `${i.code} ${i.path}: ${i.message}`),
    };
  }

  const candidate = generado.candidate;
  const validation = runValidationPipeline({ source, candidate });
  const diff = sourceToPackDiff(source, candidate.pack);
  const knowledgeTests = runKnowledgeTests({ candidate, source });
  const runtimeResults = (input.fixtures ?? []).map((fixture) =>
    runRuntimeAcceptance({ pack: candidate.pack, fixture }),
  );

  const publication = evaluatePublicationGate({
    validation,
    knowledgeTests,
    runtimeResults,
    gaps: source.gaps,
    ...(input.governanceReview ? { governanceReview: input.governanceReview } : {}),
  });

  let goldenRegression: CapabilityPipelineResult["goldenRegression"] = { compared: false };
  if (input.publishedPack) {
    const comparacion = compareWithGoldenPack(
      candidate.pack,
      input.publishedPack.pack as Record<string, unknown>,
    );
    goldenRegression = {
      compared: true,
      equivalent: comparacion.equivalent,
      differences: comparacion.differences.map((d) => ({ path: d.path })),
      immutability: assertPublishedPackUnchanged(
        input.publishedPack.record,
        input.publishedPack.pack,
      ),
    };
  }

  const errors: string[] = [];
  if (goldenRegression && goldenRegression.compared) {
    if (!goldenRegression.equivalent) {
      errors.push(
        `el candidato difiere del Golden Pack en: ${goldenRegression.differences.map((d) => d.path).join(", ")}`,
      );
    }
    if (!goldenRegression.immutability.ok) errors.push(goldenRegression.immutability.message);
  }

  const bloqueosTecnicos = publication.blockers.filter(
    (b) => b.code !== "GOVERNANCE_REVIEW_PENDING" && b.code !== "GOVERNANCE_REVIEW_REJECTED",
  );

  let outcome: CapabilityOutcome;
  let state: CapabilityPipelineState;
  if (bloqueosTecnicos.length > 0 || errors.length > 0) {
    outcome = "FAIL";
    state = "VALIDATION_FAILED";
  } else if (publication.state === "PUBLISHED") {
    outcome = "PASS";
    state = "PUBLISHED";
  } else if (publication.requiresGovernanceReview) {
    outcome = "REVIEW_REQUIRED";
    state = publication.state === "VALIDATED" ? "VALIDATED" : "NEEDS_GOVERNANCE_REVIEW";
  } else {
    outcome = "PASS";
    state = "VALIDATED";
  }

  const revision = input.governanceReview?.decision;
  const manifestEntry: CapabilityManifestEntry = {
    capabilityId: source.capability.id,
    domainId: source.capability.domainId,
    sourceAvailability: "SOURCE_READY",
    sourceVersion: source.master.version,
    sourceReference: source.provenance.sourceReference,
    extractionStatus: source.provenance.extractionStatus,
    packId: candidate.packId,
    packVersion: candidate.packVersion,
    packStatus: state,
    schemaValidation: validation.stages.find((s) => s.stage === "STRUCTURAL")?.ok ? "PASS" : "FAIL",
    semanticValidation:
      validation.stages.find((s) => s.stage === "REFERENTIAL")?.ok &&
      validation.stages.find((s) => s.stage === "GOVERNANCE")?.ok
        ? "PASS"
        : "FAIL",
    fixtureStatus: runtimeResults.length > 0 ? "PRESENT" : "NONE",
    runtimeTestStatus:
      runtimeResults.length === 0
        ? "NOT_RUN"
        : runtimeResults.some((r) => r.outcome === "FAIL")
          ? "FAIL"
          : runtimeResults.some((r) => r.outcome === "NEEDS_GOVERNANCE_REVIEW")
            ? "REVIEW_REQUIRED"
            : "PASS",
    governanceReviewStatus:
      revision === "APPROVED"
        ? "APPROVED"
        : revision === "REJECTED"
          ? "REJECTED"
          : revision === "PENDING"
            ? "PENDING"
            : "NOT_REQUESTED",
    publicationStatus: state === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED",
    gapCount: source.gaps.length,
    publicationBlockingGapCount: source.gaps.filter((g) => g.publicationBlocking).length,
    checksum: candidate.checksum,
  };

  return {
    capabilityId: source.capability.id,
    outcome,
    state,
    sourceIssues: [],
    candidate,
    validation,
    knowledgeTests,
    runtimeResults,
    diff,
    publication,
    goldenRegression,
    manifestEntry,
    errors,
  };
}

export interface BatchResult {
  results: CapabilityPipelineResult[];
  summary: { capabilityId: string; outcome: CapabilityOutcome; state: CapabilityPipelineState }[];
  counts: Record<CapabilityOutcome, number>;
}

/** Un fallo en una capacidad nunca invalida el resto del lote. */
export function runBatch(entradas: CapabilityPipelineInput[]): BatchResult {
  const results: CapabilityPipelineResult[] = entradas.map((entrada) => {
    try {
      return runCapabilityPipeline(entrada);
    } catch (error) {
      const id =
        (entrada.source as { capability?: { id?: string } } | null)?.capability?.id ??
        "desconocido";
      return {
        capabilityId: id,
        outcome: "FAIL",
        state: "VALIDATION_FAILED",
        sourceIssues: [],
        candidate: null,
        validation: null,
        knowledgeTests: null,
        runtimeResults: [],
        diff: null,
        publication: null,
        goldenRegression: null,
        manifestEntry: entradaVacia(id, "VALIDATION_FAILED"),
        errors: [`excepción aislada en la capacidad ${id}: ${(error as Error).message}`],
      } satisfies CapabilityPipelineResult;
    }
  });

  const counts: Record<CapabilityOutcome, number> = { PASS: 0, FAIL: 0, REVIEW_REQUIRED: 0 };
  results.forEach((r) => {
    counts[r.outcome] += 1;
  });

  return {
    results,
    summary: results.map((r) => ({
      capabilityId: r.capabilityId,
      outcome: r.outcome,
      state: r.state,
    })),
    counts,
  };
}
