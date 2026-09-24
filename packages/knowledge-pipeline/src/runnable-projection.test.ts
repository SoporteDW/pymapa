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
    expect(gaps.find((g) => g.id === "NE-ZZ-01-VA-ACQUISITION").publicationBlocking).toBe(true);
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
