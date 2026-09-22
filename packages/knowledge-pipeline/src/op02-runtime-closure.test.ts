/**
 * M2-OP02-02 · Generic Runtime Compatibility Closure.
 *
 * Certifica que el ciclo de vida de OP-02 (CRV por patrón, Done, efectividad,
 * atribución, decisión, follow-up, reassessment, severidad/confianza
 * contextuales) corre por el engine genérico, que la proyección es literal y
 * que OP-01 Golden conserva sus bytes y su comportamiento gobernado.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createKnowledgeEngine, type EngineObservation } from "@pymapa/knowledge-engine";
import { validateKnowledgePack } from "@pymapa/knowledge-schema";
import { generatePackCandidate, loadCanonicalBaselines } from "./index.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const DIR = join(ROOT, "knowledge", "master", "v1.0", "capabilities", "OP-02");
const source = JSON.parse(readFileSync(join(DIR, "source.json"), "utf8"));
const raw = readFileSync(join(DIR, "raw", "OP-02_Completo.txt"), "utf8");
const cb = loadCanonicalBaselines(ROOT, "v1.0").find((c) => c.capabilityDir === "OP-02");
if (!cb) throw new Error("falta la baseline canónica de OP-02");
const baseline = cb.baseline as { objects: { sourceId: string | null }[] };

const generado = generatePackCandidate(source);
if (!generado.ok) throw new Error("OP-02 no genera candidato");
const op02Pack = generado.candidate.pack as Record<string, unknown>;
const op02 = createKnowledgeEngine(op02Pack);
const op01Pack = JSON.parse(
  readFileSync(join(ROOT, "knowledge", "packs", "op-01", "1.0.0", "pack.json"), "utf8"),
) as Record<string, unknown>;
const op01 = createKnowledgeEngine(op01Pack);

const clonar = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const obs = (
  id: string,
  variableRef: string,
  knowledgeState: EngineObservation["knowledgeState"],
  acquisitionRef: string,
  extra: Partial<EngineObservation> = {},
): EngineObservation => ({
  id,
  variableRef,
  acquisitionRef,
  knowledgeState,
  semanticValue: knowledgeState === "KNOWN" ? "declaración" : null,
  sourceResponseId: `resp-${id}`,
  respondentId: "r1",
  evidenceIds: [],
  notApplicableReason: knowledgeState === "NOT_APPLICABLE" ? "no aplica al caso" : null,
  conflictingObservationIds: knowledgeState === "CONTRADICTORY" ? ["a", "b"] : [],
  recordedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const LIFECYCLE = [
  "interventionPatterns",
  "implementationModel",
  "effectivenessModel",
  "attributionModel",
  "validationModel",
  "followUp",
  "reassessment",
  "severity",
  "contextualization",
  "engineActions",
  "validationRequirements",
] as const;
const LITERAL_KEYS = new Set([
  "name",
  "statement",
  "definition",
  "label",
  "meaning",
  "action",
  "objective",
  "purpose",
  "minimumActivities",
  "loop",
  "decision",
  "basis",
  "negativeOutcomeBasis",
  "recordFields",
]);

describe("M2-OP02-02 · proyección literal del ciclo de vida", () => {
  it("todas las secciones de ciclo de vida están proyectadas y el pack es válido", () => {
    LIFECYCLE.forEach((k) => expect(Object.keys(source.sections)).toContain(k));
    expect(validateKnowledgePack(op02Pack).ok).toBe(true);
  });

  it("todo texto proyectado es literal de la fuente", () => {
    const noLiterales: string[] = [];
    const recorrer = (v: unknown, clave: string | null, path: string) => {
      if (typeof v === "string") {
        if (clave && LITERAL_KEYS.has(clave) && !raw.includes(v)) noLiterales.push(`${path}: ${v}`);
      } else if (Array.isArray(v)) v.forEach((x, i) => recorrer(x, clave, `${path}[${i}]`));
      else if (v && typeof v === "object")
        Object.entries(v as Record<string, unknown>).forEach(([k, x]) => recorrer(x, k, `${path}.${k}`));
    };
    LIFECYCLE.forEach((k) => recorrer(source.sections[k], null, k));
    expect(noLiterales).toEqual([]);
  });

  it("no inventa identificadores: todo id proyectado existe en la baseline canónica", () => {
    const conocidos = new Set(baseline.objects.map((o) => o.sourceId).filter(Boolean));
    const inventados: string[] = [];
    const recorrer = (v: unknown, clave: string | null) => {
      if (typeof v === "string" && (clave === "id" || (clave?.endsWith("Ref") ?? false) || clave?.endsWith("Refs"))) {
        if (!conocidos.has(v)) inventados.push(`${clave}=${v}`);
      } else if (Array.isArray(v)) v.forEach((x) => recorrer(x, clave));
      else if (v && typeof v === "object")
        Object.entries(v as Record<string, unknown>).forEach(([k, x]) => recorrer(x, k));
    };
    LIFECYCLE.forEach((k) => recorrer(source.sections[k], null));
    expect(inventados).toEqual([]);
  });

  it("fórmulas silenciadas por la fuente siguen NOT_EXPLICIT", () => {
    const s = source.sections;
    expect(s.attributionModel.formula).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
    expect(s.severity.formula).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
    expect(s.followUp.frequencyFormula).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
    expect(s.confidence.formula).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
    (s.findings as { severity: string }[]).forEach((f) =>
      expect(f.severity).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER"),
    );
  });
});

describe("M2-OP02-02 · CRV con dueño de patrón y juicio gobernado", () => {
  it("9 CRV pertenecen a patrones IP01–IP08, ninguno a una Activity", () => {
    const crvs = op02.listValidationRequirements();
    expect(crvs.map((c) => c.requirementRef)).toEqual([
      "CRV-01", "CRV-02", "CRV-03", "CRV-04", "CRV-05", "CRV-06A", "CRV-06B", "CRV-07", "CRV-08",
    ]);
    crvs.forEach((c) => {
      expect(c.owner.kind).toBe("INTERVENTION_PATTERN");
      expect(c.activityRef).toBeNull();
      expect(c.evaluation).toBe("GOVERNED_JUDGMENT");
      expect(c.isScore).toBe(false);
    });
    expect(op02.getValidationRequirementsForOwner("INTERVENTION_PATTERN", "IP06").map((c) => c.name)).toEqual([
      "Consistencia",
      "Flujo",
    ]);
    expect(op02.getValidationRequirementForActivity("IP01")).toBeNull();
  });

  it("el runtime nunca satisface solo un CRV de juicio gobernado", () => {
    const r = op02.evaluateValidationRequirement("CRV-03", {
      primaryExecutorRespondentId: "a",
      cases: [1, 2, 3].map((i) => ({ sequenceIndex: i, executorRespondentId: "b", outcome: "CORRECT" as const, criticalAssistance: false })),
    });
    expect(r.status).toBe("REVIEW_REQUIRED");
    expect(r.satisfied).toBe(false);
  });

  it("juicio humano: exige persona, evidencia (KPI no basta) y la condición justificante", () => {
    const base = { judgment: "SATISFIED" as const, judgedBy: "u1", evidenceIds: ["ev1"], justifyingFindingRefs: ["OP02-HF02"] };
    expect(op02.assessValidationRequirementJudgment("CRV-03", base).status).toBe("SATISFIED");
    expect(op02.assessValidationRequirementJudgment("CRV-03", { ...base, judgedBy: null }).admissible).toBe(false);
    const soloKpi = op02.assessValidationRequirementJudgment("CRV-03", { ...base, evidenceIds: [], kpiRefs: ["KPI-x"] });
    expect(soloKpi.admissible).toBe(false);
    expect(soloKpi.issues.join(" ")).toMatch(/KPI no sustituye evidencia/);
    const sinJustificacion = op02.assessValidationRequirementJudgment("CRV-03", { ...base, justifyingFindingRefs: [] });
    expect(sinJustificacion.admissible).toBe(false);
    expect(sinJustificacion.unmetConditionIds).toContain("VAL-OP02-03");
    expect(op02.assessValidationRequirementJudgment("CRV-99", base).issues).toEqual([
      "VALIDATION_REQUIREMENT_NOT_EXPLICIT",
    ]);
  });
});

describe("M2-OP02-02 · Done / implementación (Done ≠ CRV ≠ efectividad)", () => {
  const capas = (evidenciaC: boolean) => [
    { layerRef: "DC-A", completed: true },
    { layerRef: "DC-B", completed: true },
    { layerRef: "DC-C", completed: true, evidenceIds: evidenciaC ? ["ev-uso"] : [] },
  ];
  const todos = (n: number) => Array.from({ length: n }, (_, i) => ({ position: i + 1, met: true }));

  it("I3 exige DC-A/DC-B/DC-C, evidencia de adopción y todos los Done Criteria", () => {
    const ok = op02.evaluateImplementation("IP01", { layerRecords: capas(true), doneCriteriaRecords: todos(5) });
    expect(ok.executionStateRef).toBe("I3");
    expect(ok.implemented).toBe(true);
    expect(ok.validationRequirementSatisfied).toBeNull();
    expect(ok.effectivenessStateRef).toBeNull();

    const sinEvidencia = op02.evaluateImplementation("IP01", { layerRecords: capas(false), doneCriteriaRecords: todos(5) });
    expect(sinEvidencia.implemented).toBe(false);
    expect(sinEvidencia.layersMissingEvidence).toEqual(["DC-C"]);

    const faltaCriterio = op02.evaluateImplementation("IP01", {
      layerRecords: capas(true),
      doneCriteriaRecords: todos(4),
      assertedExecutionStateRef: "I3",
    });
    expect(faltaCriterio.implemented).toBe(false);
    expect(faltaCriterio.unmetDoneCriteriaPositions).toEqual([5]);
    expect(faltaCriterio.issues.join(" ")).toMatch(/I3 declarado sin cumplir/);
  });

  it("criterios sin ID se direccionan por posición; estados previos son juicio gobernado", () => {
    const ip02 = op02.listInterventionPatterns().find((p) => p.patternRef === "IP02");
    expect(ip02?.doneCriteria.every((c) => c.id === null)).toBe(true);
    const parcial = op02.evaluateImplementation("IP02", {
      layerRecords: [{ layerRef: "DC-A", completed: true }],
      doneCriteriaRecords: [],
      assertedExecutionStateRef: "I1",
    });
    expect(parcial.executionStateRef).toBe("I1");
    expect(parcial.stateSelection).toBe("GOVERNED_JUDGMENT");
  });

  it("un patrón sin Done Criteria explícitos nunca alcanza I3 de forma vacía", () => {
    const r = op02.evaluateImplementation("IP05", { layerRecords: capas(true), doneCriteriaRecords: [] });
    expect(r.implemented).toBe(false);
    expect(r.issues.join(" ")).toMatch(/DONE_CRITERIA_NOT_EXPLICIT/);
  });
});

describe("M2-OP02-02 · efectividad, atribución, decisión, follow-up y reassessment", () => {
  const base = {
    requirementRef: "CRV-03",
    implementationStateRef: "I3",
    effectivenessStateRef: "R4",
    validationRequirementStatus: "SATISFIED" as const,
    attributionConfidenceRef: "AC2",
    unintendedNegativeOutcome: false,
    evidenceIds: ["ev1"],
    validatedBy: "u1",
  };

  it("R4 → SUSTAIN y follow-up gobernado; nunca madurez ni score", () => {
    const r = op02.assessValidation(base);
    expect(r.admissible).toBe(true);
    expect(r.decisions).toEqual([
      { decision: "SUSTAIN", action: "mantener y pasar a seguimiento proporcional.", selection: "DETERMINISTIC" },
    ]);
    expect(r.followUp).toMatchObject({ triggered: true, ruleRefs: ["FOLLOWUP-OP02-01"], status: "REVIEW_REQUIRED" });
    expect(r.followUp.frequencyFormula).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
    expect(r.reassessment.triggered).toBe(false);
    expect(r.isMaturity).toBe(false);
    expect(r.isScore).toBe(false);
  });

  it("VAL-OP02-01: sin I3 no se atribuye efectividad", () => {
    const r = op02.assessValidation({ ...base, implementationStateRef: "I1" });
    expect(r.admissible).toBe(false);
    expect(r.issues.join(" ")).toMatch(/VAL-OP02-01/);
    expect(r.decisions).toEqual([]);
  });

  it("R4 exige CRV satisfecho y evidencia (KPI no basta)", () => {
    expect(op02.assessValidation({ ...base, validationRequirementStatus: "NOT_SATISFIED" }).admissible).toBe(false);
    const kpi = op02.assessValidation({ ...base, evidenceIds: [], kpiRefs: ["KPI-1"] });
    expect(kpi.issues.join(" ")).toMatch(/KPI no sustituye evidencia/);
  });

  it("R2 → REASSESS + reassessment con el bucle literal; distinto de follow-up", () => {
    const r = op02.assessValidation({ ...base, effectivenessStateRef: "R2", validationRequirementStatus: "NOT_SATISFIED" });
    expect(r.decisions.map((d) => d.decision)).toEqual(["REASSESS"]);
    expect(r.reassessment).toMatchObject({
      triggered: true,
      status: "REVIEW_REQUIRED",
      loop: "hallazgo → hipótesis causal → evidencia → reglas.",
      createsNewAssessment: true,
      distinctFromFollowUp: true,
    });
    expect(r.followUp.triggered).toBe(false);
  });

  it("VAL-OP02-02: efecto negativo material → MODIFY / STOP / REASSESS por juicio; incompatible con R4", () => {
    const r2 = op02.assessValidation({
      ...base,
      effectivenessStateRef: "R2",
      validationRequirementStatus: "NOT_SATISFIED",
      unintendedNegativeOutcome: true,
    });
    expect(r2.decisions).toContainEqual({ decision: "MODIFY / STOP / REASSESS", action: "según riesgo.", selection: "GOVERNED_JUDGMENT" });
    const r4 = op02.assessValidation({ ...base, unintendedNegativeOutcome: true });
    expect(r4.admissible).toBe(false);
    expect(r4.issues.join(" ")).toMatch(/R2/);
  });

  it("R1 → EXTEND / EVIDENCE; R3 → ADJUST + follow-up", () => {
    const r1 = op02.assessValidation({ ...base, effectivenessStateRef: "R1", validationRequirementStatus: "INSUFFICIENT_EVIDENCE", evidenceIds: [] });
    expect(r1.decisions.map((d) => d.decision)).toEqual(["EXTEND / EVIDENCE"]);
    const r3 = op02.assessValidation({ ...base, effectivenessStateRef: "R3", validationRequirementStatus: "NOT_SATISFIED" });
    expect(r3.decisions.map((d) => d.decision)).toEqual(["ADJUST"]);
    expect(r3.followUp.triggered).toBe(true);
    expect(r3.reassessment.triggered).toBe(true);
  });

  it("efectividad ≠ atribución: R4 + AC1 es admisible y la atribución no se deriva", () => {
    const r = op02.assessValidation({ ...base, attributionConfidenceRef: "AC1" });
    expect(r.admissible).toBe(true);
    expect(r.attributionConfidenceRef).toBe("AC1");
    expect(op02.assessValidation({ ...base, attributionConfidenceRef: "AC9" }).admissible).toBe(false);
  });
});

describe("M2-OP02-02 · severidad y confianza contextuales", () => {
  it("S2/S3 con C0/C1 bloquea solo la confirmación causal (CONF-SEV-OP02-02)", () => {
    const causal = op02.assessFindingConsolidation("OP02-HF02", { severityRef: "S3", confidenceRef: "C1", claim: "CAUSAL", judgedBy: "u1" });
    expect(causal.status).toBe("BLOCKED");
    expect(causal.blockedByGuardIds).toEqual(["CONF-SEV-OP02-02"]);
    expect(causal.requiredActions).toEqual(["no consolidarla todavía como hallazgo causal confirmado."]);
    expect(
      op02.assessFindingConsolidation("OP02-HF02", { severityRef: "S3", confidenceRef: "C1", claim: "NON_CAUSAL", judgedBy: "u1" }).status,
    ).toBe("ADMISSIBLE");
    expect(
      op02.assessFindingConsolidation("OP02-HF02", { severityRef: "S3", confidenceRef: "C1", claim: "CAUSAL", judgedBy: null }).status,
    ).toBe("INVALID_INPUT");
    expect(
      op02.assessFindingConsolidation("OP02-HF02", { severityRef: "S9", confidenceRef: "C1", claim: "CAUSAL", judgedBy: "u1" }).status,
    ).toBe("INVALID_INPUT");
  });

  it("candidatos OP-02 declaran severidad/confianza CONTEXTUAL sin resolverlas", () => {
    const ev = op02.evaluate({
      observations: [obs("k", "VA04", "KNOWN", "P1-OP02-02")],
      knowledgeVersionId: "kv",
    });
    const c = ev.findingCandidates.find((f) => f.findingRef === "OP02-HF02");
    expect(c?.severity).toMatchObject({ state: null, resolution: "CONTEXTUAL", admissibleLevels: ["S0", "S1", "S2", "S3"] });
    expect(c?.confidence).toMatchObject({ state: null, resolution: "CONTEXTUAL", admissibleLevels: ["C0", "C1", "C2", "C3"] });
    expect(op02.listEngineActions().map((a) => a.id)).toEqual(["REUSE", "STOP", "FOLLOW", "EVIDENCE", "CONTRA", "DERIVE", "NA"]);
  });
});

describe("M2-OP02-02 · UNKNOWN / NOT_APPLICABLE / CONTRADICTORY nunca sostienen findings", () => {
  it.each([
    ["UNKNOWN", "AWAITING_INFORMATION"],
    ["NOT_APPLICABLE", "EXCLUDED_NOT_APPLICABLE"],
    ["CONTRADICTORY", "BLOCKED_BY_CONTRADICTION"],
  ] as const)("%s → %s en OP-01 y OP-02 (mismo engine)", (estado, esperado) => {
    const e2 = op02.evaluate({ observations: [obs("x", "VA04", estado, "P1-OP02-02")], knowledgeVersionId: "kv" });
    expect(e2.findingCandidates).toEqual([]);
    expect(e2.findingsAwaitingResolution.map((f) => f.status)).toEqual([esperado]);
    const e1 = op01.evaluate({ observations: [obs("x", "VA01", estado, "P01")], knowledgeVersionId: "kv" });
    expect(e1.findingCandidates).toEqual([]);
    expect(e1.findingsAwaitingResolution.every((f) => f.status === esperado)).toBe(true);
  });
});

describe("M2-OP02-02 · OP-01 Golden intacto", () => {
  it("OP-01 no declara ciclo de vida: las APIs lo reportan como no explícito, sin inventar", () => {
    LIFECYCLE.filter((k) => k !== "validationRequirements").forEach((k) => expect(op01Pack[k]).toBeUndefined());
    expect(op01.listInterventionPatterns()).toEqual([]);
    expect(op01.evaluateImplementation("A04", { layerRecords: [], doneCriteriaRecords: [] }).issues).toEqual([
      "INTERVENTION_PATTERN_NOT_EXPLICIT",
    ]);
    expect(op01.listEngineActions()).toEqual([]);
  });

  it("A04 sigue siendo el único CRV, determinístico y propiedad de la Activity A04", () => {
    const crvs = op01.listValidationRequirements();
    expect(crvs).toHaveLength(1);
    expect(crvs[0]).toMatchObject({
      activityRef: "A04",
      owner: { kind: "ACTIVITY", ref: "A04" },
      evaluation: "DETERMINISTIC_CONDITIONS",
      requiredCaseCount: 3,
    });
    expect(op01.getValidationRequirementForActivity("A04")?.requirementRef).toBe(crvs[0]!.requirementRef);
  });

  it("OP-01 KNOWN sigue produciendo H01/H08 con severidad NOT_EXPLICIT", () => {
    const ev = op01.evaluate({ observations: [obs("k", "VA01", "KNOWN", "P01")], knowledgeVersionId: "kv" });
    expect(ev.findingCandidates.map((f) => f.findingRef).sort()).toEqual(["H01", "H08"]);
    ev.findingCandidates.forEach((f) => expect(f.severity.resolution).toBe("NOT_EXPLICIT"));
  });
});

describe("M2-OP02-02 · el schema rechaza CRV y modelos mal formados", () => {
  const crvs = () => clonar(op02Pack["validationRequirements"]) as Record<string, unknown>[];
  const con = (cambio: (p: Record<string, unknown>) => void) => {
    const p = clonar(op02Pack);
    cambio(p);
    return validateKnowledgePack(p).ok;
  };
  it("GOVERNED_JUDGMENT sin GOVERNED_STATEMENT", () => {
    expect(
      con((p) => {
        const v = crvs();
        v[0]!["conditions"] = (v[0]!["conditions"] as { kind: string }[]).filter((c) => c.kind !== "GOVERNED_STATEMENT");
        p["validationRequirements"] = v;
      }),
    ).toBe(false);
  });
  it("DETERMINISTIC_CONDITIONS sin condición determinística", () => {
    expect(
      con((p) => {
        const v = crvs();
        v[0]!["evaluation"] = "DETERMINISTIC_CONDITIONS";
        p["validationRequirements"] = v;
      }),
    ).toBe(false);
  });
  it("dueño inexistente", () => {
    expect(
      con((p) => {
        const v = crvs();
        v[0]!["owner"] = { kind: "INTERVENTION_PATTERN", ref: "IP99" };
        p["validationRequirements"] = v;
      }),
    ).toBe(false);
  });
  it("dos estados de ejecución implementados", () => {
    expect(
      con((p) => {
        const m = p["implementationModel"] as { executionStates: { implemented: boolean }[] };
        m.executionStates[2]!.implemented = true;
      }),
    ).toBe(false);
  });
});
