/**
 * KNOW-EXEC-14-B · Pruebas de aceptación del evaluador aislado R-OP04-02.
 * V01–V12, D11 positivas/negativas, independencia CAUSE-0, D4 inactivo,
 * cero hallazgos, ausencia de predicados e inmutabilidad del artefacto.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  structuralRuleArtifactSchema,
  isolatedEvaluationResultSchema,
  type GovernedReviewRecord,
} from "@pymapa/knowledge-schema";
import {
  evaluateIsolatedROp0402,
  type IsolatedEvaluationContext,
  type IsolatedEvaluationInput,
} from "./r-op04-02-evaluator";

const STRUCTURAL = "knowledge/staging/OP-04/r-op04-02-structural.json";
const structuralBefore = readFileSync(STRUCTURAL, "utf8");
const fixture = JSON.parse(readFileSync("knowledge/staging/OP-04/scenarios-v01-v12.json", "utf8"));
const ctx = fixture.context as IsolatedEvaluationContext;
type Scenario = {
  id: string;
  input: IsolatedEvaluationInput;
  review: GovernedReviewRecord | null;
  expected: { semanticState: string; resolvedBy: string; reviewRejections: string[] };
};
const scenarios = fixture.scenarios as Scenario[];
const byId = (id: string) => scenarios.find((s) => s.id === id)!;
const run = (s: Scenario, review?: unknown) =>
  evaluateIsolatedROp0402(s.input, ctx, review === undefined ? (s.review ?? undefined) : review);

describe("KNOW-EXEC-14-B · V01–V12", () => {
  it("el fixture contiene exactamente V01–V12 sintéticos", () => {
    expect(scenarios.map((s) => s.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `V${String(i + 1).padStart(2, "0")}`),
    );
    expect(fixture.environment).toBe("STAGING_SYNTHETIC");
    expect(ctx.grants.every((g) => g.institutional === false)).toBe(true);
  });

  for (const s of scenarios) {
    it(`${s.id} · ${s.expected.semanticState}`, () => {
      const r = run(s);
      expect(isolatedEvaluationResultSchema.safeParse(r).success).toBe(true);
      expect(r.semanticState).toBe(s.expected.semanticState);
      expect(r.resolvedBy).toBe(s.expected.resolvedBy);
      expect(r.reviewRejections).toEqual(s.expected.reviewRejections);
      expect(r.findingsEmitted).toBe(0);
      expect(r.findingAuthorization).toEqual({ authorizationActive: false, emissionActive: false });
      expect(r.conditionsAutomated).toBe(0);
      expect(r.productiveWrites).toBe(0);
    });
  }
});

describe("KNOW-EXEC-14-B · D11 revisión gobernada", () => {
  const base = byId("V05");
  const valid = base.review!;
  const rejects = (mut: Partial<GovernedReviewRecord> | Record<string, unknown>) => {
    const r = run(base, { ...valid, ...mut });
    expect(r.semanticState).toBe("GOVERNED_REVIEW_REQUIRED");
    expect(r.reviewApplied).toBeNull();
    return r.reviewRejections;
  };

  it("positiva: autoridad sintética válida, vigente, en alcance y con evidencia del input", () => {
    const r = run(base);
    expect(r.resolvedBy).toBe("GOVERNED_REVIEW");
    expect(r.reviewApplied).toBe("REV-V05");
    expect(r.preReviewState).toBe("GOVERNED_REVIEW_REQUIRED");
  });
  it("sin autoridad conocida", () => expect(rejects({ authorityRef: "NO-EXISTE" })).toContain("UNKNOWN_AUTHORITY"));
  it("rol no autorizado", () => expect(rejects({ reviewerRole: "MEMBER" })).toContain("ROLE_NOT_AUTHORIZED"));
  it("vencida", () =>
    expect(rejects({ reviewedAt: "2026-01-01T00:00:00.000Z", validUntil: "2026-02-01T00:00:00.000Z" })).toContain(
      "EXPIRED",
    ));
  it("fuera de alcance", () => expect(rejects({ scope: "OP-04:R-OP04-03" })).toContain("OUT_OF_SCOPE"));
  it("versión distinta", () => expect(rejects({ targetVersion: "9.9.9" })).toContain("VERSION_MISMATCH"));
  it("sin evidencia requerida (vacía)", () => expect(rejects({ evidenceReviewedRefs: [] })).toEqual(["MALFORMED_RECORD"]));
  it("evidencia ajena al input", () =>
    expect(rejects({ evidenceReviewedRefs: ["SYN-EV-FANTASMA"] })).toContain("EVIDENCE_NOT_IN_INPUT"));
  it("sin justificación sustantiva", () =>
    expect(rejects({ substantiveJustification: "" })).toEqual(["MALFORMED_RECORD"]));
  it("entorno no sintético (autoridad real simulada)", () =>
    expect(rejects({ environment: "PRODUCTION" })).toEqual(["MALFORMED_RECORD"]));
  it("estado previo no coincidente", () =>
    expect(rejects({ priorEvaluationState: "CONFLICTING_INFORMATION" })).toContain("PRIOR_STATE_MISMATCH"));
  it("revisión no solicitada no puede sobrescribir una abstención", () => {
    const r = run(byId("V01"), { ...valid, priorEvaluationState: "INSUFFICIENT_EVIDENCE" });
    expect(r.semanticState).toBe("INSUFFICIENT_EVIDENCE");
    expect(r.reviewRejections).toContain("REVIEW_NOT_REQUESTED");
  });
});

describe("KNOW-EXEC-14-B · protecciones", () => {
  it("V09 · CAUSE-0 independiente: misma decisión con y sin causa declarada", () => {
    const v09 = run(byId("V09"));
    const v04 = run(byId("V04"));
    expect(v09.semanticState).toBe(v04.semanticState);
    expect(v09.reasons).toEqual(v04.reasons);
    expect(v09.causeAttribution).toEqual({ declared: "OP-01", affectsDecision: false });
    for (const cause of ["OP-02", "OP-03", "DT", "PC", "otra causa"]) {
      expect(evaluateIsolatedROp0402({ ...byId("V04").input, declaredCause: cause }, ctx).semanticState).toBe(
        v04.semanticState,
      );
    }
  });

  it("sin revisión, ningún escenario llega a una conclusión sustantiva", () => {
    for (const s of scenarios) {
      const r = evaluateIsolatedROp0402(s.input, ctx);
      expect(["CONDITION_SATISFIED", "CONDITION_NOT_SATISFIED"]).not.toContain(r.semanticState);
    }
  });

  it("D4 inactivo y cero hallazgos en todos los casos; OP04-HF02 nunca aparece", () => {
    for (const s of scenarios) {
      const r = run(s);
      expect(r.findingsEmitted).toBe(0);
      expect(JSON.stringify(r)).not.toContain("OP04-HF02");
    }
  });

  it("determinismo: misma entrada, mismo resultado", () => {
    for (const s of scenarios) expect(run(s)).toEqual(run(s));
  });

  it("el evaluador no importa Engine, runtime ni base de datos", () => {
    const src = readFileSync("packages/knowledge-pipeline/src/r-op04-02-evaluator.ts", "utf8");
    expect(src).not.toMatch(/knowledge-engine|supabase|src\/lib\/production|node:fs|fetch\(/);
  });

  it("artefacto estructural intacto y aún NOT_EVALUATED", () => {
    for (const s of scenarios) run(s);
    const after = readFileSync(STRUCTURAL, "utf8");
    expect(after).toBe(structuralBefore);
    const art = structuralRuleArtifactSchema.parse(JSON.parse(after));
    expect(art.decision.technicalState).toBe("NOT_EVALUATED");
    expect(art.decision.semanticState).toBeNull();
  });
});
