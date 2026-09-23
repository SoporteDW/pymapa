/**
 * M2-OP02-01 · OP-02 Canonical Materialization + Pipeline Certification.
 *
 * Certifica que OP-02 (segunda capacidad gobernada) se materializa por el
 * pipeline genérico y se ejecuta por el engine genérico, sin branching por
 * capabilityId, sin inventar conocimiento y sin tocar OP-01 Golden.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { validateKnowledgePack } from "@pymapa/knowledge-schema";
import {
  computeSelfChecksum,
  discoverCapabilityPipelineInputs,
  loadCanonicalBaselines,
  runBatch,
  validateCanonicalBaseline,
  verifySelfChecksum,
} from "./index.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const VERSION = "v1.0";
const DIR = join(ROOT, "knowledge", "master", VERSION, "capabilities", "OP-02");

type Obj = {
  key: string;
  objectType: string;
  sourceId: string | null;
  fields: Record<string, unknown>;
  provenance?: { classes: string[] };
};
type Baseline = {
  capabilityId: string;
  objects: Obj[];
  gaps: { id: string; kind: string }[];
  provenanceVocabulary: { code: string }[];
  historicalStatus: { marker: string };
  [k: string]: unknown;
};

const cb = loadCanonicalBaselines(ROOT, VERSION).find((c) => c.capabilityDir === "OP-02");
if (!cb) throw new Error("falta la baseline canónica de OP-02");
const baseline = cb.baseline as Baseline;
const source = JSON.parse(readFileSync(join(DIR, "source.json"), "utf8")) as {
  capability: { id: string };
  sections: Record<string, unknown>;
  gaps: { id: string; kind: string; publicationBlocking: boolean }[];
  provenance: Record<string, string>;
};
const clonar = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const validar = (b: unknown, s: unknown = source, raw = cb.rawText) =>
  validateCanonicalBaseline({
    baseline: b,
    rawText: raw,
    rawBytes: new TextEncoder().encode(raw),
    source: s as Parameters<typeof validateCanonicalBaseline>[0]["source"],
  });
const ids = (tipo: string) =>
  baseline.objects.filter((o) => o.objectType === tipo).map((o) => o.sourceId);

describe("OP-02 · fuente autoritativa y baseline canónica", () => {
  it("la baseline y la fuente están selladas y la transcripción raw es íntegra", () => {
    expect(verifySelfChecksum(baseline as unknown as Record<string, unknown>).ok).toBe(true);
    expect(verifySelfChecksum(source as unknown as Record<string, unknown>).ok).toBe(true);
    const v = validar(baseline);
    expect(v.issues).toEqual([]);
    expect(v.ok).toBe(true);
    expect(baseline.historicalStatus.marker).toBe("OP02-K4-v1.0 · K4-VALIDATED · CLOSED");
  });

  it("todos los conteos de control declarados por la fuente coinciden", () => {
    const v = validar(baseline);
    expect(v.summary?.controlCounts.length).toBe(12);
    v.summary?.controlCounts.forEach((c) => expect(c.materialized).toBe(c.declared));
    expect(v.summary?.objectCount).toBe(329);
  });

  it("preserva identidad, CE, VA, NI, findings, patrones, instrumentos, entregables, CRV y backlog", () => {
    expect(ids("CONDITION_OF_EXISTENCE")).toHaveLength(5);
    expect(ids("APPLIED_VARIABLE")).toHaveLength(10);
    expect(ids("INFORMATION_NEED")).toHaveLength(47);
    expect(ids("FINDING_FAMILY")).toEqual([
      "HF01",
      "HF02",
      "HF03",
      "HF04",
      "HF05",
      "HF06",
      "HF07",
      "HF08",
    ]);
    expect(ids("FINDING_VARIANT")).toContain("OP02-HF03A");
    expect(ids("FINDING_VARIANT")).toContain("OP02-HF03B");
    expect(ids("FINDING_VARIANT")).toHaveLength(9);
    expect(ids("INTERVENTION_PATTERN")).toHaveLength(8);
    expect(ids("INSTRUMENT")).toHaveLength(8);
    expect(ids("DELIVERABLE")).toHaveLength(8);
    expect(ids("RESULT_CRITERION")).toEqual([
      "CRV-01",
      "CRV-02",
      "CRV-03",
      "CRV-04",
      "CRV-05",
      "CRV-06A",
      "CRV-06B",
      "CRV-07",
      "CRV-08",
    ]);
    expect(ids("GOVERNED_BACKLOG_ITEM")).toEqual(["A-OP02-01", "A-OP02-02", "A-OP02-03"]);
    expect(ids("DEFINITION_OF_DONE")).toHaveLength(27);
  });

  it("la procedencia usa solo el vocabulario de la fuente", () => {
    expect(baseline.provenanceVocabulary.map((p) => p.code)).toEqual([
      "SOURCE_ASSERTED",
      "DIGIWAY_INTERNAL",
      "PYMAPA_DERIVED",
      "CONTEXTUAL",
    ]);
    const codigos = new Set(baseline.provenanceVocabulary.map((p) => p.code));
    baseline.objects.forEach((o) =>
      o.provenance?.classes.forEach((c) => expect(codigos.has(c)).toBe(true)),
    );
  });

  it("no inventa IDs de adquisición: solo P1-OP02-01/02 existen", () => {
    expect(ids("ACQUISITION")).toEqual(["P1-OP02-01", "P1-OP02-02"]);
    const acquisitions = source.sections["acquisitions"] as { id: string }[];
    expect(acquisitions.map((a) => a.id)).toEqual(["P1-OP02-01", "P1-OP02-02"]);
    expect(JSON.stringify(source)).not.toMatch(/P[2-5]-OP02-\d/);
  });

  it("los GENERIC_RUNTIME_EXTENSION_REQUIRED se preservan y quedan cerrados por extensión genérica", () => {
    const gre = baseline.gaps
      .filter((g) => g.kind === "GENERIC_RUNTIME_EXTENSION_REQUIRED")
      .map((g) => g.id);
    expect(gre).toEqual(["GRE-OP02-01", "GRE-OP02-02", "GRE-OP02-03", "GRE-OP02-04"]);
    // M2-OP02-02: los CRV se proyectan con dueño de patrón; sin activities ni recomendaciones inventadas.
    expect(Object.keys(source.sections)).toContain("validationRequirements");
    expect(Object.keys(source.sections)).not.toContain("activities");
    expect(Object.keys(source.sections)).not.toContain("recommendations");
    const fuenteGaps = new Map(
      source.gaps.map((g) => [g.id, g as { resolution?: { status: string } }]),
    );
    baseline.gaps.forEach((g) => expect(fuenteGaps.has(g.id)).toBe(true));
    gre.forEach((id) =>
      expect(fuenteGaps.get(id)?.resolution?.status).toBe("CLOSED_BY_GENERIC_RUNTIME_EXTENSION"),
    );
    // Los NOT_EXPLICIT nunca se "cierran".
    source.gaps
      .filter((g) => g.kind === "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER")
      .forEach((g) => expect((g as { resolution?: unknown }).resolution).toBeUndefined());
  });

  it("no inventa fecha de aprobación histórica; la publicación solo existe por autorización humana registrada", () => {
    expect(source.provenance["approvedAt"]).toBe("SOURCE_CONTENT_NOT_RECOVERED");
    const g = JSON.parse(readFileSync(join(DIR, "governance-review.json"), "utf8")) as Record<
      string,
      unknown
    >;
    expect(g["decision"]).toBe("APPROVED");
    expect(g["reviewer"]).toBe("PROJECT_OWNER / KNOWLEDGE_GOVERNANCE_AUTHORITY");
    expect(String(g["authorizationSource"])).toMatch(/^M2-BATCH-01/);
    expect(existsSync(join(ROOT, "knowledge", "packs", "op-02", "1.0.0", "published.json"))).toBe(
      true,
    );
  });
});

describe("OP-02 · el validador de baseline rechaza desviaciones", () => {
  it("texto no literal → NOT_VERBATIM", () => {
    const b = clonar(baseline);
    const va = b.objects.find((o) => o.objectType === "APPLIED_VARIABLE")!;
    va.fields["name"] = `${String(va.fields["name"])} (mejorado)`;
    expect(validar(b).issues.map((i) => i.code)).toContain("NOT_VERBATIM");
  });

  it("clase de procedencia inventada → UNKNOWN_PROVENANCE_CLASS", () => {
    const b = clonar(baseline);
    const o = b.objects.find((x) => x.provenance)!;
    o.provenance!.classes = ["INFERRED"];
    expect(validar(b).issues.map((i) => i.code)).toContain("UNKNOWN_PROVENANCE_CLASS");
  });

  it("objeto eliminado → CONTROL_COUNT_MISMATCH", () => {
    const b = clonar(baseline);
    b.objects = b.objects.filter((o) => o.sourceId !== "CRV-06B");
    expect(validar(b).issues.map((i) => i.code)).toContain("CONTROL_COUNT_MISMATCH");
  });

  it("raw alterado → RAW_INTEGRITY", () => {
    expect(validar(baseline, source, `${cb.rawText} `).issues.map((i) => i.code)).toContain(
      "RAW_INTEGRITY",
    );
  });

  it("gap perdido en la proyección → GAP_NOT_PRESERVED", () => {
    const s = clonar(source);
    s.gaps = s.gaps.filter((g) => g.id !== "GRE-OP02-01");
    expect(validar(baseline, s).issues.map((i) => i.code)).toContain("GAP_NOT_PRESERVED");
  });

  it("texto añadido a la proyección ejecutable → PROJECTION_NOT_VERBATIM", () => {
    const s = clonar(source);
    (s.sections["variables"] as { name: string }[])[0]!.name =
      "Variable reformulada por inferencia";
    expect(validar(baseline, s).issues.map((i) => i.code)).toContain("PROJECTION_NOT_VERBATIM");
  });

  it("referencia rota → UNRESOLVED_REFERENCE", () => {
    const b = clonar(baseline);
    b.objects.find((o) => o.sourceId === "CRV-01")!.fields["patternRef"] = "IP99";
    expect(validar(b).issues.map((i) => i.code)).toContain("UNRESOLVED_REFERENCE");
  });
});

describe("OP-02 · pipeline genérico y engine genérico", () => {
  const lote = runBatch(discoverCapabilityPipelineInputs(ROOT, VERSION));
  const op02 = lote.results.find((r) => r.capabilityId === "OP-02")!;

  it("pasa todas las validaciones técnicas y, con la aprobación registrada, queda PUBLISHED sin bloqueos", () => {
    expect(op02.errors).toEqual([]);
    expect(op02.outcome).toBe("PASS");
    expect(op02.state).toBe("PUBLISHED");
    expect(op02.publication?.blockers).toEqual([]);
    expect(op02.diff?.clean).toBe(true);
    expect(op02.goldenRegression).toMatchObject({ compared: true, equivalent: true });
  });

  it("los 10 fixtures OP-02 corren por el mismo harness sin FAIL y sin findings confirmados", () => {
    const res = op02.runtimeResults;
    expect(res).toHaveLength(10);
    res.forEach((r) => {
      expect(r.outcome).not.toBe("FAIL");
      expect(r.observed.confirmedFindings).toBe(0);
    });
  });

  it("el pack OP-02 valida con el schema genérico y el engine no resuelve lo no explícito", () => {
    const pack = op02.candidate!.pack;
    expect(validateKnowledgePack(pack).ok).toBe(true);
    const engine = createKnowledgeEngine(pack);
    const r = engine.evaluate({
      knowledgeVersionId: "test-kv-op02",
      observations: [
        {
          id: "o1",
          variableRef: "VA01",
          acquisitionRef: "P1-OP02-01",
          knowledgeState: "KNOWN",
          semanticValue: "Tenemos atrasos cuando aumenta el volumen.",
          sourceResponseId: "r1",
          respondentId: "p1",
          evidenceIds: [],
          notApplicableReason: null,
          conflictingObservationIds: [],
          recordedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(r.evidenceRequirements).toHaveLength(10);
    r.evidenceRequirements.forEach((e) =>
      expect(e.resolution).toBe("EVIDENCE_REQUIREMENT_REVIEW_REQUIRED"),
    );
    expect(r.findings).toHaveLength(0);
    r.findingCandidates.forEach((f) => {
      expect(f.lifecycleState).toBe("NEEDS_REVIEW");
      expect(f.deterministicallyConfirmable).toBe(false);
      expect(f.severity.state).toBeNull();
    });
    expect(r.needsReview).toBe(true);
  });

  it("todas las reglas OP-02 son GOVERNED_JUDGMENT (ninguna se promueve a DETERMINISTIC)", () => {
    const reglas = source.sections["rules"] as { classification: string }[];
    expect(reglas.length).toBeGreaterThan(0);
    reglas.forEach((r) => expect(r.classification).not.toBe("DETERMINISTIC"));
  });

  it("el schema rechaza un nivel mínimo no explícito sin requisito condicional", () => {
    const pack = clonar(op02.candidate!.pack) as { variables: Record<string, unknown>[] };
    delete pack.variables[0]!["minimumEvidenceConditional"];
    expect(validateKnowledgePack(pack).ok).toBe(false);
  });
});

describe("OP-02 · sin branching por capacidad", () => {
  const paquetes = ["knowledge-engine", "knowledge-schema", "knowledge-pipeline"];
  it("ningún código de runtime, schema o pipeline menciona OP-02", () => {
    for (const p of paquetes) {
      const dir = join(ROOT, "packages", p, "src");
      readdirSync(dir)
        .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
        .forEach((f) => {
          // El rótulo del hito (M2-OP02-01) en comentarios no es lógica.
          const texto = readFileSync(join(dir, f), "utf8").replaceAll("M2-OP02-01", "");
          expect(texto, `${p}/${f}`).not.toMatch(/M2-OP02-02/);
          expect(texto, `${p}/${f}`).not.toMatch(/OP-?02/);
        });
    }
  });

  it("OP-01 Golden no cambia", () => {
    const lote = runBatch(discoverCapabilityPipelineInputs(ROOT, VERSION));
    const op01 = lote.results.find((r) => r.capabilityId === "OP-01");
    expect(op01?.state).toBe("PUBLISHED");
    expect(op01?.goldenRegression).toMatchObject({ compared: true, equivalent: true });
    const fuente = JSON.parse(
      readFileSync(
        join(ROOT, "knowledge", "master", VERSION, "capabilities", "OP-01", "source.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(computeSelfChecksum(fuente)).toBe(fuente["checksum"]);
  });
});
