/**
 * Knowledge test harness reutilizable.
 *
 * Verifica un Pack (cualquiera) sin escribir infraestructura nueva por
 * capacidad. Ningún chequeo contiene branching por capabilityId.
 */
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { NOT_EXPLICIT } from "@pymapa/knowledge-schema";
import type { PackCandidate } from "./generator.ts";
import type { CapabilitySource } from "./master.ts";
import { validateReferential, validateStructural } from "./validators.ts";

export type KnowledgeCheckId =
  | "SCHEMA"
  | "REFERENTIAL_INTEGRITY"
  | "PROVENANCE"
  | "UNKNOWN_PRESERVATION"
  | "NOT_APPLICABLE_REASON"
  | "CONTRADICTION_PRESERVATION"
  | "EVIDENCE_REQUIREMENTS"
  | "ACQUISITION_REFERENCES"
  | "RULE_CLASSIFICATION"
  | "NO_UNSUPPORTED_DETERMINISTIC_CONCLUSIONS"
  | "GAPS_PRESERVED"
  | "VERSION_CHECKSUM_IDENTITY";

export interface KnowledgeCheckResult {
  check: KnowledgeCheckId;
  ok: boolean;
  detail: string;
}

export interface KnowledgeTestReport {
  packId: string;
  packVersion: string;
  capabilityId: string;
  ok: boolean;
  checks: KnowledgeCheckResult[];
}

interface PackShape {
  packId: string;
  packVersion: string;
  capability: { id: string };
  knowledgeMaster?: { identifier?: string; version?: string; status?: string; sourceReference?: string };
  variables: { id: string; minimumEvidence?: string }[];
  informationNeeds: { id: string; acquisitionRefs: string[] }[];
  acquisitions: {
    id: string;
    responseModel: { knowledgeStates: string[]; preservesUnknown?: boolean };
  }[];
  rules?: { id: string; classification: string; implemented: boolean }[];
  findings?: { id: string; ruleRefs?: string[]; severity?: string }[];
  knowledgeChangeCandidates?: { id: string }[];
}

const CLASES_VALIDAS = new Set(["DETERMINISTIC", "GOVERNED_JUDGMENT", "UNIMPLEMENTED_GAP"]);

