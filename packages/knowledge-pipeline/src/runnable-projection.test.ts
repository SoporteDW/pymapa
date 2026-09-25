import { describe, expect, it } from "vitest";
import { generatePackCandidate } from "./generator.ts";
import { validateCapabilitySource } from "./master.ts";
import {
  enrichCapabilityIdentity,
  projectBaselineToRunnableSource,
  type ProjectableBaseline,
} from "./runnable-projection.ts";

const obj = (sourceId: string, title: string, body: string[] = []) => ({
  key: `${sourceId}@L1`,
  objectType: `SOURCE_ID_${sourceId.replace(/[-\d].*$/, "")}`,
  sourceId,
  fields: { heading: `${sourceId} · ${title}`, title, body },
  sourceLines: [1, 1],
});
const base = (objects: ProjectableBaseline["objects"]): ProjectableBaseline => ({
  capabilityId: "ZZ-01",
  baselineId: "ZZ01-K4-v1.0",
  checksum: "sha256:" + "0".repeat(64),
  master: {
    identity: "PYMAPA-KNOWLEDGE-MASTER",
    version: "1.0",
    baselineStatus: "BASELINE-APPROVED",
  },
  objects,
});
const complete = base([
  obj("CE01", "Condición"),
  obj("VA01", "Variable", ["Criticidad: CRITICAL", "Evidencia mínima E2", "NI-01.1 Qué pasa."]),
  obj("P1-ZZ01-01", "Pregunta", ["¿Cómo lo hacen hoy?", "Alimenta VA01."]),
]);
const ident = { name: "Nombre", literalLine: 1, definition: "Definición literal." };

const RAW = [
  "Definición productiva V1:",
  "ZZ-01 evalúa la capacidad literal.",
  "# 3. VA01 · Variable",
  "### Necesidades de Información",
  "NI-01.1 Qué pasa.",
  "# Bloque NI",
  "| NI02 | Sin VA explícita |",
].join("\n");

describe("M2-FACTORY-CONTRACT-03 · contrato genérico baseline → pack", () => {
  it("proyecta literalmente y genera un pack válido", () => {
    const r = projectBaselineToRunnableSource(complete, ident, RAW);
    expect(r.ok).toBe(true);
    const v = validateCapabilitySource(r.source);
    expect(v.ok).toBe(true);
    expect(generatePackCandidate(r.source as never).ok).toBe(true);
    expect(r.definition?.status).toBe("EXPLICIT");
    expect(r.definition?.text).toBe("ZZ-01 evalúa la capacidad literal.");
  });
  it("es determinista y reproducible", () => {
    const a = projectBaselineToRunnableSource(complete, ident, RAW);
    const b = projectBaselineToRunnableSource(structuredClone(complete), ident, RAW);
    expect(a.checksum).toBe(b.checksum);
  });
  it("criticidad no explícita: no inventa nivel, no bloquea generación", () => {
    const r = projectBaselineToRunnableSource(base([obj("VA01", "V")]), ident, RAW);
    expect(r.ok).toBe(true);
    const va = (r.source!["sections"] as any).variables[0];
    expect(va.criticality).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
    expect(va.acquisitionResolution).toBe("INFORMATION_NEED");
    expect(generatePackCandidate(r.source as never).ok).toBe(true);
  });
  it("NI→VA solo por estructura; NI sin estructura queda UNRESOLVED y VA sin vía bloquea publicación", () => {
    const r = projectBaselineToRunnableSource(
      base([obj("VA01", "V"), obj("VA02", "W")]),
      ident,
      RAW,
    );
    const s = r.source!["sections"] as any;
    const ni02 = s.informationNeeds.find((n: any) => n.id === "NI02");
    expect(ni02.variableRefs).toEqual([]);
    expect(ni02.mappingStatus).toBe("UNRESOLVED_NO_EXPLICIT_SOURCE_STRUCTURE");
    expect(s.variables[1].acquisitionResolution).toBe("UNRESOLVED");
    const gaps = r.source!["gaps"] as any[];
    const g = gaps.find((x) => x.id === "NE-ZZ-01-VA-ACQUISITION");
    expect(g.publicationBlocking).toBe(true);
    expect(g.kind).toBe("ACQUISITION_SEMANTICS_MISSING");
  });
  it("sin definición productiva ⇒ NOT_EXPLICIT (no bloqueante); sin nombre ⇒ bloqueo", () => {
    const r = projectBaselineToRunnableSource(
      complete,
      ident,
      "Propongo como definición inicial:\nZZ-01 evalúa algo.",
    );
    expect(r.definition?.status).toBe("NOT_EXPLICIT");
    expect(r.definition?.candidates[0]?.qualifier).toBe("NON_FINAL");
    const g = (r.source!["gaps"] as any[]).find((x) => x.id === "NE-ZZ-01-DEFINITION");
    expect(g.publicationBlocking).toBe(false);
    const n = projectBaselineToRunnableSource(complete, null, RAW);
    expect(n.blockers.map((b) => b.code)).toContain("CAPABILITY_NAME_MISSING");
  });
});

