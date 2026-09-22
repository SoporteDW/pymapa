/**
 * Runtime acceptance harness genérico.
 *
 *   Knowledge Pack + Fixture → Knowledge Engine → Actual → Expected
 *                            → PASS / FAIL / NEEDS_GOVERNANCE_REVIEW
 *
 * Ejecuta cualquier capacidad sin modificar el engine y sin branching por
 * capabilityId.
 */
import { createKnowledgeEngine, ENGINE_VERSION } from "@pymapa/knowledge-engine";
import type { EngineObservation } from "@pymapa/knowledge-engine";
import type { CapabilityFixture } from "./fixtures.ts";
import { validateFixture } from "./fixtures.ts";

export type RuntimeOutcome = "PASS" | "FAIL" | "NEEDS_GOVERNANCE_REVIEW";

export interface RuntimeAcceptanceResult {
  fixtureId: string;
  capabilityId: string;
  packId: string;
  kind: CapabilityFixture["kind"];
  outcome: RuntimeOutcome;
  engineVersion: string;
  /** Diferencias entre resultado real y esperado. */
  mismatches: { path: string; expected: unknown; actual: unknown }[];
  observed: {
    variableStates: { variableRef: string; state: string; semanticValue: string | null }[];
    needsReview: boolean;
    contradictionVariableRefs: string[];
    findingCandidateRefs: string[];
    findingsAwaitingResolution: { findingRef: string; status: string }[];
    confirmedFindings: number;
  };
  note: string;
}