export function runKnowledgeTests(input: {
  candidate: PackCandidate;
  source?: CapabilitySource;
}): KnowledgeTestReport {
  const { candidate, source } = input;
  const pack = candidate.pack as unknown as PackShape;
  const checks: KnowledgeCheckResult[] = [];
  const push = (check: KnowledgeCheckId, ok: boolean, detail: string) =>
    checks.push({ check, ok, detail });

  const estructural = validateStructural(candidate.pack);
  push(
    "SCHEMA",
    estructural.ok,
    estructural.ok ? "el pack cumple el contrato estructural" : JSON.stringify(estructural.issues),
  );

  const referencial = validateReferential(candidate.pack);
  push(
    "REFERENTIAL_INTEGRITY",
    referencial.ok,
    referencial.ok ? "IDs y relaciones internas resuelven" : JSON.stringify(referencial.issues),
  );

  const master = pack.knowledgeMaster;
  const provenanciaOk = Boolean(
    master?.identifier && master?.version && master?.status && master?.sourceReference,
  );
  push(
    "PROVENANCE",
    provenanciaOk,
    provenanciaOk ? "procedencia completa en el pack" : "falta procedencia obligatoria",
  );

  const sinUnknown = pack.acquisitions.filter(
    (a) => !a.responseModel.knowledgeStates.includes("UNKNOWN") || a.responseModel.preservesUnknown !== true,
  );
  push(
    "UNKNOWN_PRESERVATION",
    sinUnknown.length === 0,
    sinUnknown.length === 0
      ? "todas las adquisiciones preservan UNKNOWN"
      : `adquisiciones sin UNKNOWN: ${sinUnknown.map((a) => a.id).join(", ")}`,
  );

  // NOT_APPLICABLE y CONTRADICTORY se comprueban contra el runtime genérico.
  let naOk = true;
  let naDetalle = "ninguna adquisición admite NOT_APPLICABLE";
  let contraOk = true;
  let contraDetalle = "ninguna adquisición admite CONTRADICTORY";
  if (estructural.ok) {
    const engine = createKnowledgeEngine(candidate.pack);
    const conNA = pack.acquisitions.find((a) => a.responseModel.knowledgeStates.includes("NOT_APPLICABLE"));
    if (conNA) {
      const acq = engine.getAcquisition(conNA.id);
      const variableRef = acq?.variableRefs[0] ?? "";
      const sinRazon = engine.validateObservation({
        id: "fixture-na",
        variableRef,
        acquisitionRef: conNA.id,
        knowledgeState: "NOT_APPLICABLE",
        semanticValue: null,
        sourceResponseId: null,
        recordedAt: new Date(0).toISOString(),
      });
      naOk = sinRazon.ok === false;
      naDetalle = naOk
        ? "el runtime exige razón contextual para NOT_APPLICABLE"
        : "NOT_APPLICABLE se aceptó sin razón";
    }
    const conContra = pack.acquisitions.find((a) =>
      a.responseModel.knowledgeStates.includes("CONTRADICTORY"),
    );
    if (conContra) {
      const acq = engine.getAcquisition(conContra.id);
      const variableRef = acq?.variableRefs[0] ?? "";
      const sinReferencias = engine.validateObservation({
        id: "fixture-contra",
        variableRef,
        acquisitionRef: conContra.id,
        knowledgeState: "CONTRADICTORY",
        semanticValue: null,
        sourceResponseId: null,
        recordedAt: new Date(0).toISOString(),
      });
      contraOk = sinReferencias.ok === false;
      contraDetalle = contraOk
        ? "el runtime exige las fuentes en conflicto para CONTRADICTORY"
        : "CONTRADICTORY se aceptó sin referencias en conflicto";
    }
  }
  push("NOT_APPLICABLE_REASON", naOk, naDetalle);
  push("CONTRADICTION_PRESERVATION", contraOk, contraDetalle);

  const sinEvidencia = pack.variables.filter((v) => !v.minimumEvidence);
  push(
    "EVIDENCE_REQUIREMENTS",
    sinEvidencia.length === 0,
    sinEvidencia.length === 0
      ? "toda variable declara requisito mínimo de evidencia"
      : `variables sin requisito: ${sinEvidencia.map((v) => v.id).join(", ")}`,
  );

  const adquisiciones = new Set(pack.acquisitions.map((a) => a.id));
  const necesidadesHuerfanas = pack.informationNeeds.filter((n) =>
    n.acquisitionRefs.some((ref) => !adquisiciones.has(ref)),
  );
  push(
    "ACQUISITION_REFERENCES",
    necesidadesHuerfanas.length === 0,
    necesidadesHuerfanas.length === 0
      ? "toda necesidad referencia adquisiciones existentes"
      : `necesidades con referencias inválidas: ${necesidadesHuerfanas.map((n) => n.id).join(", ")}`,
  );

  const clasesInvalidas = (pack.rules ?? []).filter((r) => !CLASES_VALIDAS.has(r.classification));
  push(
    "RULE_CLASSIFICATION",
    clasesInvalidas.length === 0,
    clasesInvalidas.length === 0
      ? "toda regla usa la clasificación industrial"
      : `reglas con clase no industrial: ${clasesInvalidas.map((r) => r.id).join(", ")}`,
  );

  // Ninguna conclusión determinística sin base: severidad nunca numérica y
  // ningún finding sostenido solo por juicio gobernado puede declararse firme.
  const reglasPorId = new Map((pack.rules ?? []).map((r) => [r.id, r]));
  const conclusionesIndebidas = (pack.findings ?? []).filter((f) => {
    if (f.severity && /^\d+(\.\d+)?$/.test(f.severity)) return true;
    const refs = f.ruleRefs ?? [];
    if (refs.length === 0) return false;
    const soloJuicio = refs.every((ref) => reglasPorId.get(ref)?.classification !== "DETERMINISTIC");
    return soloJuicio && f.severity !== undefined && !f.severity.includes(NOT_EXPLICIT);
  });
  push(
    "NO_UNSUPPORTED_DETERMINISTIC_CONCLUSIONS",
    conclusionesIndebidas.length === 0,
    conclusionesIndebidas.length === 0
      ? "ningún finding declara conclusión sin base gobernada"
      : `findings con conclusión no soportada: ${conclusionesIndebidas.map((f) => f.id).join(", ")}`,
  );

  const gapsFuente = source?.gaps ?? [];
  const kcc = pack.knowledgeChangeCandidates ?? [];
  const gapsPreservados =
    gapsFuente.filter((g) => g.kind === "KNOWLEDGE_CHANGE_CANDIDATE").every((g) =>
      kcc.some((k) => k.id === g.id),
    ) && (gapsFuente.length === 0 || candidate.gaps.length === gapsFuente.length);
  push(
    "GAPS_PRESERVED",
    gapsPreservados,
    gapsPreservados
      ? `gaps preservados: ${candidate.gaps.length}`
      : "el candidato perdió gaps declarados por la fuente",
  );

  const identidadOk =
    typeof candidate.checksum === "string" &&
    candidate.checksum.startsWith("sha256:") &&
    pack.packVersion === candidate.packVersion &&
    pack.packId === candidate.packId;
  push(
    "VERSION_CHECKSUM_IDENTITY",
    identidadOk,
    identidadOk ? `identidad ${candidate.packId}@${candidate.packVersion}` : "identidad inconsistente",
  );

  return {
    packId: candidate.packId,
    packVersion: candidate.packVersion,
    capabilityId: candidate.capabilityId,
    ok: checks.every((c) => c.ok),
    checks,
  };
}