describe("M2-FACTORY-CLOSURE A2 · enriquecimiento de identidad", () => {
  const raw = "# ZZ-01 · Nombre literal\ntexto";
  it("preserva la aceptación si la sustancia no cambia", () => {
    const e = enrichCapabilityIdentity({
      capabilityId: "ZZ-01",
      name: "Nombre literal",
      rawText: raw,
      itemsBefore: [{ a: 1 }],
      itemsAfter: [{ a: 1 }],
    });
    expect(e.ok && e.event.humanAcceptancePreserved).toBe(true);
    expect(e.ok && e.event.kind).toBe("NON_SEMANTIC_METADATA_ENRICHMENT");
  });
  it("exige nueva revisión si la sustancia cambia", () => {
    const e = enrichCapabilityIdentity({
      capabilityId: "ZZ-01",
      name: "Nombre literal",
      rawText: raw,
      itemsBefore: [{ a: 1 }],
      itemsAfter: [{ a: 2 }],
    });
    expect(e.ok && e.event.humanAcceptancePreserved).toBe(false);
  });
  it("rechaza un nombre no literal", () => {
    expect(
      enrichCapabilityIdentity({
        capabilityId: "ZZ-01",
        name: "Otro",
        rawText: raw,
        itemsBefore: [],
        itemsAfter: [],
      }).ok,
    ).toBe(false);
  });
});

describe("M2-FINAL-15 · NI declaradas no enumeradas", () => {
  const two = base([obj("VA01", "V"), obj("VA02", "W")]);
  const P = [
    "# P1 · Núcleo",
    "No preguntaremos:",
    "“¿Cuál es su nivel?”",
    "Preguntaremos:",
    "“¿Qué falta hoy?”",
    "“¿Qué se repite?”",
    "# P2 · Triggers",
    "- retrabajo;",
    "# P3 · Discriminación",
    "Ante «x» distinguir A → ZZ-02",
  ];
  const rawB = ["# NI", "Resultan 2 NI correspondientes a las VA.", ...P].join("\n");
  const rawC = ["# NI", "Resultan 2 NI.", ...P].join("\n");
  const acqs = (r: any) => r.source.sections.acquisitions as any[];
  const gaps = (r: any) => r.source.gaps as any[];

  it("Grupo B · GOVERNED_STRUCTURAL_CORRESPONDENCE sin texto NI fabricado", () => {
    const r = projectBaselineToRunnableSource(two, ident, rawB);
    expect(r.ok).toBe(true);
    const s = r.source!["sections"] as any;
    expect(s.variables.map((v: any) => v.acquisitionResolution)).toEqual([
      "GOVERNED_STRUCTURAL_CORRESPONDENCE",
      "GOVERNED_STRUCTURAL_CORRESPONDENCE",
    ]);
    const corr = acqs(r).filter((a) => a.acquisitionMode === "GOVERNED_STRUCTURAL_CORRESPONDENCE");
    expect(corr).toHaveLength(2);
    for (const a of corr) {
      expect(a.informationNeedStatus).toBe("DECLARED_NOT_ENUMERATED");
      expect(a.correspondenceStatement).toBe("Resultan 2 NI correspondientes a las VA.");
      expect(a.question).toBeUndefined();
      expect(a.informationNeedRef).toBeUndefined();
    }
    expect(s.informationNeeds).toEqual([]);
    expect(generatePackCandidate(r.source as never).ok).toBe(true);
  });

  it("Grupo C · CAPABILITY_PROGRESSIVE con P1 literal, sin mapeo ordinal", () => {
    const r = projectBaselineToRunnableSource(two, ident, rawC);
    expect(r.ok).toBe(true);
    const s = r.source!["sections"] as any;
    expect(
      s.variables.every((v: any) => v.acquisitionResolution === "CAPABILITY_PROGRESSIVE"),
    ).toBe(true);
    const p = acqs(r).filter((a) => a.acquisitionMode === "CAPABILITY_PROGRESSIVE");
    expect(p.map((a) => a.question)).toEqual(["¿Qué falta hoy?", "¿Qué se repite?"]);
    expect(p[0].variableRefs).toEqual(["VA01", "VA02"]);
    expect(p[0].progressiveContext.informationNeedStatus).toBe("DECLARED_NOT_ENUMERATED");
    expect(p[0].progressiveContext.p2.triggers[0].text).toBe("retrabajo;");
    expect(acqs(r).some((a) => a.acquisitionMode === "GOVERNED_STRUCTURAL_CORRESPONDENCE")).toBe(
      false,
    );
    expect(generatePackCandidate(r.source as never).ok).toBe(true);
  });

  it("INFORMATION_NEED_NOT_ENUMERATED no bloquea cuando existe adquisición", () => {
    const g = gaps(projectBaselineToRunnableSource(two, ident, rawC)).find(
      (x) => x.kind === "INFORMATION_NEED_NOT_ENUMERATED",
    );
    expect(g.publicationBlocking).toBe(false);
    expect(g.sourceReference).toBe("raw L2");
    expect(
      gaps(projectBaselineToRunnableSource(two, ident, rawC)).some((x) => x.publicationBlocking),
    ).toBe(false);
  });

  it("ACQUISITION_SEMANTICS_MISSING sigue bloqueando sin P1 ni correspondencia", () => {
    const r = projectBaselineToRunnableSource(two, ident, "# NI\nResultan 2 NI.");
    const g = gaps(r).find((x) => x.kind === "ACQUISITION_SEMANTICS_MISSING");
    expect(g.publicationBlocking).toBe(true);
    expect(
      gaps(r).find((x) => x.kind === "INFORMATION_NEED_NOT_ENUMERATED").publicationBlocking,
    ).toBe(false);
  });

  it("no altera proyecciones ya resueltas (sin VA pendientes no se añade nada)", () => {
    const r = projectBaselineToRunnableSource(complete, ident, RAW + "\n" + P.join("\n"));
    expect(acqs(r).some((a) => a.acquisitionMode === "CAPABILITY_PROGRESSIVE")).toBe(false);
  });
});