export function runRuntimeAcceptance(input: {
  pack: unknown;
  fixture: unknown;
}): RuntimeAcceptanceResult {
  const validada = validateFixture(input.fixture);
  if (!validada.ok) {
    const bruto = input.fixture as Partial<CapabilityFixture>;
    return {
      fixtureId: bruto.fixtureId ?? "desconocido",
      capabilityId: bruto.capabilityId ?? "desconocido",
      packId: bruto.packId ?? "desconocido",
      kind: bruto.kind ?? "ARCHITECTURE_RUNTIME",
      outcome: "FAIL",
      engineVersion: ENGINE_VERSION,
      mismatches: validada.issues.map((i) => ({
        path: i.path,
        expected: "fixture válido",
        actual: i.message,
      })),
      observed: {
        variableStates: [],
        needsReview: false,
        contradictionVariableRefs: [],
        findingCandidateRefs: [],
        findingsAwaitingResolution: [],
        confirmedFindings: 0,
      },
      note: "el fixture no cumple su contrato",
    };
  }

  const fixture = validada.fixture;
  const engine = createKnowledgeEngine(input.pack);
  const mismatches: RuntimeAcceptanceResult["mismatches"] = [];

  const observaciones: EngineObservation[] = fixture.observations.map((obs) => ({
    id: obs.id,
    variableRef: obs.variableRef,
    acquisitionRef: obs.acquisitionRef,
    knowledgeState: obs.knowledgeState,
    semanticValue: obs.semanticValue,
    sourceResponseId: obs.sourceResponseId,
    respondentId: obs.respondentId ?? null,
    evidenceIds: obs.evidenceIds ?? [],
    notApplicableReason: obs.notApplicableReason ?? null,
    conflictingObservationIds: obs.conflictingObservationIds ?? [],
    recordedAt: obs.recordedAt,
  }));

  observaciones.forEach((obs, i) => {
    const admisible = engine.validateObservation(obs);
    if (!admisible.ok) {
      mismatches.push({
        path: `observations.${i}`,
        expected: "observación admisible según el pack",
        actual: admisible.reason,
      });
    }
  });

  const evaluacion = engine.evaluate({
    observations: observaciones,
    knowledgeVersionId: fixture.knowledgeVersionId,
  });

  const observed = {
    variableStates: evaluacion.variableEvaluations.map((v) => ({
      variableRef: v.variableRef,
      state: v.state,
      semanticValue: v.semanticValue,
    })),
    needsReview: evaluacion.needsReview,
    contradictionVariableRefs: evaluacion.contradictions.map((c) => c.variableRef),
    findingCandidateRefs: evaluacion.findingCandidates.map((f) => f.findingRef),
    findingsAwaitingResolution: evaluacion.findingsAwaitingResolution.map((f) => ({
      findingRef: f.findingRef,
      status: f.status,
    })),
    confirmedFindings: evaluacion.findings.length,
  };

  fixture.expected.variableStates.forEach((esperada) => {
    const real = observed.variableStates.find((v) => v.variableRef === esperada.variableRef);
    if (!real) {
      mismatches.push({
        path: `variableStates.${esperada.variableRef}`,
        expected: esperada.state,
        actual: null,
      });
      return;
    }
    if (real.state !== esperada.state) {
      mismatches.push({
        path: `variableStates.${esperada.variableRef}.state`,
        expected: esperada.state,
        actual: real.state,
      });
    }
    if (esperada.semanticValue !== undefined && real.semanticValue !== esperada.semanticValue) {
      mismatches.push({
        path: `variableStates.${esperada.variableRef}.semanticValue`,
        expected: esperada.semanticValue,
        actual: real.semanticValue,
      });
    }
  });

  if (
    fixture.expected.needsReview !== undefined &&
    observed.needsReview !== fixture.expected.needsReview
  ) {
    mismatches.push({
      path: "needsReview",
      expected: fixture.expected.needsReview,
      actual: observed.needsReview,
    });
  }

  if (fixture.expected.contradictionVariableRefs) {
    const esperadas = [...fixture.expected.contradictionVariableRefs].sort();
    const reales = [...observed.contradictionVariableRefs].sort();
    if (JSON.stringify(esperadas) !== JSON.stringify(reales)) {
      mismatches.push({ path: "contradictions", expected: esperadas, actual: reales });
    }
  }

  if (fixture.expected.findingCandidateRefs) {
    const esperadas = [...fixture.expected.findingCandidateRefs].sort();
    const reales = [...observed.findingCandidateRefs].sort();
    if (JSON.stringify(esperadas) !== JSON.stringify(reales)) {
      mismatches.push({ path: "findingCandidates", expected: esperadas, actual: reales });
    }
  }

  if (fixture.expected.findingsAwaitingResolution) {
    const clave = (f: { findingRef: string; status: string }) => `${f.findingRef}:${f.status}`;
    const esperadas = fixture.expected.findingsAwaitingResolution.map(clave).sort();
    const reales = observed.findingsAwaitingResolution.map(clave).sort();
    if (JSON.stringify(esperadas) !== JSON.stringify(reales)) {
      mismatches.push({ path: "findingsAwaitingResolution", expected: esperadas, actual: reales });
    }
  }

  if (fixture.expected.noConfirmedFindings && observed.confirmedFindings !== 0) {
    mismatches.push({ path: "findings", expected: 0, actual: observed.confirmedFindings });
  }

  let outcome: RuntimeOutcome = mismatches.length === 0 ? "PASS" : "FAIL";
  if (outcome === "PASS" && fixture.expected.outcome === "NEEDS_GOVERNANCE_REVIEW") {
    outcome = "NEEDS_GOVERNANCE_REVIEW";
  }

  return {
    fixtureId: fixture.fixtureId,
    capabilityId: fixture.capabilityId,
    packId: fixture.packId,
    kind: fixture.kind,
    outcome,
    engineVersion: ENGINE_VERSION,
    mismatches,
    observed,
    note:
      outcome === "NEEDS_GOVERNANCE_REVIEW"
        ? (fixture.expected.note ??
          "el resultado coincide con lo esperado y requiere revisión gobernada, no inferencia")
        : (fixture.expected.note ?? "comparación determinística fixture ↔ runtime"),
  };
}
