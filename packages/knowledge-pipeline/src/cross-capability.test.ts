/**
 * M2-BATCH-01R · registro gobernado cross-capability: A-OP02-02 y BOUND-OP05-02.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CROSS_CAPABILITY_REGISTRY_PATH,
  loadCrossCapabilityContext,
  sealCrossCapabilityRegistry,
  validateCrossCapabilityRegistry,
  type CrossCapabilityEntry,
} from "./index.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
type Reg = { registryId: string; statement: string; entries: CrossCapabilityEntry[] };
const registry = JSON.parse(
  readFileSync(join(ROOT, CROSS_CAPABILITY_REGISTRY_PATH), "utf8"),
) as Reg & { checksum: string };
const ctx = loadCrossCapabilityContext(ROOT);
const reseal = (r: Reg & { checksum?: string }) => {
  const { checksum: _omit, ...body } = r;
  return sealCrossCapabilityRegistry(body);
};
const clone = () => structuredClone(registry);
const status = (v: ReturnType<typeof validateCrossCapabilityRegistry>, id: string) =>
  v.entries.find((e) => e.id === id)?.effectiveStatus;

describe("registro cross-capability", () => {
  it("es válido, literal y sin FAIL", () => {
    const v = validateCrossCapabilityRegistry({ registry, ...ctx });
    expect(v.issues).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it("A-OP02-02 permanece abierto mientras OP-03 no tenga aceptación canónica", () => {
    const v = validateCrossCapabilityRegistry({ registry, ...ctx });
    const e = registry.entries.find((x) => x.id === "A-OP02-02")!;
    expect(e.decision).toBe("KEEP_OPEN_PENDING_OP03_CANONICAL_ACCEPTANCE");
    expect(e.resolutionEvent).toBeNull();
    expect(status(v, "A-OP02-02")).toBe("OPEN_PENDING_CANONICAL_ACCEPTANCE");
  });

  it("con aceptación vigente de OP-03 pasa a elegible, nunca a resuelto por sí mismo", () => {
    const acceptances = new Map(ctx.acceptances);
    acceptances.set("OP-03", {
      decision: "ACCEPTED",
      candidateChecksum: ctx.candidates.get("OP-03")!.checksum,
    });
    const v = validateCrossCapabilityRegistry({ registry, ...ctx, acceptances });
    expect(status(v, "A-OP02-02")).toBe("RESOLUTION_EVENT_ELIGIBLE");
  });

  it("un evento de resolución sin aceptación canónica vigente → FAIL", () => {
    const r = clone();
    r.entries[0]!.resolutionEvent = {
      recordedAt: "2026-09-23",
      canonicalAcceptanceChecksum: ctx.candidates.get("OP-03")!.checksum,
      evidenceRefs: [3],
    };
    const v = validateCrossCapabilityRegistry({ registry: reseal(r), ...ctx });
    expect(v.ok).toBe(false);
  });

  it("el pack publicado op-02@1.0.0 citado debe seguir intacto", () => {
    const publishedPacks = new Map(ctx.publishedPacks);
    publishedPacks.set("op-02@1.0.0", "sha256:" + "0".repeat(64));
    const v = validateCrossCapabilityRegistry({ registry, ...ctx, publishedPacks });
    expect(v.ok).toBe(false);
  });

  it("evidencia no literal → FAIL", () => {
    const r = clone();
    r.entries[1]!.evidence[1]!.text = "La coordinación pertenece a OP-05 siempre.";
    const v = validateCrossCapabilityRegistry({ registry: reseal(r), ...ctx });
    expect(v.ok).toBe(false);
  });

  it("registro alterado sin resellar → FAIL por checksum", () => {
    const r = clone();
    r.entries[0]!.statement = "alterado";
    expect(validateCrossCapabilityRegistry({ registry: r, ...ctx }).ok).toBe(false);
  });

  it("BOUND-OP05-02: definición única, sin contradicción posterior → CONDITION_MET", () => {
    const v = validateCrossCapabilityRegistry({ registry, ...ctx });
    expect(status(v, "BOUND-OP05-02")).toBe("CONDITION_MET");
  });

  it("BOUND-OP05-02: una aparición posterior en la fuente exige revisión humana", () => {
    const sources = new Map(ctx.sources);
    const s = sources.get("OP-05")!;
    sources.set("OP-05", { ...s, rawText: `${s.rawText}\nBOUND-OP05-02 se reformula.` });
    const v = validateCrossCapabilityRegistry({ registry, ...ctx, sources });
    expect(status(v, "BOUND-OP05-02")).toBe("CONDITION_NOT_MET");
    expect(v.issues.some((i) => i.severity === "REVIEW")).toBe(true);
  });
});
