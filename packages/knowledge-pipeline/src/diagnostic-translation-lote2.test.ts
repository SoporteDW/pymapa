/** KNOW-EXEC-05-L · Lote 2 (DG-01..05, PC-01..05) con el traductor de KNOW-EXEC-03 sin cambios de lógica. */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { translateCapability, type SemanticInput } from "./diagnostic-translation.ts";

const CAPS = ["DG-01", "DG-02", "DG-03", "DG-04", "DG-05", "PC-01", "PC-02", "PC-03", "PC-04", "PC-05"];
const DIAG: Record<string, number> = {
  "DG-01": 9, "DG-02": 10, "DG-03": 10, "DG-04": 11, "DG-05": 13,
  "PC-01": 12, "PC-02": 13, "PC-03": 14, "PC-04": 14, "PC-05": 15,
};
const semantic = JSON.parse(readFileSync("knowledge/staging/_inputs/KNOW-EXEC-04-L.lote2.json", "utf8")) as SemanticInput;
const run = (cap: string, sem: SemanticInput = semantic) => {
  const baselinePath = `knowledge/master/v1.0/capabilities/${cap}/canonical-baseline.json`;
  const publishedPackPath = `knowledge/packs/${cap.toLowerCase()}/1.0.0/pack.json`;
  return translateCapability({
    capabilityId: cap, baselinePath,
    baseline: JSON.parse(readFileSync(baselinePath, "utf8")),
    publishedPackPath, publishedPack: JSON.parse(readFileSync(publishedPackPath, "utf8")),
    semantic: sem,
  });
};

describe("KNOW-EXEC-05-L lote 2", () => {
  const out = Object.fromEntries(CAPS.map((c) => [c, run(c)]));

  it("procesa las 121 reglas diagnósticas con los conteos de la matriz", () => {
    for (const c of CAPS) expect(out[c].counts.diagnostic).toBe(DIAG[c]);
    expect(CAPS.reduce((n, c) => n + out[c].counts.diagnostic, 0)).toBe(121);
  });

  it("ningún candidato es ejecutable, vinculado ni emisible y no hay predicados", () => {
    for (const c of CAPS) {
      expect(out[c].publicationAuthorized).toBe(false);
      expect(out[c].counts.executable).toBe(0);
      expect(out[c].counts.emitted).toBe(0);
      for (const r of out[c].rules) {
        expect([r.executable, r.bindingApproved, r.emissionApproved, r.predicate]).toEqual([false, false, false, null]);
      }
    }
  });

  it("no infiere referencias HF, VA ni CE (la matriz no identifica ninguna literal)", () => {
    for (const c of CAPS) for (const r of out[c].rules) {
      expect(r.hfReferences).toEqual([]);
      expect(r.variableRefs).toEqual([]);
      expect(r.conditionRefs).toEqual([]);
    }
  });

  it("DS-04: R-DG01-01 no queda vinculada a HF-DG01-01 y el control queda como excepción", () => {
    const r = out["DG-01"].rules.find((x) => x.ruleId === "R-DG01-01")!;
    expect(r.hfReferences).not.toContain("HF-DG01-01");
    expect(r.hfLinkKind).toBe("NONE_IDENTIFIED");
    expect(out["DG-01"].exceptions.some((e) => e.exceptionId === "DS-04")).toBe(true);
  });

  it("texto histórico copiado del baseline, sin divergencias", () => {
    for (const c of CAPS) {
      expect(out[c].exceptions.filter((e) => e.kind === "TEXT_DIVERGENCE")).toEqual([]);
      const b = JSON.parse(readFileSync(`knowledge/master/v1.0/capabilities/${c}/canonical-baseline.json`, "utf8"));
      for (const r of out[c].rules) {
        const o = b.objects.find((x: { key: string }) => x.key === r.ruleId);
        expect(r.historicalText).toBe(o.fields.body.join("\n"));
      }
    }
  });

  it("STOP-DG01-01 sin cuerpo se registra como excepción y no se reconstruye", () => {
    expect(out["DG-01"].rules.some((r) => r.ruleId === "STOP-DG01-01")).toBe(false);
    expect(out["DG-01"].exceptions.find((e) => e.ruleIds.includes("STOP-DG01-01"))?.kind).toBe("MISSING_SOURCE");
  });

  it("es determinista y coincide con lo escrito en staging", () => {
    for (const c of CAPS) {
      expect(run(c).checksum).toBe(out[c].checksum);
      expect(JSON.parse(readFileSync(`knowledge/staging/${c}/candidate.json`, "utf8")).checksum).toBe(out[c].checksum);
    }
  });

  it("independencia: procesar una capacidad no depende de las filas de otra", () => {
    const solo = { ...semantic, S1: semantic.S1.filter((r) => r.Capacidad === "PC-03"), S2: semantic.S2.filter((r) => r.Capacidad === "PC-03") };
    expect(run("PC-03", solo).rules).toEqual(out["PC-03"].rules);
  });

  it("los packs publicados no contienen candidatos ni staging en el registro", () => {
    const reg = readFileSync("src/lib/production/packs-registry.ts", "utf8");
    expect(reg).not.toMatch(/staging/);
    for (const c of CAPS) expect(existsSync(`knowledge/packs/${c.toLowerCase()}/1.0.0/candidate.json`)).toBe(false);
  });
});
