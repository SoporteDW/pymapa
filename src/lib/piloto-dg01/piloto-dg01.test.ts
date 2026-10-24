import { describe, expect, it } from "vitest";
import { crearCandidatoPack } from "./candidato-pack";
import { ESCENARIOS, entradaPilotoSchema } from "./escenarios";
import { evaluarPiloto } from "./evaluador-piloto";

describe("DEC-049 · DG01-VERTICAL-01 · Engine real", () => {
  for (const scenario of ESCENARIOS) {
    it(`${scenario.id}: ${scenario.name} · estados y trazabilidad real`, () => {
      const result = evaluarPiloto(scenario.input);
      const variable = result.evaluation.variableEvaluations.find((v) => v.variableRef === "VA01");
      expect(result.engineVersion).toBe("pymapa-knowledge-engine/0.2.0");
      expect(variable?.state).toBe(scenario.input.state);
      expect(variable?.detail.observationIds).toEqual(result.observations.map((o) => o.id));
      expect(result.evaluation.pendingJudgments).toContainEqual(expect.objectContaining({ ruleRef: "R-DG01-01", classification: "GOVERNED_JUDGMENT" }));
      expect(result.demonstration.confirmedFindings).toEqual([]);
      if (scenario.input.state === "KNOWN") {
        expect(variable?.semanticValue).toBe(scenario.input.statement);
        expect(result.evaluation.findingCandidates).toHaveLength(1);
        expect(result.evaluation.findingCandidates[0]).toMatchObject({ findingRef: "PILOT-DG01-F01", lifecycleState: "NEEDS_REVIEW", deterministicallyConfirmable: false, ruleRefs: ["R-DG01-01"], variableRefs: ["VA01"], supportingObservationIds: ["PILOT-OBS-A"], supportingEvidenceIds: [] });
      } else {
        expect(result.evaluation.findingCandidates).toEqual([]);
        const expected = { UNKNOWN: "AWAITING_INFORMATION", CONTRADICTORY: "BLOCKED_BY_CONTRADICTION", NOT_APPLICABLE: "EXCLUDED_NOT_APPLICABLE" };
        expect(result.evaluation.findingsAwaitingResolution).toHaveLength(1);
        expect(result.evaluation.findingsAwaitingResolution[0]?.status).toBe(expected[scenario.input.state]);
        if (scenario.input.state === "CONTRADICTORY") {
          expect(result.evaluation.contradictions[0]?.conflictingObservationIds).toEqual(expect.arrayContaining(["PILOT-OBS-A", "PILOT-OBS-B", "PILOT-OBS-CONFLICT"]));
        }
      }
    });
  }
  it("no aplica un predicado semántico inventado a los relatos positivo y adverso", () => {
    const [adverse, positive] = ESCENARIOS.filter((s) => s.id === "S1" || s.id === "S2");
    if (!adverse || !positive) throw new Error("Escenarios obligatorios ausentes");
    expect(evaluarPiloto(adverse.input).evaluation.findingCandidates).toEqual(evaluarPiloto(positive.input).evaluation.findingCandidates);
  });
  it("preserva el silencio canónico de evidencia mínima y la regla no implementada", () => {
    const pack = crearCandidatoPack();
    expect(pack.variables[0]?.minimumEvidence).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
    expect(pack.variables[0]?.semanticStates).toBeNull();
    expect(pack.rules?.[0]).toMatchObject({ id: "R-DG01-01", classification: "GOVERNED_JUDGMENT", implemented: false });
  });
  it("exige justificación de no aplicabilidad", () => {
    expect(entradaPilotoSchema.safeParse({ state: "NOT_APPLICABLE", statement: "", notApplicableReason: "" }).success).toBe(false);
  });
  it("exige las dos fuentes de una contradicción", () => {
    expect(entradaPilotoSchema.safeParse({ state: "CONTRADICTORY", statement: "Fuente A", conflictingStatement: "" }).success).toBe(false);
  });
});