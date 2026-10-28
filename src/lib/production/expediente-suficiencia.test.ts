import { describe, expect, it } from "vitest";
import { clasificarSuficiencia, resumenSuficiencia } from "./expediente-suficiencia";

const A = [{ capabilityId: "OP-01", acquisitionId: "A1" }, { capabilityId: "OP-01", acquisitionId: "A2" }, { capabilityId: "OP-01", acquisitionId: "A3" }];

describe("suficiencia documental MVP31", () => {
  it("sin cita es AUSENTE", () => {
    expect(clasificarSuficiencia(A, [])[0]!.sufficiency).toBe("AUSENTE");
  });
  it("cita alta sin dato concreto es PARCIAL, nunca SUFICIENTE", () => {
    const r = clasificarSuficiencia(A, [{ capabilityId: "OP-01", acquisitionId: "A1", match: "ALTA", quote: "Contamos con procesos definidos", evidenceId: "e1" }]);
    expect(r[0]!.sufficiency).toBe("PARCIAL");
  });
  it("cita parcial con cifra sigue PARCIAL", () => {
    const r = clasificarSuficiencia(A, [{ capabilityId: "OP-01", acquisitionId: "A1", match: "PARCIAL", quote: "120 pedidos", evidenceId: "e1" }]);
    expect(r[0]!.sufficiency).toBe("PARCIAL");
  });
  it("cita alta con cifra es SUFICIENTE", () => {
    const r = clasificarSuficiencia(A, [{ capabilityId: "OP-01", acquisitionId: "A1", match: "ALTA", quote: "Rotación de 12% anual", evidenceId: "e1" }]);
    expect(r[0]!.sufficiency).toBe("SUFICIENTE");
  });
  it("cifras distintas en documentos distintos marcan posible contradicción", () => {
    const r = clasificarSuficiencia(A, [
      { capabilityId: "OP-01", acquisitionId: "A1", match: "ALTA", quote: "Rotación de 12%", evidenceId: "e1" },
      { capabilityId: "OP-01", acquisitionId: "A1", match: "ALTA", quote: "Rotación de 18%", evidenceId: "e2" },
    ]);
    expect(r[0]!.possibleContradiction).toBe(true);
    expect(resumenSuficiencia(r)).toEqual({ SUFICIENTE: 1, PARCIAL: 0, AUSENTE: 2, contradicciones: 1 });
  });
  it("misma cifra en dos documentos no es contradicción", () => {
    const r = clasificarSuficiencia(A, [
      { capabilityId: "OP-01", acquisitionId: "A1", match: "ALTA", quote: "Rotación de 12%", evidenceId: "e1" },
      { capabilityId: "OP-01", acquisitionId: "A1", match: "ALTA", quote: "rotación 12%", evidenceId: "e2" },
    ]);
    expect(r[0]!.possibleContradiction).toBe(false);
  });
});
