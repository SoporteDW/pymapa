/**
 * PYM-NOV-MVP31 · Pruebas del Plan de Transformación 6D/31C.
 * Reglas cubiertas: autoridad explícita, solo hallazgos CONFIRMED, solo el
 * análisis vigente por capacidad, decisión más reciente por propuesta,
 * aislamiento defensivo por organización y cobertura del catálogo 6D/31C.
 */
import { describe, expect, it } from "vitest";
import {
  clavePropuestaAnalisis,
  clavePropuestaHallazgo,
  consolidarPlanTransformacion,
  type EntradaCatalogo,
  type FilaAnalisisPlan,
  type FilaDecisionPlan,
  type FilaHallazgoPlan,
} from "./transformation-plan";

const ORG = "org-1";
const CATALOGO: EntradaCatalogo[] = [
  { capabilityId: "OP-01", name: "Conocimiento crítico", domainId: "OP" },
  { capabilityId: "OP-02", name: "Actividades y responsabilidades", domainId: "OP" },
  { capabilityId: "DG-02", name: "Priorizar iniciativas", domainId: "DG" },
  { capabilityId: "CM-01", name: "Clientes", domainId: "CM" },
];

function hallazgo(parcial: Partial<FilaHallazgoPlan>): FilaHallazgoPlan {
  return {
    id: "f1", organization_id: ORG, capability_id: "OP-01", finding_ref: "H04",
    polarity: "ADVERSE", lifecycle_state: "CONFIRMED", detail: { name: "Dependencia individual crítica" },
    created_at: "2026-10-01T00:00:00Z", ...parcial,
  };
}

function analisis(parcial: Partial<FilaAnalisisPlan>): FilaAnalisisPlan {
  return {
    id: "a1", organization_id: ORG, capability_id: "DG-02", contract_version: "DEC-053/1.0.0", model: "openai/gpt-6-luna",
    items: [
      { id: "item-1", category: "SUPPORTED_FACT", statement: "Hecho con cita", quote: "cita literal" },
      { id: "item-2", category: "INFORMATION_GAP", statement: "Falta dato", quote: null },
    ],
    created_at: "2026-10-02T00:00:00Z", ...parcial,
  };
}

function decision(parcial: Partial<FilaDecisionPlan>): FilaDecisionPlan {
  return {
    organization_id: ORG, proposal_key: clavePropuestaHallazgo("f1"), decision: "ACCEPTED",
    modified_action: null, note: "nota suficiente", created_at: "2026-10-03T00:00:00Z", ...parcial,
  };
}

describe("consolidarPlanTransformacion", () => {
  it("solo los hallazgos CONFIRMED generan propuestas institucionales", () => {
    const r = consolidarPlanTransformacion(ORG, CATALOGO, {
      findings: [hallazgo({}), hallazgo({ id: "f2", lifecycle_state: "NEEDS_REVIEW" }), hallazgo({ id: "f3", lifecycle_state: "SUPERSEDED" })],
      analyses: [], reviews: [], decisions: [],
    });
    expect(r.resumen.institucionales).toBe(1);
    expect(r.resumen.total).toBe(1);
  });

  it("solo el análisis más reciente por capacidad alimenta el plan vigente", () => {
    const r = consolidarPlanTransformacion(ORG, CATALOGO, {
      findings: [],
      analyses: [analisis({}), analisis({ id: "a0", created_at: "2026-10-01T00:00:00Z", items: [{ id: "viejo", category: "INFERENCE", statement: "viejo", quote: null }] })],
      reviews: [], decisions: [],
    });
    expect(r.resumen.asistidas).toBe(2);
    expect(r.dominios.flatMap((d) => d.capacidades.flatMap((c) => c.propuestas)).every((p) => p.fuente.analysisId === "a1")).toBe(true);
  });

  it("la decisión más reciente por propuesta es la vigente", () => {
    const r = consolidarPlanTransformacion(ORG, CATALOGO, {
      findings: [hallazgo({})], analyses: [], reviews: [],
      decisions: [decision({}), decision({ decision: "DISCARDED", created_at: "2026-10-04T00:00:00Z" })],
    });
    const p = r.dominios.flatMap((d) => d.capacidades.flatMap((c) => c.propuestas))[0]!;
    expect(p.decision?.decision).toBe("DISCARDED");
    expect(r.resumen.porDecision["DISCARDED"]).toBe(1);
  });

  it("una decisión MODIFIED reemplaza la acción visible y conserva la nota", () => {
    const r = consolidarPlanTransformacion(ORG, CATALOGO, {
      findings: [hallazgo({})], analyses: [], reviews: [],
      decisions: [decision({ decision: "MODIFIED", modified_action: "Acción ajustada por la empresa" })],
    });
    const p = r.dominios.flatMap((d) => d.capacidades.flatMap((c) => c.propuestas))[0]!;
    expect(p.decision?.modifiedAction).toBe("Acción ajustada por la empresa");
  });

  it("descarta filas de otras organizaciones aunque lleguen al consolidador", () => {
    const r = consolidarPlanTransformacion(ORG, CATALOGO, {
      findings: [hallazgo({}), hallazgo({ id: "fx", organization_id: "org-ajena" })],
      analyses: [analisis({}), analisis({ id: "ax", organization_id: "org-ajena" })],
      reviews: [],
      decisions: [decision({}), decision({ organization_id: "org-ajena", proposal_key: clavePropuestaHallazgo("fx") })],
    });
    expect(r.resumen.total).toBe(3); // 1 hallazgo + 2 items del análisis propio
    expect(r.resumen.institucionales).toBe(1);
  });

  it("proyecta el catálogo 6D/31C completo aunque no haya propuestas", () => {
    const r = consolidarPlanTransformacion(ORG, CATALOGO, { findings: [], analyses: [], reviews: [], decisions: [] });
    expect(r.dominios.map((d) => d.domainId)).toEqual(["OP", "DG", "CM"]);
    expect(r.dominios.flatMap((d) => d.capacidades).length).toBe(4);
    expect(r.resumen.total).toBe(0);
  });

  it("las claves de propuesta son estables y trazables a su fuente", () => {
    expect(clavePropuestaHallazgo("f1")).toBe("FINDING:f1");
    expect(clavePropuestaAnalisis("a1", "item-1")).toBe("AI:a1:item-1");
  });

  it("la revisión humana del análisis asistido se refleja en la propuesta", () => {
    const r = consolidarPlanTransformacion(ORG, CATALOGO, {
      findings: [], analyses: [analisis({})],
      reviews: [{ analysis_id: "a1", item_id: "item-1", decision: "ACCEPTED" }], decisions: [],
    });
    const items = r.dominios.flatMap((d) => d.capacidades.flatMap((c) => c.propuestas));
    expect(items.find((p) => p.fuente.itemId === "item-1")?.revisionHumana).toBe("ACCEPTED");
    expect(items.find((p) => p.fuente.itemId === "item-2")?.revisionHumana).toBeNull();
  });
});
