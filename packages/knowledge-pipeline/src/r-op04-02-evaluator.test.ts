/** KNOW-EXEC-15-B · Expectativas cotejadas con el Excel definitivo DEC-050. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { structuralRuleArtifactSchema, isolatedEvaluationResultSchema, type GovernedReviewRecord } from "@pymapa/knowledge-schema";
import { evaluateIsolatedROp0402, type IsolatedEvaluationContext, type IsolatedEvaluationInput } from "./r-op04-02-evaluator";

const STRUCTURAL = "knowledge/staging/OP-04/r-op04-02-structural.json";
const structuralBefore = readFileSync(STRUCTURAL, "utf8");
const fixture = JSON.parse(readFileSync("knowledge/staging/OP-04/scenarios-v01-v12.json", "utf8"));
const ctx = fixture.context as IsolatedEvaluationContext;
type Scenario = { id: string; input: IsolatedEvaluationInput; review: GovernedReviewRecord | null };
const scenarios = fixture.scenarios as Scenario[];
const byId = (id: string) => {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) throw new Error(`Missing canonical scenario ${id}`);
  return scenario;
};
const run = (s: Scenario, review?: unknown) => evaluateIsolatedROp0402(s.input, ctx, review === undefined ? (s.review ?? undefined) : review);
// Independientes del expected mutable del fixture; valores del Excel definitivo.
const canonicalStates = ["CONDITION_SATISFIED", "CONDITION_NOT_SATISFIED", "CONDITION_NOT_SATISFIED", "INSUFFICIENT_EVIDENCE", "INSUFFICIENT_EVIDENCE", "CONFLICTING_INFORMATION", "NOT_APPLICABLE", "GOVERNED_REVIEW_REQUIRED", "INSUFFICIENT_EVIDENCE", "CONDITION_SATISFIED", "INSUFFICIENT_EVIDENCE", null];

describe("KNOW-EXEC-15-B · V01–V12 cotejados", () => {
  scenarios.forEach((s, i) => {
    it(`${s.id} · ${canonicalStates[i] ?? "NOT_EVALUATED"}`, () => {
      const r = run(s);
      expect(r.semanticState).toBe(canonicalStates[i]);
      expect(r.resolvedBy).toBe(s.id === "V12" ? "NOT_STARTED" : ["V01", "V02", "V03", "V07", "V10"].includes(s.id) ? "GOVERNED_REVIEW" : "EVALUATOR_GATE");
      expect(r.reviewRejections).toEqual([]);
      if (s.id === "V12") {
        expect(r).toMatchObject({ technicalState: "NOT_EVALUATED", preReviewState: null, semanticState: null });
      }
      expect(isolatedEvaluationResultSchema.safeParse(r).success).toBe(true);
      expect(r.findingsEmitted).toBe(0);
      expect(r.findingAuthorization).toEqual({ authorizationActive: false, emissionActive: false });
      expect(r.conditionsAutomated).toBe(0);
      expect(r.productiveWrites).toBe(0);
    });
  });
});

describe("KNOW-EXEC-15-B · D11", () => {
  const base = byId("V01");
  const valid = base.review;
  if (!valid) throw new Error("V01 requires a governed synthetic closure");
  const rejects = (mut: Partial<GovernedReviewRecord> | Record<string, unknown>) => {
    const r = run(base, { ...valid, ...mut });
    expect(r.semanticState).toBe("GOVERNED_REVIEW_REQUIRED");
    expect(r.reviewApplied).toBeNull();
    return r.reviewRejections;
  };
  it("positiva: autoridad, evidencia, fuentes, criterios y cierre D05 trazables", () => {
    expect(run(base)).toMatchObject({ resolvedBy: "GOVERNED_REVIEW", reviewApplied: "REV-V01", preReviewState: "GOVERNED_REVIEW_REQUIRED" });
  });
  it("rechaza autoridad desconocida", () => expect(rejects({ authorityRef: "NO-EXISTE" })).toContain("UNKNOWN_AUTHORITY"));
  it("rechaza rol no autorizado", () => expect(rejects({ reviewerRole: "MEMBER" })).toContain("ROLE_NOT_AUTHORIZED"));
  it("rechaza revisión vencida", () => expect(rejects({ reviewedAt: "2026-01-01T00:00:00.000Z", validUntil: "2026-02-01T00:00:00.000Z" })).toContain("EXPIRED"));
  it("rechaza revisión futura", () => expect(rejects({ reviewedAt: "2026-11-01T00:00:00.000Z" })).toContain("EXPIRED"));
  it("rechaza alcance ajeno", () => expect(rejects({ scope: "OP-04:R-OP04-03" })).toContain("OUT_OF_SCOPE"));
  it("rechaza regla ajena", () => expect(rejects({ ruleId: "R-OP04-03" })).toContain("OUT_OF_SCOPE"));
  it("rechaza variable ajena", () => expect(rejects({ variableRef: "VA01" })).toContain("OUT_OF_SCOPE"));
  it("rechaza versión distinta", () => expect(rejects({ targetVersion: "9.9.9" })).toContain("VERSION_MISMATCH"));
  it("rechaza evidencia vacía", () => expect(rejects({ evidenceReviewedRefs: [] })).toEqual(["MALFORMED_RECORD"]));
  it("rechaza evidencia ajena", () => expect(rejects({ evidenceReviewedRefs: ["SYN-EV-FANTASMA"] })).toContain("EVIDENCE_NOT_IN_INPUT"));
  it("rechaza fuentes ajenas", () => expect(rejects({ sourceRefs: ["SYN-SRC-FANTASMA"] })).toContain("EVIDENCE_NOT_IN_INPUT"));
  it("rechaza criterios vacíos", () => expect(rejects({ criterionRefs: [] })).toEqual(["MALFORMED_RECORD"]));
  it("rechaza justificación vacía", () => expect(rejects({ substantiveJustification: "" })).toEqual(["MALFORMED_RECORD"]));
  it("rechaza entorno no sintético", () => expect(rejects({ environment: "PRODUCTION" })).toEqual(["MALFORMED_RECORD"]));
  it("rechaza estado previo distinto", () => expect(rejects({ priorEvaluationState: "CONFLICTING_INFORMATION" })).toContain("PRIOR_STATE_MISMATCH"));
  it("no sobrescribe insuficiencia adquisible por mero registro D11", () => {
    const r = run(byId("V05"), { ...valid, priorEvaluationState: "INSUFFICIENT_EVIDENCE" });
    expect(r.semanticState).toBe("INSUFFICIENT_EVIDENCE");
    expect(r.reviewRejections).toContain("REVIEW_NOT_REQUESTED");
  });
  it("conflicto preservado antes de revisión válida", () => {
    const s = byId("V06");
    const review = { ...valid, caseId: "V06", priorEvaluationState: "CONFLICTING_INFORMATION", sourceRefs: ["SYN-SRC-A", "SYN-SRC-B"], evidenceReviewedRefs: s.input.entry.responses.flatMap((r) => r.evidenceRefs), governedResolution: "INSUFFICIENT_EVIDENCE" };
    expect(run(s, review)).toMatchObject({ preReviewState: "CONFLICTING_INFORMATION", semanticState: "INSUFFICIENT_EVIDENCE", resolvedBy: "GOVERNED_REVIEW" });
  });
  it("V12 no aplica D11 ni inicia evaluación", () => {
    expect(run(byId("V12"), valid)).toMatchObject({ semanticState: null, preReviewState: null, technicalState: "NOT_EVALUATED", reviewRejections: ["REVIEW_NOT_REQUESTED"] });
  });
});

describe("KNOW-EXEC-15-B · NOT_APPLICABLE sustentado", () => {
  const v07 = byId("V07");
  it("declaración sin evidencia conserva insuficiencia", () => {
    const input = structuredClone(v07.input);
    input.entry.responses[0].evidenceRefs = [];
    expect(evaluateIsolatedROp0402(input, ctx)).toMatchObject({ semanticState: "INSUFFICIENT_EVIDENCE", reasons: expect.arrayContaining(["APPLICABILITY_CONTEXT_NOT_SUBSTANTIATED"]) });
  });
  it("referencias sin verificación contextual requieren D11, no exclusión automática", () => {
    expect(evaluateIsolatedROp0402(v07.input, ctx)).toMatchObject({ semanticState: "GOVERNED_REVIEW_REQUIRED", reviewApplied: null });
  });
  it("exclusión de alcance verificada por D11 válida se admite", () => {
    expect(run(v07)).toMatchObject({ semanticState: "NOT_APPLICABLE", resolvedBy: "GOVERNED_REVIEW", reviewApplied: "REV-V07" });
  });
  it("inaplicabilidad no acreditada no se acepta por revisión sin autoridad", () => {
    expect(run(v07, { ...v07.review, authorityRef: "NO-EXISTE" })).toMatchObject({ semanticState: "GOVERNED_REVIEW_REQUIRED", reviewRejections: ["UNKNOWN_AUTHORITY"] });
  });
  it("sin alcance verificado no se admite exclusión", () => {
    expect(run(v07, { ...v07.review, scope: "OTRO-ALCANCE" }).semanticState).toBe("GOVERNED_REVIEW_REQUIRED");
  });
});

describe("KNOW-EXEC-15-B · protecciones", () => {
  it("V09 CAUSE-0 independiente; no imputa capacidad", () => {
    const s = byId("V09");
    const r = run(s);
    expect(r.causeAttribution).toEqual({ declared: "CAUSE-0", affectsDecision: false });
    for (const cause of [null, "CAUSE-0", "OP-01", "OP-02", "OP-03", "DT", "PC"]) {
      const other = evaluateIsolatedROp0402({ ...s.input, declaredCause: cause }, ctx);
      expect(other.semanticState).toBe(r.semanticState);
      expect(other.reasons).toEqual(r.reasons);
    }
  });
  it("causa desconocida no cancela una condición acreditada", () => {
    expect(run(byId("V01"))).toMatchObject({ semanticState: "CONDITION_SATISFIED", causeAttribution: { declared: "CAUSE-0", affectsDecision: false } });
  });
  it("sin revisión no se evalúa C1–C4 ni se concluye exclusión", () => {
    for (const s of scenarios) expect(["CONDITION_SATISFIED", "CONDITION_NOT_SATISFIED", "NOT_APPLICABLE"]).not.toContain(evaluateIsolatedROp0402(s.input, ctx).semanticState);
  });
  it("D4 inactivo y cero hallazgos incluso en V10", () => {
    for (const s of scenarios) {
      const r = run(s);
      expect(r.findingsEmitted).toBe(0);
      expect(r.findingAuthorization).toEqual({ authorizationActive: false, emissionActive: false });
      expect(JSON.stringify(r)).not.toContain("OP04-HF02");
    }
  });
  it("determinismo y entradas intactas", () => {
    for (const s of scenarios) {
      const before = JSON.stringify(s);
      expect(run(s)).toEqual(run(s));
      expect(JSON.stringify(s)).toBe(before);
    }
  });
  it("sin Engine, runtime, base de datos ni acceso externo", () => {
    expect(readFileSync("packages/knowledge-pipeline/src/r-op04-02-evaluator.ts", "utf8")).not.toMatch(/knowledge-engine|supabase|src\/lib\/production|node:fs|fetch\(/);
  });
  it("D1–D4 y artefacto estructural permanecen intactos", () => {
    for (const s of scenarios) run(s);
    expect(readFileSync(STRUCTURAL, "utf8")).toBe(structuralBefore);
    expect(structuralRuleArtifactSchema.parse(JSON.parse(structuralBefore)).decision).toMatchObject({ technicalState: "NOT_EVALUATED", semanticState: null });
  });
});
