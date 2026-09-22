/**
 * M2-OP02-03 · Pre-Publication Integrity Closure.
 *
 * 1. Corrección source→canonical de los Done Criteria de IP05 (raw 6983–6987):
 *    literal, sin pérdida, con provenance e historial; la ÚNICA diferencia con
 *    la baseline previa es la corrección registrada.
 * 2. Cadena IP05 → actividades → deliverable → Done Criteria → implementación
 *    → CRV, donde Done no implica CRV ni efectividad.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import {
  computeSelfChecksum,
  generatePackCandidate,
  sha256Hex,
  validateCanonicalBaseline,
} from "./index.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const DIR = join(ROOT, "knowledge", "master", "v1.0", "capabilities", "OP-02");
const rawBytes = readFileSync(join(DIR, "raw", "OP-02_Completo.txt"));
const raw = rawBytes.toString("utf8");
const lineas = raw.split("\n");
const leer = () => ({
  baseline: JSON.parse(readFileSync(join(DIR, "canonical-baseline.json"), "utf8")),
  source: JSON.parse(readFileSync(join(DIR, "source.json"), "utf8")),
});

/** Bloque literal de la fuente, sin normalizar. */
const BLOQUE_IP05 = lineas.slice(6982, 6987).join("\n");
const CHECKSUM_BASELINE_PREVIO = "sha256:856633be10f2fc5d27f23ff6e0729da306431bb51585317ca1b38ae1e1ee3c59";
const CHECKSUM_SOURCE_PREVIO = "sha256:8c7484979e3a99ceb7c8e89bf6f7935f32e3386f59ac9ddfb5e2a04ce24550c6";
const NOTA_SOURCE_PREVIA =
  "Done Criteria de este patrón no transcritos en la baseline canónica (la fuente los enuncia como criterio compuesto, raw líneas 6983–6987). Defecto de transcripción detectado en M2-OP02-02; corrección sujeta a gobierno. Sin Done Criteria explícitos el runtime no puede alcanzar el estado implementado.";

type Obj = { key: string; annotations?: { relation: string; fields: Record<string, unknown> }[] };
const detalleIp05 = (b: { objects: Obj[] }) =>
  b.objects.find((o) => o.key === "IP05")!.annotations!.find((a) => a.relation === "PATTERN_DETAIL")!;

