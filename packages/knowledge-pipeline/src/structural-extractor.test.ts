/**
 * M2-BATCH-01 · extractor estructural determinista + frontera de candidatos
 * sobre las fuentes históricas registradas de OP-03, OP-04 y OP-05.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INTAKE_DIR,
  extractStructuralCandidate,
  loadMasterIndex,
  promoteCandidateToCanonicalBaseline,
  rawSourceRegistrationSchema,
  validateExtractionCandidate,
  validateMasterIndex,
  type ExtractionCandidate,
} from "./index.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const master = (() => {
  const m = validateMasterIndex(loadMasterIndex(ROOT, "v1.0"));
  if (!m.ok) throw new Error("master inválido");
  return m.value;
})();
const vs = master.verticalStatus as {
  domainClosures: { domainId: string; declaredCapabilityCount: number }[];
};
const capabilityIds = vs.domainClosures.flatMap((d) =>
  Array.from(
    { length: d.declaredCapabilityCount },
    (_, i) => `${d.domainId}-${String(i + 1).padStart(2, "0")}`,
  ),
);
const NAMES: Record<string, string> = {
  "OP-03": "Integrar procesos de extremo a extremo",
  "OP-04": "Simplificar y automatizar de manera pertinente",
  "OP-05": "Gestionar iniciativas hasta su implementación efectiva",
};
const readJson = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8")) as unknown;

function load(cap: string) {
  const dir = join(INTAKE_DIR, cap);
  const registration = rawSourceRegistrationSchema.parse(readJson(join(dir, "registration.json")));
  const rawText = readFileSync(join(ROOT, dir, registration.text!.ref), "utf8");
  const out = extractStructuralCandidate({
    registration,
    rawText,
    capabilityName: NAMES[cap] ?? null,
    capabilityIds,
    domainIds: master.domains.map((d) => d.id),
  });
  return { dir, registration, rawText, ...out };
}

describe.each(["OP-03", "OP-04", "OP-05"])("%s · candidato estructural", (cap) => {
  const x = load(cap);

  it("es CANDIDATE determinista e idéntico al artefacto en intake", () => {
    expect(x.candidate.status).toBe("CANDIDATE");
    expect(x.candidate.producedBy.method).toBe("DETERMINISTIC_TOOL");
    expect(readJson(join(x.dir, "candidate.json"))).toEqual(JSON.parse(JSON.stringify(x.candidate)));
    expect(readJson(join(x.dir, "extraction-report.json"))).toEqual(
      JSON.parse(JSON.stringify(x.report)),
    );
    expect(load(cap).candidate.checksum).toBe(x.candidate.checksum);
  });

  it("identidad literal y cierre histórico K4 literal", () => {
    expect(x.report.identity.verified).toBe(true);
    const own = cap.replace("-", "");
    expect(x.report.historicalClosure.marker).toBe(`${own}-K4-v1.0 · K4-VALIDATED · CLOSED`);
    const line = x.report.historicalClosure.selectedLine!;
    expect(x.rawText.split("\n")[line - 1]).toContain(x.report.historicalClosure.marker!);
  });

  it("ningún identificador multi-definido queda FINAL_APPROVED (la cronología no decide)", () => {
    const multi = new Set(x.report.ambiguousSupersessions.map((a) => a.sourceId));
    expect(multi.size).toBeGreaterThan(0);
    x.candidate.items
      .filter((i) => i.sourceId && multi.has(i.sourceId))
      .forEach((i) => expect(i.classification).toBe("HISTORICAL_DRAFT"));
  });

  it("no materializa objetos de otras capacidades como propios", () => {
    const otras = capabilityIds.filter((c) => c !== cap).map((c) => c.replace("-", ""));
    x.candidate.items.forEach((i) =>
      otras.forEach((o) => expect(i.sourceId ?? "").not.toContain(o)),
    );
  });

  it("validación independiente: sin FAIL, REVIEW por supersesión ambigua; promoción bloqueada", () => {
    const v = validateExtractionCandidate({
      candidate: x.candidate,
      registration: x.registration,
      rawText: x.rawText,
      extensionRegistry: { entries: [] } as never,
    });
    expect(v.issues.filter((i) => i.severity === "FAIL")).toEqual([]);
    expect(v.issues.some((i) => i.code === "SUPERSESSION_AMBIGUOUS")).toBe(true);
    const p = promoteCandidateToCanonicalBaseline({
      validation: v,
      acceptance: undefined,
      registration: x.registration,
      rawRef: "raw/x.txt",
      sourceRef: "source.json",
    });
    expect(p.ok).toBe(false);
  });

  it("sin aceptación canónica, revisión de gobierno ni pack fabricados", () => {
    expect(existsSync(join(ROOT, x.dir, "canonical-acceptance.json"))).toBe(false);
    expect(
      existsSync(join(ROOT, "knowledge", "master", "v1.0", "capabilities", cap, "governance-review.json")),
    ).toBe(false);
    expect(existsSync(join(ROOT, "knowledge", "packs", cap.toLowerCase()))).toBe(false);
  });
});

describe("cronología y frontera de candidatos", () => {
  it("OP-05: el cierre condicional previo no se selecciona sin marca de confirmación humana", () => {
    const x = load("OP-05");
    expect(x.report.historicalClosure.lines.length).toBeGreaterThan(1);
    expect(x.report.historicalClosure.requiresHumanConfirmation).toBe(true);
    const k3 = x.report.chronology.find((c) => c.marker.startsWith("OP05-K3-v0.9"))!;
    expect(k3.line).toBeLessThan(x.report.historicalClosure.selectedLine!);
  });

  it("SUPERSESSION_AMBIGUOUS bloquea la promoción aun con aceptación humana válida", () => {
    const x = load("OP-05");
    const v = validateExtractionCandidate({
      candidate: x.candidate,
      registration: x.registration,
      rawText: x.rawText,
      extensionRegistry: { entries: [] } as never,
    });
    const p = promoteCandidateToCanonicalBaseline({
      validation: v,
      acceptance: {
        capabilityId: "OP-05",
        candidateChecksum: (x.candidate as ExtractionCandidate).checksum,
        decision: "ACCEPTED",
        reviewer: "TEST_ONLY",
        reviewedAt: "2026-01-01",
      },
      registration: x.registration,
      rawRef: "raw/x.txt",
      sourceRef: "source.json",
    });
    expect(p.ok).toBe(false);
  });
});
