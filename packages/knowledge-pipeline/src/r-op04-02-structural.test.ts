/**
 * KNOW-EXEC-08-B · Diez escenarios sintéticos S01–S10 para la representación
 * estructural NO ejecutable de R-OP04-02 (contratos D1–D4).
 *
 * Los escenarios comprueban estructuras y restricciones; NUNCA calculan
 * estados diagnósticos ni infieren que una condición esté satisfecha o
 * descartada a partir de las respuestas sintéticas.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  rOp0402StructuralArtifactSchema,
  diagnosticEntrySchema,
  conditionDescriptorSchema,
  structuralDecisionResultSchema,
  findingAuthorizationDescriptorSchema,
  SEMANTIC_DECISION_STATES,
  TECHNICAL_CONTROL_STATE,
  type ROp0402StructuralArtifact,
} from "@pymapa/knowledge-schema";

const ARTIFACT_PATH = "knowledge/staging/OP-04/r-op04-02-structural.json";
const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as ROp0402StructuralArtifact;
const baseline = JSON.parse(
  readFileSync("knowledge/master/v1.0/capabilities/OP-04/canonical-baseline.json", "utf8"),
);
const baselineRule = baseline.objects.find((o: { key: string }) => o.key === "R-OP04-02");
const baselineGuardrail = baseline.objects.find((o: { key: string }) => o.key === "R-OP04-02A");
const baselineQuestion = baseline.objects.find((o: { key: string }) => o.key === "P1-OP04-02");

describe("KNOW-EXEC-08-B · R-OP04-02 estructural (S01–S10)", () => {
  it("S01 · el artefacto valida contra el contrato D1–D4 completo", () => {
    const parsed = rOp0402StructuralArtifactSchema.safeParse(artifact);
    expect(parsed.success).toBe(true);
    expect(artifact.status).toBe("STRUCTURAL_CANDIDATE_NOT_EXECUTABLE");
  });

  it("S02 · D1 preserva la relación documental con las cinco variables y el foco VA02 sin binding", () => {
    expect(artifact.entry.questionId).toBe("P1-OP04-02");
    expect([...artifact.entry.variableRefs].sort()).toEqual(["VA01", "VA02", "VA04", "VA05", "VA07"]);
    expect(artifact.entry.focusVariableRef).toBe("VA02");
    expect(artifact.entry.bindingApproved).toBe(false);
    // Coherencia con el baseline canónico: la pregunta alimenta esas cinco variables.
    expect(baselineQuestion.fields.body.join(" ")).toContain("VA01, VA02, VA04, VA05, VA07");
  });

  it("S03 · D1 preserva respuestas sintéticas con estados de conocimiento y procedencia, sin evaluarlas", () => {
    const entry = {
      questionId: "P1-OP04-02",
      variableRefs: ["VA01", "VA02", "VA04", "VA05", "VA07"],
      focusVariableRef: "VA02",
      bindingApproved: false,
      responses: [
        { questionId: "P1-OP04-02", knowledgeState: "KNOWN", evidenceRefs: ["EV-SYN-01"], provenance: { sourceId: "SYNTHETIC", locator: "S03" } },
        { questionId: "P1-OP04-02", knowledgeState: "UNKNOWN", evidenceRefs: [], provenance: { sourceId: "SYNTHETIC", locator: "S03" } },
        { questionId: "P1-OP04-02", knowledgeState: "NOT_APPLICABLE", evidenceRefs: [], provenance: { sourceId: "SYNTHETIC", locator: "S03" } },
        { questionId: "P1-OP04-02", knowledgeState: "CONTRADICTORY", evidenceRefs: ["EV-SYN-02"], provenance: { sourceId: "SYNTHETIC", locator: "S03" } },
      ],
    };
    expect(diagnosticEntrySchema.safeParse(entry).success).toBe(true);
    // Una respuesta KNOWN no satisface ninguna condición: la decisión sigue NOT_EVALUATED.
    expect(artifact.decision.technicalState).toBe(TECHNICAL_CONTROL_STATE);
    expect(artifact.decision.semanticState).toBeNull();
  });

  it("S04 · D2 representa las cuatro condiciones históricas como descriptores declarativos no ejecutables", () => {
    expect(artifact.conditions.conditions).toHaveLength(4);
    for (const c of artifact.conditions.conditions) {
      expect(c.executable).toBe(false);
      expect(c.predicate).toBeNull();
      expect(c.threshold).toBeNull();
      // Cada condición es un fragmento literal del texto histórico del baseline.
      expect(baselineRule.fields.body.join("\n")).toContain(c.historicalText);
    }
  });

  it("S05 · D2 preserva el guardrail R-OP04-02A y la suficiencia de VA02 pendiente", () => {
    expect(artifact.conditions.guardrail.ruleId).toBe("R-OP04-02A");
    expect(artifact.conditions.guardrail.executable).toBe(false);
    expect(baselineGuardrail.fields.body.join("\n")).toBe(artifact.conditions.guardrail.historicalText);
    expect(artifact.conditions.sufficiency).toMatchObject({ variableRef: "VA02", status: "PENDING" });
  });

  it("S06 · D3 conserva los seis estados semánticos de KNOW-EXEC-05-D más NOT_EVALUATED como control técnico separado", () => {
    expect(SEMANTIC_DECISION_STATES).toEqual([
      "CONDITION_SATISFIED",
      "CONDITION_NOT_SATISFIED",
      "INSUFFICIENT_EVIDENCE",
      "CONFLICTING_INFORMATION",
      "NOT_APPLICABLE",
      "GOVERNED_REVIEW_REQUIRED",
    ]);
    expect(SEMANTIC_DECISION_STATES).not.toContain(TECHNICAL_CONTROL_STATE);
    expect(TECHNICAL_CONTROL_STATE).toBe("NOT_EVALUATED");
  });

  it("S07 · D3 rechaza cualquier resultado que afirme un estado semántico en este Build", () => {
    for (const state of SEMANTIC_DECISION_STATES) {
      const r = structuralDecisionResultSchema.safeParse({
        ruleId: "R-OP04-02",
        technicalState: "NOT_EVALUATED",
        semanticState: state,
      });
      expect(r.success).toBe(false);
    }
    // El enum abreviado prohibido tampoco es aceptado.
    for (const legacy of ["MET", "NOT_MET", "INDETERMINATE", "ABSTAINED"]) {
      expect(
        structuralDecisionResultSchema.safeParse({
          ruleId: "R-OP04-02",
          technicalState: legacy,
          semanticState: null,
        }).success,
      ).toBe(false);
    }
  });

  it("S08 · D4 mantiene la autorización R-OP04-02 → OP04-HF02 inactiva con datos pendientes explícitos", () => {
    const d = artifact.findingAuthorization;
    expect(d.linkKind).toBe("DOCUMENTAL_REFERENCE");
    expect(d.authorizationActive).toBe(false);
    expect(d.emissionActive).toBe(false);
    expect([d.authority, d.approvalDate, d.grantedVersion, d.approvedCriteria]).toEqual([null, null, null, null]);
    expect(d.pendingReasons.length).toBeGreaterThan(0);
  });

  it("S09 · D4 rechaza una autorización activa o no sustentada", () => {
    const base = artifact.findingAuthorization;
    // Autorización activa: rechazada.
    expect(findingAuthorizationDescriptorSchema.safeParse({ ...base, authorizationActive: true }).success).toBe(false);
    // Emisión activa: rechazada.
    expect(findingAuthorizationDescriptorSchema.safeParse({ ...base, emissionActive: true }).success).toBe(false);
    // Autoridad inventada: rechazada.
    expect(findingAuthorizationDescriptorSchema.safeParse({ ...base, authority: "Conocimiento" }).success).toBe(false);
    // Fecha de aprobación inventada: rechazada.
    expect(findingAuthorizationDescriptorSchema.safeParse({ ...base, approvalDate: "2026-10-26" }).success).toBe(false);
  });

  it("S10 · aislamiento y bloqueo de emisión: cero reglas ejecutadas, cero hallazgos, sin predicados ni condiciones ejecutables", () => {
    expect(artifact.rulesExecuted).toBe(0);
    expect(artifact.findingsEmitted).toBe(0);
    // Ningún descriptor de condición admite predicado ni umbral.
    const withPredicate = conditionDescriptorSchema.safeParse({
      ...artifact.conditions.conditions[0],
      predicate: "value === true",
    });
    expect(withPredicate.success).toBe(false);
    // El artefacto vive solo en staging; el candidato original de KNOW-EXEC-03 sigue intacto.
    const original = JSON.parse(readFileSync("knowledge/staging/OP-04/candidate.json", "utf8"));
    const originalRule = original.rules.find((r: { ruleId: string }) => r.ruleId === "R-OP04-02");
    expect(originalRule.executable).toBe(false);
    expect(originalRule.predicate).toBeNull();
  });
});
