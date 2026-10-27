import { readFileSync, readdirSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { knowledgePackSchema, stagingCandidateSchema } from "@pymapa/knowledge-schema";
import { translateCapability, type SemanticInput } from "./diagnostic-translation.ts";

const semantic = JSON.parse(
  readFileSync("knowledge/staging/_inputs/KNOW-EXEC-03-S.lote1.json", "utf8"),
) as SemanticInput;
const leer = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const traducir = (cap: string, sem: SemanticInput = semantic) =>
  translateCapability({
    capabilityId: cap,
    baselinePath: `knowledge/master/v1.0/capabilities/${cap}/canonical-baseline.json`,
    baseline: leer(`knowledge/master/v1.0/capabilities/${cap}/canonical-baseline.json`),
    publishedPackPath: `knowledge/packs/${cap.toLowerCase()}/1.0.0/pack.json`,
    publishedPack: leer(`knowledge/packs/${cap.toLowerCase()}/1.0.0/pack.json`),
    semantic: sem,
  });

describe("KNOW-EXEC-03 · traducción gobernada a staging", () => {
  it("conteos por capacidad según la matriz Fase 2 (44 reglas: 32 diagnósticas, 12 guardrails)", () => {
    const esperado = { "OP-03": [11, 8, 3], "OP-04": [21, 13, 8], "OP-05": [12, 11, 1] } as const;
    let total = 0;
    for (const [cap, [r, d, g]] of Object.entries(esperado)) {
      const c = traducir(cap);
      expect([c.counts.rules, c.counts.diagnostic, c.counts.guardrails]).toEqual([r, d, g]);
      total += c.counts.rules;
    }
    expect(total).toBe(44);
  });

  it("cada capacidad se procesa de forma independiente", () => {
    const c = traducir("OP-04");
    expect(c.rules.every((r) => r.ruleId.startsWith("R-OP04"))).toBe(true);
  });

  it("conserva texto literal y procedencia del baseline", () => {
    for (const cap of ["OP-03", "OP-04", "OP-05"]) {
      const b = leer(`knowledge/master/v1.0/capabilities/${cap}/canonical-baseline.json`);
      for (const r of traducir(cap).rules) {
        const o = b.objects.find((x: { key: string }) => x.key === r.ruleId);
        expect(r.historicalText).toBe(o.fields.body.join("\n"));
        expect(r.sourceRef.sourceLines).toEqual(o.sourceLines);
      }
    }
  });

  it("guardrails nunca tienen referencia HF ni se emiten", () => {
    for (const cap of ["OP-03", "OP-04", "OP-05"]) {
      for (const r of traducir(cap).rules.filter((x) => x.role === "GUARDRAIL")) {
        expect(r.hfReferences).toEqual([]);
        expect(r.hfLinkKind).toBe("NONE_IDENTIFIED");
      }
    }
  });

  it("ninguna regla es ejecutable, vinculada ni emitible; sin predicado", () => {
    for (const cap of ["OP-03", "OP-04", "OP-05"]) {
      const c = traducir(cap);
      expect(c.publicationAuthorized).toBe(false);
      expect(c.counts.executable).toBe(0);
      expect(c.counts.emitted).toBe(0);
      for (const r of c.rules) {
        expect([r.executable, r.bindingApproved, r.emissionApproved, r.predicate]).toEqual([false, false, false, null]);
      }
    }
  });

  it("el schema rechaza un candidato que pretenda ser ejecutable", () => {
    const c = traducir("OP-03");
    const malo = { ...c, rules: [{ ...c.rules[0], executable: true }] };
    expect(stagingCandidateSchema.safeParse(malo).success).toBe(false);
  });

  it("referencia ausente en baseline queda como excepción y se continúa", () => {
    const first = semantic.S1[0];
    if (!first) throw new Error("Missing semantic fixture");
    const sem = { ...semantic, S1: [...semantic.S1, { ...first, "Regla K4": "R-OP03-99" }] };
    const c = traducir("OP-03", sem);
    expect(c.exceptions.some((e) => e.kind === "MISSING_SOURCE" && e.ruleIds[0] === "R-OP03-99")).toBe(true);
    expect(c.counts.rules).toBe(11);
  });

  it("OP-04 R-OP04-06 conserva relación compuesta HF04+HF06 sin aprobarla", () => {
    const r = traducir("OP-04").rules.find((x) => x.ruleId === "R-OP04-06")!;
    expect(r.hfReferences).toEqual(["HF04", "HF06"]);
    expect(r.composite).toBe(true);
    expect(r.bindingApproved).toBe(false);
  });

  it("staging aislado: runtime y registro no referencian knowledge/staging", () => {
    const dirs = ["src", "packages/knowledge-engine/src"];
    const archivos = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? archivos(`${d}/${e.name}`) : /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [`${d}/${e.name}`] : [],
      );
    for (const f of dirs.flatMap(archivos)) {
      expect(readFileSync(f, "utf8").includes("knowledge/staging"), f).toBe(false);
    }
  });

  it("los packs publicados del lote siguen sin reglas ni hallazgos y validan con el schema original", () => {
    for (const cap of ["op-03", "op-04", "op-05"]) {
      const p = leer(`knowledge/packs/${cap}/1.0.0/pack.json`);
      expect(p.rules ?? []).toEqual([]);
      expect(p.findings ?? []).toEqual([]);
      expect(knowledgePackSchema.safeParse(p).success).toBe(true);
    }
  });

  it("los candidatos escritos coinciden con la regeneración determinística", () => {
    for (const cap of ["OP-03", "OP-04", "OP-05"]) {
      const ruta = `knowledge/staging/${cap}/candidate.json`;
      expect(existsSync(ruta)).toBe(true);
      expect(leer(ruta)).toEqual(JSON.parse(JSON.stringify(traducir(cap))));
    }
  });
});
