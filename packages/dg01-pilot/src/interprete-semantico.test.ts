import { describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { crearCandidatoPack } from "./candidato-pack.server";
import { ESCENARIOS } from "../../../src/lib/piloto-dg01/escenarios";
import { evaluarPiloto } from "./evaluador-piloto.server";
import { interpretarObservaciones } from "./interprete-semantico.server";

const run = (id: string) => {
  const scenario = ESCENARIOS.find((s) => s.id === id);
  if (!scenario) throw new Error(`Escenario obligatorio ausente: ${id}`);
  return evaluarPiloto(scenario.input);
};
const esperado = { S1: "EVIDENCIA_COMPATIBLE", S2: "EVIDENCIA_CONTRARIA", S3: "ABSTENCION_SIN_CONTENIDO", S4: "CONFLICTO_PRESERVADO", S5: "EXCLUSION_TECNICA_CONSERVADA", S6: "INFORMACION_INSUFICIENTE", S7: "EVIDENCIA_MIXTA" } as const;

describe("DEC-049 · DG01-VERTICAL-02 · interpretación experimental", () => {
  for (const [id, postura] of Object.entries(esperado)) {
    it(`${id} → ${postura}, sin confirmación y con fragmentos verificables`, () => {
      const r = run(id);
      const i = r.interpretacionExperimental;
      expect(i.postura).toBe(postura);
      expect(i.hallazgoConfirmado).toBe(false);
      expect(i.usaIA).toBe(false);
      expect(i.estadoRevision).toBe("PENDING_SEMANTIC_GOVERNANCE");
      expect(r.demonstration.confirmedFindings).toEqual([]);
      for (const a of i.afirmaciones) {
        const obs = r.observations.find((o) => o.id === a.fragmento.observationId);
        expect(String(obs?.semanticValue).slice(a.fragmento.inicio, a.fragmento.fin)).toBe(a.fragmento.texto);
      }
    });
  }
  it("S1 y S2 producen interpretaciones distintas con evidencia textual", () => {
    const s1 = run("S1").interpretacionExperimental, s2 = run("S2").interpretacionExperimental;
    expect(s1.compatibles.length).toBeGreaterThan(0);
    expect(s2.contrarias.length).toBeGreaterThan(0);
    expect(s2.compatibles).toEqual([]);
    expect(s1.postura).not.toBe(s2.postura);
  });
  it("S3 se abstiene: no inventa afirmaciones", () => {
    expect(run("S3").interpretacionExperimental.afirmaciones).toEqual([]);
  });
  it("S4 conserva ambas fuentes sin elegir", () => {
    const i = run("S4").interpretacionExperimental;
    expect(new Set(i.afirmaciones.map((a) => a.fragmento.observationId))).toEqual(new Set(["PILOT-OBS-A", "PILOT-OBS-B"]));
  });
  it("S7 conserva elementos claros e insuficientes", () => {
    const i = run("S7").interpretacionExperimental;
    expect(i.contrarias.length).toBeGreaterThan(0);
    expect(i.insuficientes.length).toBeGreaterThan(0);
  });
  it("la capa semántica no modifica el resultado del Engine", () => {
    for (const s of ESCENARIOS) {
      const r = evaluarPiloto(s.input);
      const antes = JSON.stringify(r.evaluation);
      const obs = structuredClone(r.observations);
      interpretarObservaciones(r.observations);
      expect(JSON.stringify(r.evaluation)).toBe(antes);
      expect(r.observations).toEqual(obs);
      const directo = createKnowledgeEngine(crearCandidatoPack()).evaluate({ observations: r.observations, knowledgeVersionId: "DG01-VERTICAL-01@0.1.0-SYNTHETIC" });
      expect(directo.findingCandidates).toEqual(r.evaluation.findingCandidates);
    }
  });
});
