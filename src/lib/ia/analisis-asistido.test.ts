import { describe, expect, it } from "vitest";
import { validarAnalisis, type EntradaAnalisis } from "./analisis-asistido";

const E: EntradaAnalisis[] = [
  { ref: "o1", kind: "RESPONSE", acquisitionId: "A1", label: "¿Ventas?", text: "Vendimos 1 200 unidades en 2025 por canal mayorista." },
];
const run = (items: unknown[]) => validarAnalisis({ items }, E);

describe("DEC-053 contrato AI_ASSISTED_ANALYSIS", () => {
  it("acepta un hecho con cita literal de una entrada", () => {
    const r = run([{ category: "SUPPORTED_FACT", statement: "Ventas 2025 mayoristas", inputRefs: ["o1"], quote: "1 200 unidades en 2025" }]);
    expect(r.items).toHaveLength(1);
  });
  it("rechaza hecho sin cita y cita no literal", () => {
    const r = run([
      { category: "SUPPORTED_FACT", statement: "x", inputRefs: ["o1"], quote: null },
      { category: "SUPPORTED_FACT", statement: "x", inputRefs: ["o1"], quote: "3 000 unidades" },
    ]);
    expect(r.rejected.map((x) => x.reason)).toEqual(["FACT_WITHOUT_QUOTE", "QUOTE_NOT_LITERAL"]);
  });
  it("rechaza referencias inventadas y categorías fuera de las 5", () => {
    const r = run([
      { category: "INFERENCE", statement: "x", inputRefs: ["zz"], quote: null },
      { category: "ENGINE_FINDING", statement: "x", inputRefs: ["o1"], quote: null },
    ]);
    expect(r.rejected.map((x) => x.reason)).toEqual(["UNKNOWN_REF", "INVALID_CATEGORY"]);
  });
  it("rechaza puntajes, madurez y rankings", () => {
    const r = run([
      { category: "INFERENCE", statement: "Madurez 3 de la capacidad", inputRefs: ["o1"], quote: null },
      { category: "PROVISIONAL_SUGGESTION", statement: "Puntaje 7/10", inputRefs: ["o1"], quote: null },
    ]);
    expect(r.items).toHaveLength(0);
    expect(r.rejected.every((x) => x.reason === "FORBIDDEN_CONTENT")).toBe(true);
  });
  it("información faltante puede no tener referencia", () => {
    expect(run([{ category: "INFORMATION_GAP", statement: "Falta margen bruto", inputRefs: [], quote: null }]).items).toHaveLength(1);
  });
});
