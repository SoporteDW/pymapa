/**
 * M2-BATCH-01 / 01R · extractor estructural determinista + resolver genérico
 * de supersesión + decisiones de gobierno sobre las fuentes históricas
 * registradas de OP-03, OP-04 y OP-05.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INTAKE_DIR,
  extractStructuralCandidate,
  loadMasterIndex,
  parseGovernanceDecisions,
  promoteCandidateToCanonicalBaseline,
  rawSourceRegistrationSchema,
  resolveSupersessions,
  sealGovernanceDecisions,
  validateExtractionCandidate,
  validateMasterIndex,
  type ExtractionCandidate,
  type GovernanceDecisions,
  type ResolverOccurrence,
  type SupersessionMode,
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

function load(
  cap: string,
  mode: SupersessionMode = "GOVERNED",
  decisionsOverride?: unknown,
  name: string | null | undefined = undefined,
) {
  const dir = join(INTAKE_DIR, cap);
  const registration = rawSourceRegistrationSchema.parse(readJson(join(dir, "registration.json")));
  const rawText = readFileSync(join(ROOT, dir, registration.text!.ref), "utf8");
  const ref = join(dir, "governance-decisions.json");
  const d = parseGovernanceDecisions(decisionsOverride ?? readJson(ref), cap);
  if (!d.ok) throw new Error(d.reasons.join("; "));
  const out = extractStructuralCandidate({
    registration,
    rawText,
    capabilityName: name === undefined ? (NAMES[cap] ?? null) : name,
    capabilityIds,
    domainIds: master.domains.map((x) => x.id),
    supersession: mode,
    governanceDecisions: { value: d.value, ref },
  });
  return { dir, registration, rawText, decisions: d.value, ...out };
}
const validate = (x: ReturnType<typeof load>) =>
  validateExtractionCandidate({
    candidate: x.candidate,
    registration: x.registration,
    rawText: x.rawText,
    extensionRegistry: null,
  });
const finals = (x: ReturnType<typeof load>, prefix: string) =>
  x.candidate.items.filter(
    (i) =>
      i.classification === "FINAL_APPROVED" &&
      new RegExp(`^${prefix}\\d{2}$`).test(i.sourceId ?? ""),
  );

const BEFORE: Record<string, number> = { "OP-03": 25, "OP-04": 33, "OP-05": 14 };
// M2-BATCH-02: las colisiones restantes se cerraron por decisión de gobierno literal.
const AFTER: Record<string, number> = { "OP-03": 0, "OP-04": 0, "OP-05": 0 };

describe.each(["OP-03", "OP-04", "OP-05"])("%s · candidato estructural gobernado", (cap) => {
  const x = load(cap);

  it("es CANDIDATE determinista e idéntico al artefacto en intake", () => {
    expect(x.candidate.status).toBe("CANDIDATE");
    expect(x.candidate.producedBy.method).toBe("DETERMINISTIC_TOOL");
    // El artefacto aceptado se extrajo sin nombre declarado (identidad no
    // verificada en el candidato sellado); se reproduce con los mismos insumos.
    const sealed = load(cap, "GOVERNED", undefined, null);
    expect(readJson(join(x.dir, "candidate.json"))).toEqual(
      JSON.parse(JSON.stringify(sealed.candidate)),
    );
    expect(readJson(join(x.dir, "extraction-report.json"))).toEqual(
      JSON.parse(JSON.stringify(sealed.report)),
    );
    expect(load(cap).candidate.checksum).toBe(x.candidate.checksum);
  });

  it("la línea base 0.1.0 (sin resolver) se reproduce: ambigüedades originales", () => {
    const base = load(cap, "NONE");
    expect(base.report.ambiguousSupersessions.length).toBe(BEFORE[cap]);
    expect(x.report.supersessionResolution?.baseline.ambiguousIds).toBe(BEFORE[cap]);
    expect(x.report.ambiguousSupersessions.length).toBe(AFTER[cap]);
  });

  it("identidad literal y cierre K4 seleccionado por decisión de gobierno verificada", () => {
    expect(x.report.identity.verified).toBe(true);
    const own = cap.replace("-", "");
    expect(x.report.historicalClosure.marker).toBe(`${own}-K4-v1.0 · K4-VALIDATED · CLOSED`);
    const line = x.report.historicalClosure.selectedLine!;
    expect(x.rawText.split("\n")[line - 1]).toContain(x.report.historicalClosure.marker!);
    expect(x.report.governance?.errors).toEqual([]);
  });

  it("conteos aprobados: literales en la fuente y consistentes con lo materializado", () => {
    const counts = x.report.governance!.approvedCounts;
    expect(counts.length).toBe(x.decisions.approvedCounts.length);
    counts.forEach((c) => {
      expect(c.sourceLines).not.toBeNull();
      expect(c.consistent).not.toBe(false);
    });
  });

  it("a lo sumo una definición FINAL_APPROVED por identificador", () => {
    const n = new Map<string, number>();
    x.candidate.items
      .filter((i) => i.classification === "FINAL_APPROVED")
      .forEach((i) => n.set(i.sourceId ?? "", (n.get(i.sourceId ?? "") ?? 0) + 1));
    expect([...n.values()].every((v) => v === 1)).toBe(true);
  });

  it("toda supersesión cita evidencia literal y preserva la versión previa", () => {
    const lines = x.rawText.split("\n");
    x.candidate.items
      .filter((i) => i.supersession)
      .forEach((i) => {
        i.supersession!.evidence.forEach((ev) => {
          const [a, b] = ev.sourceLines;
          expect(lines.slice(a - 1, b).join("\n")).toContain(ev.text);
        });
      });
    // Las versiones previas siguen en el candidato (no se borran).
    const baseItems = load(cap, "NONE").candidate.items.filter((i) => i.sourceId);
    const keys = new Set(x.candidate.items.map((i) => `${i.sourceId}@${i.sourceLines?.[0]}`));
    baseItems.forEach((i) => expect(keys.has(`${i.sourceId}@${i.sourceLines?.[0]}`)).toBe(true));
  });

  it("los identificadores no resueltos siguen sin FINAL_APPROVED (REVIEW_REQUIRED)", () => {
    const unresolved = new Set(x.report.ambiguousSupersessions.map((a) => a.sourceId));
    x.candidate.items
      .filter((i) => i.sourceId && unresolved.has(i.sourceId))
      .forEach((i) => expect(i.classification).toBe("HISTORICAL_DRAFT"));
  });

  it("no materializa objetos de otras capacidades como propios", () => {
    const otras = capabilityIds.filter((c) => c !== cap).map((c) => c.replace("-", ""));
    x.candidate.items.forEach((i) =>
      otras.forEach((o) => expect(i.sourceId ?? "").not.toContain(o)),
    );
  });

  it("validación independiente sin FAIL; promoción bloqueada sin aceptación", () => {
    const v = validate(x);
    expect(v.issues.filter((i) => i.severity === "FAIL")).toEqual([]);
    const p = promoteCandidateToCanonicalBaseline({
      validation: v,
      acceptance: undefined,
      registration: x.registration,
      rawRef: "raw/x.txt",
      sourceRef: "source.json",
    });
    expect(p.ok).toBe(false);
  });

  it("aceptación canónica humana presente; sin revisión de publicación ni pack fabricados", () => {
    const acc = readJson(join(x.dir, "canonical-acceptance.json")) as { candidateChecksum: string };
    expect(acc.candidateChecksum).toBe(
      readJson(join(x.dir, "candidate.json")) &&
        (readJson(join(x.dir, "candidate.json")) as { checksum: string }).checksum,
    );
    expect(
      existsSync(
        join(ROOT, "knowledge", "master", "v1.0", "capabilities", cap, "governance-review.json"),
      ),
    ).toBe(false);
    expect(existsSync(join(ROOT, "knowledge", "packs", cap.toLowerCase()))).toBe(false);
  });
});

describe("ejemplos de certificación (emergen de la evidencia, no de mapeos)", () => {
  it("OP-03: VA09 eliminada, VA10 reformulada como VA08; arquitectura 4 CE / 8 VA", () => {
    const x = load("OP-03");
    const va09 = x.candidate.items.filter((i) => i.sourceId === "VA09");
    const va10 = x.candidate.items.filter((i) => i.sourceId === "VA10");
    expect(va09.every((i) => i.supersession?.kind === "ELIMINATED")).toBe(true);
    expect(va10.every((i) => i.supersession?.kind === "SUPERSEDED_BY_SUCCESSOR")).toBe(true);
    expect(va10.every((i) => i.classification === "SUPERSEDED")).toBe(true);
    expect(finals(x, "CE").length).toBe(4);
    expect(finals(x, "VA").length).toBe(8);
  });

  it("OP-04: CE04 de la etapa temprana queda histórica; arquitectura 3 CE / 9 VA", () => {
    const x = load("OP-04");
    const ce04 = x.candidate.items.filter((i) => i.sourceId === "CE04");
    expect(ce04.length).toBeGreaterThan(0);
    ce04.forEach((i) => {
      expect(i.classification).not.toBe("FINAL_APPROVED");
      expect(i.supersession?.kind).toBe("NOT_IN_FROZEN_ARCHITECTURE");
    });
    expect(finals(x, "CE").length).toBe(3);
    expect(finals(x, "VA").length).toBe(9);
  });

  it("OP-05: cierre final tras la validación documental; el K4 provisional no rige", () => {
    const x = load("OP-05");
    const sel = x.report.governance!.closureSelection!;
    expect(sel.selectedBy).toBe("GOVERNANCE_DECISION");
    const lines = x.rawText.split("\n");
    const window = lines.slice(sel.selectedLine! - 8, sel.selectedLine!).join("\n");
    ["DoD: 27/27 PASS", "A–V: 22/22 PASS", "K1–K4: 4/4 PASS"].forEach((l) =>
      expect(window).toContain(l),
    );
    sel.confirmationOrNonFinalLines.forEach((l) => expect(l).toBeLessThan(sel.selectedLine!));
    expect(finals(x, "VA").length).toBe(10);
  });

  it("OP-03: backlog gobernado exactamente A-OP03-01..03, no bloqueante, con provenance", () => {
    const x = load("OP-03");
    const b = x.candidate.items.filter((i) => i.sourceId?.startsWith("A-OP03-"));
    expect(b.map((i) => i.sourceId)).toEqual(["A-OP03-01", "A-OP03-02", "A-OP03-03"]);
    b.forEach((i) => {
      expect(i.classification).toBe("GOVERNED_BACKLOG");
      expect(i.governanceDecision).toBeTruthy();
    });
  });

  it("una decisión de gobierno que no es literal en la fuente se rechaza", () => {
    const d = readJson(join(INTAKE_DIR, "OP-03", "governance-decisions.json")) as {
      approvedCounts: { sourceLiteral: string }[];
    };
    const t = structuredClone(d);
    t.approvedCounts[0]!.sourceLiteral = "4 CE INVENTADOS";
    // Sin resellar: el checksum de la decisión lo rechaza.
    expect(parseGovernanceDecisions(t, "OP-03").ok).toBe(false);
    // Resellada: la decisión no es literal en la fuente → error de gobierno.
    const { checksum: _c, ...body } = t as unknown as GovernanceDecisions;
    const x = load("OP-03", "GOVERNED", sealGovernanceDecisions(body));
    expect(x.report.governance!.errors.length).toBeGreaterThan(0);
  });
});

describe("resolver genérico: la cronología y la última aparición nunca deciden", () => {
  const occ = (line: number, title: string): ResolverOccurrence => ({
    key: `ZZ01@L${line}`,
    sourceId: "ZZ01",
    prefix: "ZZ",
    line,
    end: line + 1,
    sectionEnd: line + 1,
    level: 3,
    heading: `ZZ01 · ${title}`,
    title,
    body: ["texto"],
    backlog: false,
    draftHeading: false,
  });
  const lines = ["", "", "### ZZ01 · Primero", "texto", "", "### ZZ01 · Segundo", "texto"];

  it("dos definiciones sin evidencia explícita → sin resolver", () => {
    const r = resolveSupersessions({
      lines,
      occurrences: [occ(3, "Primero"), occ(6, "Segundo")],
      markers: [],
      headings: [
        { line: 3, text: "ZZ01 · Primero", level: 3 },
        { line: 6, text: "ZZ01 · Segundo", level: 3 },
      ],
      closureLine: null,
    });
    expect(r.resolvedIds).toEqual([]);
    expect(r.unresolvedIds.map((u) => u.sourceId)).toEqual(["ZZ01"]);
    expect(r.resolutions.size).toBe(0);
  });

  it("el código del resolver no contiene identificadores de capacidad", () => {
    const src = readFileSync(join(import.meta.dirname, "supersession-resolver.ts"), "utf8");
    expect(src).not.toMatch(/\b[A-Z]{2}-?0\d\b/);
  });
});

describe("frontera de candidatos", () => {
  it("SUPERSESSION_AMBIGUOUS bloquea la promoción aun con aceptación humana válida", () => {
    const dir = join(INTAKE_DIR, "DG-03");
    const registration = rawSourceRegistrationSchema.parse(
      readJson(join(dir, "registration.json")),
    );
    const rawText = readFileSync(join(ROOT, dir, registration.text!.ref), "utf8");
    const candidate = readJson(join(dir, "candidate.json")) as ExtractionCandidate;
    const v = validateExtractionCandidate({
      candidate,
      registration,
      rawText,
      extensionRegistry: null,
    });
    expect(v.issues.some((i) => i.code === "SUPERSESSION_AMBIGUOUS")).toBe(true);
    const p = promoteCandidateToCanonicalBaseline({
      validation: v,
      acceptance: {
        capabilityId: "DG-03",
        candidateChecksum: candidate.checksum,
        decision: "ACCEPTED",
        reviewer: "TEST_ONLY",
        reviewedAt: "2026-01-01",
      },
      registration,
      rawRef: "raw/x.txt",
      sourceRef: "source.json",
    });
    expect(p.ok).toBe(false);
  });
});
