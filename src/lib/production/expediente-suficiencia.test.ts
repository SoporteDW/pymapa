import { describe, expect, it } from "vitest";
import { clasificarSuficiencia, resumenSuficiencia } from "./expediente-suficiencia";

const A = [
  { capabilityId: "OP-01", acquisitionId: "A1", informationNeed: "Objetivo con línea base y plazo" },
  { capabilityId: "OP-01", acquisitionId: "A2" },
  { capabilityId: "OP-01", acquisitionId: "A3" },
];
const p = (quote: string, evidenceId = "e1", match: "ALTA" | "PARCIAL" = "ALTA") => ({ capabilityId: "OP-01", acquisitionId: "A1", match, quote, evidenceId });

describe("suficiencia documental MVP31 · 2.0.0", () => {
  it("ausente: sin evidencia pertinente", () => {
    expect(clasificarSuficiencia(A, [])[0]!.sufficiency).toBe("AUSENTE");
  });
  it("objetivo con porcentaje pero sin línea base ni plazo es PARCIAL y pide lo que falta", () => {
    const r = clasificarSuficiencia(A, [p("Meta: aumentar ventas 15%")])[0]!;
    expect(r.sufficiency).toBe("PARCIAL");
    expect(r.missing).toContain("Objetivo con línea base y plazo");
  });
  it("cifra, fecha o porcentaje aislados con coincidencia alta nunca son SUFICIENTE", () => {
    for (const q of ["120", "31/12/2025", "Rotación de 12% anual"]) {
      expect(clasificarSuficiencia(A, [p(q)])[0]!.sufficiency).toBe("PARCIAL");
    }
  });
  it("positivo: SUFICIENTE solo tras confirmación humana sin contradicción", () => {
    const r = clasificarSuficiencia(A, [p("Ventas 2025: S/ 1,2 M; meta 2026 +15% al cierre de diciembre")], new Set(["OP-01::A1"]))[0]!;
    expect(r.sufficiency).toBe("SUFICIENTE");
    expect(r.missing).toBeNull();
  });
  it("contradictoria: cifras distintas en documentos distintos no se resuelve ni con confirmación", () => {
    const r = clasificarSuficiencia(A, [p("Rotación de 12%", "e1"), p("Rotación de 18%", "e2")], new Set(["OP-01::A1"]));
    expect(r[0]!.sufficiency).toBe("CONTRADICTORIA");
    expect(resumenSuficiencia(r)).toEqual({ SUFICIENTE: 0, PARCIAL: 0, AUSENTE: 2, contradicciones: 1 });
  });
  it("misma cifra en dos documentos no es contradicción", () => {
    const r = clasificarSuficiencia(A, [p("Rotación de 12%", "e1"), p("rotación 12%", "e2")]);
    expect(r[0]!.sufficiency).toBe("PARCIAL");
  });
});