describe("M2-OP02-03 · IP05 Done Criteria (corrección de transcripción)", () => {
  it("la fuente contiene el criterio compuesto en las líneas 6983–6987", () => {
    expect(lineas[6980]).toBe("Done Criteria");
    expect(lineas[6982]).toBe("Las dependencias críticas seleccionadas tienen:");
    expect(lineas[6984]).toBe(
      "origen + receptor + necesidad + momento + mecanismo + responsabilidad + respuesta ante excepción",
    );
    expect(lineas[6986]).toBe("suficientemente claros y el mecanismo ha sido utilizado.");
    expect(raw.split(BLOQUE_IP05).length - 1).toBe(1);
  });

  it("la baseline transcribe el bloque literal completo como un único criterio", () => {
    const { baseline } = leer();
    expect(detalleIp05(baseline).fields["doneCriteria"]).toEqual([BLOQUE_IP05]);
  });

  it("la corrección queda registrada con valor previo, posterior, rango e identidad raw", () => {
    const { baseline } = leer();
    expect(baseline.transcriptionCorrections).toEqual([
      expect.objectContaining({
        id: "TC-OP02-01",
        kind: "SOURCE_TO_CANONICAL_OMISSION",
        detectedIn: "M2-OP02-02",
        correctedIn: "M2-OP02-03",
        objectKey: "IP05",
        annotationRelation: "PATTERN_DETAIL",
        field: "doneCriteria",
        before: [],
        after: [BLOQUE_IP05],
        sourceLines: [6983, 6987],
        rawSha256: sha256Hex(raw),
        baselineChecksumBefore: CHECKSUM_BASELINE_PREVIO,
        form: "SINGLE_COMPOSITE_STATEMENT",
      }),
    ]);
  });

  it("revertir la corrección reproduce exactamente la baseline previa (única diferencia)", () => {
    const { baseline } = leer();
    const previo = JSON.parse(JSON.stringify(baseline));
    delete previo.transcriptionCorrections;
    detalleIp05(previo).fields["doneCriteria"] = [];
    expect(computeSelfChecksum(previo)).toBe(CHECKSUM_BASELINE_PREVIO);
    expect(computeSelfChecksum(baseline)).toBe(baseline.checksum);
  });

  it("revertir la proyección reproduce exactamente el source.json previo (única diferencia)", () => {
    const { source } = leer();
    const ip05 = source.sections.interventionPatterns.find((p: { id: string }) => p.id === "IP05");
    expect(ip05.doneCriteria).toEqual([{ id: null, statement: BLOQUE_IP05 }]);
    const previo = JSON.parse(JSON.stringify(source));
    const p = previo.sections.interventionPatterns.find((x: { id: string }) => x.id === "IP05");
    p.doneCriteria = [];
    p.identifierNote = NOTA_SOURCE_PREVIA;
    expect(computeSelfChecksum(previo)).toBe(CHECKSUM_SOURCE_PREVIO);
  });

  it("la baseline corregida valida sin issues y conserva conteos, gaps y NE", () => {
    const { baseline, source } = leer();
    const v = validateCanonicalBaseline({ baseline, rawText: raw, rawBytes, source });
    expect(v.issues).toEqual([]);
    expect(v.summary?.objectCount).toBe(329);
    expect(v.summary?.gapCount).toBe(10);
    expect(v.summary?.transcriptionCorrectionCount).toBe(1);
    const ne = (baseline.gaps as { id: string; kind: string }[]).filter((g) => g.id.startsWith("NE-OP02-"));
    expect(ne.map((g) => g.id)).toEqual(["NE-OP02-01", "NE-OP02-02", "NE-OP02-03", "NE-OP02-04", "NE-OP02-05", "NE-OP02-06"]);
    ne.forEach((g) => expect(g.kind).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER"));
  });

  describe("el validador rechaza correcciones no gobernadas", () => {
    const conCorreccion = (mutar: (b: Record<string, any>) => void) => {
      const { baseline } = leer();
      mutar(baseline);
      return validateCanonicalBaseline({ baseline, rawText: raw, rawBytes }).issues.map((i) => i.code);
    };
    it("valor posterior no literal", () => {
      const codes = conCorreccion((b) => {
        const texto = "Las dependencias críticas están claras.";
        b.transcriptionCorrections[0].after = [texto];
        detalleIp05(b as { objects: Obj[] }).fields["doneCriteria"] = [texto];
      });
      expect(codes).toContain("NOT_VERBATIM");
    });
    it("corrección registrada pero no aplicada", () => {
      const codes = conCorreccion((b) => {
        detalleIp05(b as { objects: Obj[] }).fields["doneCriteria"] = [];
      });
      expect(codes).toContain("TRANSCRIPTION_CORRECTION");
    });
    it("anclada a otra transcripción raw", () => {
      const codes = conCorreccion((b) => {
        b.transcriptionCorrections[0].rawSha256 = "0".repeat(64);
      });
      expect(codes).toContain("TRANSCRIPTION_CORRECTION");
    });
    it("rango fuera del objeto", () => {
      const codes = conCorreccion((b) => {
        b.transcriptionCorrections[0].sourceLines = [6983, 6999];
      });
      expect(codes).toContain("TRANSCRIPTION_CORRECTION");
    });
  });
});

describe("M2-OP02-03 · IP05 → actividades → deliverable → Done → implementación → CRV", () => {
  const { source } = leer();
  const generado = generatePackCandidate(source);
  if (!generado.ok) throw new Error("OP-02 no genera candidato");
  const op02 = createKnowledgeEngine(generado.candidate.pack as Record<string, unknown>);
  const capas = (evidenciaC: boolean) => [
    { layerRef: "DC-A", completed: true },
    { layerRef: "DC-B", completed: true },
    { layerRef: "DC-C", completed: true, evidenceIds: evidenciaC ? ["ev-uso"] : [] },
  ];

  it("el patrón expone actividades mínimas, deliverable, un Done Criterion literal y su CRV", () => {
    const ip05 = op02.listInterventionPatterns().find((p) => p.patternRef === "IP05")!;
    expect(ip05.minimumActivities).toHaveLength(7);
    expect(ip05.deliverables).toEqual([
      { id: "DEL-OP02-05", name: "Mecanismo de coordinación para dependencias críticas.", instrumentRef: "INS-OP02-05" },
    ]);
    expect(ip05.doneCriteria).toEqual([{ position: 1, id: null, statement: BLOQUE_IP05 }]);
    expect(ip05.validationRequirementRefs).toEqual(["CRV-05"]);
  });

  it("I3 exige las tres capas, evidencia de adopción y el criterio compuesto", () => {
    const ok = op02.evaluateImplementation("IP05", {
      layerRecords: capas(true),
      doneCriteriaRecords: [{ position: 1, met: true }],
    });
    expect(ok.executionStateRef).toBe("I3");
    expect(ok.implemented).toBe(true);
    expect(ok.issues).toEqual([]);

    const sinCriterio = op02.evaluateImplementation("IP05", {
      layerRecords: capas(true),
      doneCriteriaRecords: [],
      assertedExecutionStateRef: "I3",
    });
    expect(sinCriterio.implemented).toBe(false);
    expect(sinCriterio.unmetDoneCriteriaPositions).toEqual([1]);

    const sinAdopcion = op02.evaluateImplementation("IP05", {
      layerRecords: capas(false),
      doneCriteriaRecords: [{ position: 1, met: true }],
    });
    expect(sinAdopcion.implemented).toBe(false);
    expect(sinAdopcion.layersMissingEvidence).toEqual(["DC-C"]);

    const inexistente = op02.evaluateImplementation("IP05", {
      layerRecords: capas(true),
      doneCriteriaRecords: [{ position: 1, met: true }, { position: 2, met: true }],
    });
    expect(inexistente.issues.join(" ")).toMatch(/posición 2/);
  });

  it("Done (I3) no satisface el CRV ni establece efectividad", () => {
    const done = op02.evaluateImplementation("IP05", {
      layerRecords: capas(true),
      doneCriteriaRecords: [{ position: 1, met: true }],
    });
    expect(done.validationRequirementSatisfied).toBeNull();
    expect(done.effectivenessStateRef).toBeNull();

    const crv = op02.getValidationRequirementsForOwner("INTERVENTION_PATTERN", "IP05");
    expect(crv.map((c) => c.requirementRef)).toEqual(["CRV-05"]);
    expect(crv[0]!.evaluation).toBe("GOVERNED_JUDGMENT");
    const automatico = op02.evaluateValidationRequirement("CRV-05", {
      primaryExecutorRespondentId: "a",
      cases: [1, 2, 3].map((i) => ({
        sequenceIndex: i,
        executorRespondentId: "b",
        outcome: "CORRECT" as const,
        criticalAssistance: false,
      })),
    });
    expect(automatico.satisfied).toBe(false);
    expect(automatico.status).toBe("REVIEW_REQUIRED");

    // Efectividad R4 sin CRV satisfecho no es admisible, aunque haya Done.
    const r4 = op02.assessValidation({
      requirementRef: "CRV-05",
      implementationStateRef: "I3",
      effectivenessStateRef: "R4",
      validationRequirementStatus: null,
      attributionConfidenceRef: "AC2",
      unintendedNegativeOutcome: false,
      evidenceIds: ["ev1"],
      validatedBy: "u1",
    });
    expect(r4.admissible).toBe(false);
  });
});
