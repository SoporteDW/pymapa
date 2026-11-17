/** G1 · contratos: cardinalidades, inactividad por defecto y separación LEGACY_DEMO_SCORE. */
import { describe, expect, it } from "vitest";
import { MME_CATALOGO, MME_VINCULOS_CANDIDATOS, conteosCatalogo, registroActivacionInactivo } from "./catalogo.server";
import { assess } from "./evaluador.server";
import { MME_CHECK_WEIGHT, MME_THRESHOLD_CURRENT, MME_THRESHOLD_PREDECESSORS, etiquetarLegacyDemoScore, ordinalNivelAcreditado } from "./tipos";

describe("MME G1 · contratos", () => {
  it("31 capacidades, 155 rúbricas, 620 verificaciones, 445 vínculos, 31 indicadores", () => {
    expect(conteosCatalogo()).toEqual({ capacidades: 31, rubricas: 155, verificaciones: 620, indicadores: 31, vinculos: 445 });
  });
  it("constantes DEC-062: peso 0,25, corriente >50 %, predecesores >85 %", () => {
    expect([MME_CHECK_WEIGHT, MME_THRESHOLD_CURRENT, MME_THRESHOLD_PREDECESSORS]).toEqual([0.25, 0.5, 0.85]);
    for (const c of Object.values(MME_CATALOGO.capabilities))
      for (const l of Object.values(c.levels)) {
        expect(l.checks.map((x) => x.type).sort()).toEqual(["CONTEXTO", "EVIDENCIA", "HECHO", "OPERACION"]);
        expect(l.checks.every((x) => x.weight === 0.25)).toBe(true);
      }
  });
  it("ningún vínculo candidato viene autorizado", () => {
    expect(MME_VINCULOS_CANDIDATOS.every((v) => v.binding_authorized === false)).toBe(true);
  });
  it("registro por defecto vacío bloquea todas las capacidades de diagnóstico inicial", () => {
    for (const cid of Object.keys(MME_CATALOGO.capabilities)) {
      const r = assess(cid, {
        catalog: MME_CATALOGO, attestations: [], assessmentId: "A", evidenceStore: {}, signers: {},
        policyRegistry: { [cid]: MME_CATALOGO.version }, activationRegistry: registroActivacionInactivo(),
      });
      expect(r.level).toBeNull();
      expect(["BLOCKED_NO_ITEM_AUTHORIZATION", "EXCLUDED_OP05"]).toContain(r.status);
    }
  });
  it("nivel no acreditado no es 0 ni M1; ordinal 20×nivel solo si acreditado", () => {
    expect(ordinalNivelAcreditado(null)).toBeNull();
    expect(ordinalNivelAcreditado("M3")).toBe(60);
  });
  it("LEGACY_DEMO_SCORE separado y nunca verificado", () => {
    expect(etiquetarLegacyDemoScore(72)).toEqual({ source: "LEGACY_DEMO_SCORE", value: 72, verified: false });
  });
});
