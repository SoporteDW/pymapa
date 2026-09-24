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
  master: { identity: "PYMAPA-KNOWLEDGE-MASTER", version: "1.0", baselineStatus: "BASELINE-APPROVED" },
  objects,
});
const complete = base([
  obj("CE01", "Condición"),
  obj("VA01", "Variable", ["Criticidad: CRITICAL", "Evidencia mínima E2", "NI-01.1 Qué pasa."]),
  obj("P1-ZZ01-01", "Pregunta", ["¿Cómo lo hacen hoy?", "Alimenta VA01."]),
]);
const ident = { name: "Nombre", literalLine: 1, definition: "Definición literal." };

describe("M2-FACTORY-CLOSURE A1 · baseline canónica → pack ejecutable", () => {
  it("proyecta literalmente y genera un pack válido", () => {
    const r = projectBaselineToRunnableSource(complete, ident);
    expect(r.ok).toBe(true);
    expect(validateCapabilitySource(r.source).ok).toBe(true);
    const g = generatePackCandidate(validateCapabilitySource(r.source).ok ? (r.source as never) : (null as never));
    expect(g.ok).toBe(true);
    expect(r.stats).toEqual({ variables: 1, informationNeeds: 1, acquisitions: 1, conditions: 1 });
  });
  it("es determinista y reproducible", () => {
    const a = projectBaselineToRunnableSource(complete, ident);
    const b = projectBaselineToRunnableSource(structuredClone(complete), ident);
    expect(a.checksum).toBe(b.checksum);
  });
  it("no inventa criticidad: bloquea con GENERIC_RUNTIME_EXTENSION_REQUIRED", () => {
    const r = projectBaselineToRunnableSource(
      base([obj("VA01", "V"), obj("P1-ZZ01-01", "P", ["¿x?", "VA01"])]),
      ident,
    );
    expect(r.ok).toBe(false);
    expect(r.source).toBeNull();
    expect(r.blockers.map((b) => b.code)).toContain("GRE-CRITICALITY-NOT-EXPLICIT");
  });
  it("no asocia preguntas sin VA literal ni sin definición/nombre", () => {
    const r = projectBaselineToRunnableSource(
      base([obj("VA01", "V", ["CRITICAL"]), obj("P1-ZZ01-01", "P", ["¿x?", "VA04–VA06"])]),
      null,
    );
    const codes = r.blockers.map((b) => b.code);
    expect(codes).toContain("NO_RUNNABLE_ACQUISITION_IN_CANONICAL");
    expect(codes).toContain("CAPABILITY_NAME_MISSING");
    expect(r.blockers.every((b) => b.publicationBlocking)).toBe(true);
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
