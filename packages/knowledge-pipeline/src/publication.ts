/**
 * Publication gate.
 *
 *   DRAFT → VALIDATED → PUBLISHED → SUPERSEDED
 *
 * Un pack no pasa a PUBLISHED si falla schema, falla validación referencial,
 * falta procedencia, contiene inferencia no autorizada, necesita una extensión
 * genérica de runtime aún no aprobada, o contiene un gap clasificado como
 * publication-blocking. Un pack PUBLISHED es inmutable.
 */
import { computeChecksum } from "./checksum.ts";
import type { PackCandidate } from "./generator.ts";
import type { KnowledgeGap } from "./master.ts";
import type { KnowledgeTestReport } from "./knowledge-tests.ts";
import type { RuntimeAcceptanceResult } from "./runtime-harness.ts";
import type { ValidationPipelineResult } from "./validators.ts";

export const PUBLICATION_STATES = ["DRAFT", "VALIDATED", "PUBLISHED", "SUPERSEDED"] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export type BlockerCode =
  | "SCHEMA_VALIDATION_FAILED"
  | "REFERENTIAL_VALIDATION_FAILED"
  | "PROVENANCE_MISSING"
  | "UNAUTHORIZED_INFERENCE"
  | "GENERIC_RUNTIME_EXTENSION_REQUIRED"
  | "PUBLICATION_BLOCKING_GAP"
  | "KNOWLEDGE_TEST_FAILED"
  | "RUNTIME_ACCEPTANCE_FAILED"
  | "GOVERNANCE_REVIEW_PENDING"
  | "GOVERNANCE_REVIEW_REJECTED";

export interface PublicationBlocker {
  code: BlockerCode;
  message: string;
}

export interface GovernanceReview {
  decision: "APPROVED" | "REJECTED" | "PENDING";
  reviewer?: string;
  reviewedAt?: string;
  note?: string;
}

export interface PublicationGateResult {
  state: PublicationState;
  blockers: PublicationBlocker[];
  requiresGovernanceReview: boolean;
  /** true solo si ninguna etapa técnica falló. */
  technicallyValid: boolean;
}

export function evaluatePublicationGate(input: {
  validation: ValidationPipelineResult;
  knowledgeTests: KnowledgeTestReport;
  runtimeResults: RuntimeAcceptanceResult[];
  gaps: KnowledgeGap[];
  governanceReview?: GovernanceReview;
}): PublicationGateResult {
  const blockers: PublicationBlocker[] = [];
  const codigos = new Set(input.validation.issues.map((i) => i.code));

  if (codigos.has("SCHEMA_INVALID")) {
    blockers.push({
      code: "SCHEMA_VALIDATION_FAILED",
      message: "el pack no cumple el contrato estructural",
    });
  }
  if (
    input.validation.issues.some(
      (i) => i.stage === "REFERENTIAL" || i.code === "NEED_ACQUISITION_MISMATCH",
    )
  ) {
    blockers.push({
      code: "REFERENTIAL_VALIDATION_FAILED",
      message: "existen referencias internas sin resolver",
    });
  }
  if (codigos.has("PROVENANCE_MISSING")) {
    blockers.push({ code: "PROVENANCE_MISSING", message: "falta procedencia requerida" });
  }
  if (
    codigos.has("UNAUTHORIZED_INFERENCE") ||
    codigos.has("DETERMINISTIC_RULE_WITHOUT_EXPLICIT_BASIS")
  ) {
    blockers.push({
      code: "UNAUTHORIZED_INFERENCE",
      message: "el candidato contiene contenido o conclusiones no autorizadas por la fuente",
    });
  }
  if (input.validation.requiresGenericRuntimeExtension) {
    blockers.push({
      code: "GENERIC_RUNTIME_EXTENSION_REQUIRED",
      message: "el pack exige una extensión genérica de runtime todavía no aprobada",
    });
  }
  input.gaps
    .filter((gap) => gap.publicationBlocking)
    .forEach((gap) =>
      blockers.push({ code: "PUBLICATION_BLOCKING_GAP", message: `${gap.id} · ${gap.kind}` }),
    );
  if (!input.knowledgeTests.ok) {
    blockers.push({
      code: "KNOWLEDGE_TEST_FAILED",
      message: input.knowledgeTests.checks
        .filter((c) => !c.ok)
        .map((c) => c.check)
        .join(", "),
    });
  }
  const fallosRuntime = input.runtimeResults.filter((r) => r.outcome === "FAIL");
  if (fallosRuntime.length > 0) {
    blockers.push({
      code: "RUNTIME_ACCEPTANCE_FAILED",
      message: fallosRuntime.map((r) => r.fixtureId).join(", "),
    });
  }

  const technicallyValid = blockers.length === 0;
  const revisionRuntime = input.runtimeResults.some((r) => r.outcome === "NEEDS_GOVERNANCE_REVIEW");
  const review = input.governanceReview ?? { decision: "PENDING" as const };

  if (technicallyValid && review.decision === "REJECTED") {
    blockers.push({
      code: "GOVERNANCE_REVIEW_REJECTED",
      message: review.note ?? "gobierno editorial rechazó la capacidad",
    });
  }
  if (technicallyValid && review.decision === "PENDING") {
    blockers.push({ code: "GOVERNANCE_REVIEW_PENDING", message: "falta aprobación de gobierno" });
  }

  let state: PublicationState = "DRAFT";
  if (technicallyValid && review.decision === "APPROVED") state = "PUBLISHED";
  else if (technicallyValid) state = "VALIDATED";

  return {
    state,
    blockers,
    requiresGovernanceReview: revisionRuntime || review.decision !== "APPROVED",
    technicallyValid,
  };
}

export interface PublishedPackRecord {
  packId: string;
  packVersion: string;
  checksum: string;
  status: Extract<PublicationState, "PUBLISHED" | "SUPERSEDED">;
}

export interface ImmutabilityResult {
  ok: boolean;
  expected: string;
  actual: string;
  message: string;
}

/**
 * Inmutabilidad: una versión publicada no puede modificarse silenciosamente.
 * Un cambio de contenido exige una versión nueva y SUPERSEDED para la anterior.
 */
export function assertPublishedPackUnchanged(
  registro: PublishedPackRecord,
  pack: unknown,
): ImmutabilityResult {
  const actual = computeChecksum(pack);
  const ok = actual === registro.checksum;
  return {
    ok,
    expected: registro.checksum,
    actual,
    message: ok
      ? `${registro.packId}@${registro.packVersion} conserva su checksum publicado`
      : `${registro.packId}@${registro.packVersion} fue modificado sin nueva versión: una versión publicada es inmutable`,
  };
}

/** Checksum comparable de un candidato ya generado. */
export function candidateChecksum(candidate: PackCandidate): string {
  return computeChecksum(candidate.pack);
}
