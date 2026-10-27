import { createKnowledgeEngine, type EngineObservation } from "@pymapa/knowledge-engine";
import { crearCandidatoPack, METADATOS_PILOTO } from "./candidato-pack.server";
import { interpretarObservaciones } from "./interprete-semantico.server";
import { entradaPilotoSchema, type EntradaPiloto } from "../../../src/lib/piloto-dg01/escenarios";

/** Called exclusively by the server boundary or local tests; no persistence. */
export function evaluarPiloto(entrada: EntradaPiloto) {
  const input = entradaPilotoSchema.parse(entrada);
  const engine = createKnowledgeEngine(crearCandidatoPack());
  const common = {
    variableRef: "VA01", acquisitionRef: "ACQ·NI01",
    recordedAt: "2026-10-24T00:00:00.000Z", evidenceIds: [],
  };
  const observations: EngineObservation[] = input.state === "CONTRADICTORY" ? [
    { ...common, id: "PILOT-OBS-A", knowledgeState: "KNOWN", semanticValue: input.statement.trim(), sourceResponseId: "PILOT-RESPONSE-A", respondentId: "SYNTHETIC-A" },
    { ...common, id: "PILOT-OBS-B", knowledgeState: "KNOWN", semanticValue: input.conflictingStatement.trim(), sourceResponseId: "PILOT-RESPONSE-B", respondentId: "SYNTHETIC-B" },
    { ...common, id: "PILOT-OBS-CONFLICT", knowledgeState: "CONTRADICTORY", semanticValue: null, sourceResponseId: "PILOT-RESPONSE-CONFLICT", respondentId: "SYNTHETIC-QA", conflictingObservationIds: ["PILOT-OBS-A", "PILOT-OBS-B"] },
  ] : [{
    ...common, id: "PILOT-OBS-A", knowledgeState: input.state,
    semanticValue: input.state === "KNOWN" ? input.statement.trim() : null,
    sourceResponseId: "PILOT-RESPONSE-A", respondentId: "SYNTHETIC-A",
    notApplicableReason: input.state === "NOT_APPLICABLE" ? input.notApplicableReason.trim() : null,
  }];
  for (const observation of observations) {
    const admission = engine.validateObservation(observation);
    if (!admission.ok) throw new Error(admission.reason);
  }
  const evaluation = engine.evaluate({ observations, knowledgeVersionId: "DG01-VERTICAL-01@0.1.0-SYNTHETIC" });
  return {
    demonstration: { ...METADATOS_PILOTO, confirmedFindings: [] as string[], semanticInterpretation: "PENDING_GOVERNANCE" as const },
    engineVersion: engine.engineVersion,
    observations,
    evaluation,
    /** Capa experimental separada: solo lee observaciones, no toca `evaluation`. */
    interpretacionExperimental: interpretarObservaciones(observations),
  };
}

export type ResultadoPiloto = ReturnType<typeof evaluarPiloto>;