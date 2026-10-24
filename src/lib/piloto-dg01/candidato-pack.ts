import baseDg01 from "../../../knowledge/packs/dg-01/1.0.0/pack.json";
import type { KnowledgePack } from "@pymapa/knowledge-schema";

/** Demonstration provenance, deliberately outside the Engine contract. */
export const METADATOS_PILOTO = {
  id: "DG01-VERTICAL-01",
  version: "0.1.0",
  status: "ISOLATED_CANDIDATE_NOT_PUBLISHED",
  source: "knowledge/intake/DG-01/text/DG-01.txt:487–488",
  baseline: "dg-01@1.0.0",
  historicalLabel: "BUSINESS_LOGIC_UNCLEAR",
  findingIdentity: "PILOT-DG01-F01 (identidad de demostración, no ID canónico aprobado)",
  semanticDecision: "PENDING_GOVERNANCE",
} as const;

/** New in-memory candidate; the imported published baseline is never mutated. */
export function crearCandidatoPack(): KnowledgePack {
  return {
    ...structuredClone(baseDg01) as KnowledgePack,
    packId: "piloto-dg01",
    packVersion: METADATOS_PILOTO.version,
    status: "draft",
    governanceNote: "DEC-049 · candidato aislado; no publicación ni aprobación semántica.",
    rules: [{
      id: "R-DG01-01",
      statement: "No existe comprensión suficiente de cómo funciona/crea valor materialmente el negocio para orientar la transformación.",
      classification: "GOVERNED_JUDGMENT",
      implemented: false,
    }],
    findings: [{
      id: "PILOT-DG01-F01",
      name: "BUSINESS_LOGIC_UNCLEAR",
      polarity: "ADVERSE",
      ruleRefs: ["R-DG01-01"],
      variableRefs: ["VA01"],
    }],
  };
}